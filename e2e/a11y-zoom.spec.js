'use strict';

/**
 * Zoom 200% e 400% e reflow em 320 px (WCAG 1.4.4 e 1.4.10). Um navegador a 1280x800 com zoom de 200% tem 640x400 px CSS de área útil; a 400%, 320x256.
 * Também 320x568 (celular estreito). Para cada tela-chave e /painel/papeis: (a) a página não rola na horizontal (scrollWidth <= largura),
 * (b) nenhum elemento visível passa da borda direita fora de um contêiner com rolagem própria (tabela larga), (c) texto não é cortado em caixa
 * com overflow oculto, (d) Tab percorre os controles e, a cada parada, o foco está dentro da janela na horizontal e NÃO está coberto por outro
 * elemento (barra fixa de ações, cabeçalho): elementFromPoint no centro do controle é ele mesmo ou um filho.
 * Grava docs/evidencias/a11y-zoom-<data>.json. Reprova com GOV_A11Y_ZOOM. Uso: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BROWSER=firefox] node e2e/a11y-zoom.spec.js
 */
const fs = require('fs');
const path = require('path');
const { BASE_URL, abrir, entrar, registro, TAB, STAB } = require('./_a11y-comum');
const { reg, estado } = registro('zoom');
const VIEWPORTS = [
  { nome: 'zoom 200% (640x400)', w: 640, h: 400, fator: 2 },
  { nome: 'zoom 400% (320x256)', w: 320, h: 256, fator: 4 },
  { nome: 'reflow 320x568', w: 320, h: 568, fator: 1 },
];
const TELAS = ['/entrar', '/painel', '/painel/pessoas', '/painel/pessoas/novo', '/painel/papeis'];

function medir() {
  const vw = document.documentElement.clientWidth;
  const rolagem = document.scrollingElement.scrollWidth;
  const comRolagemPropria = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true; if (o === 'hidden' && p.getBoundingClientRect().right <= vw + 1 && p !== document.body && p !== document.documentElement) return false; } return false; };
  const passam = []; const cortados = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[aria-hidden=true]') || ['SCRIPT', 'STYLE', 'PATH', 'SVG', 'CIRCLE', 'LINE', 'RECT'].includes(el.tagName.toUpperCase())) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 && cs.position !== 'fixed' && !comRolagemPropria(el)) passam.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} (${Math.round(r.right)}>${vw})`);
    if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim() && cs.textOverflow !== 'ellipsis' && !['INPUT', 'SELECT', 'TEXTAREA', 'BODY', 'HTML'].includes(el.tagName) && !el.classList.contains('sr-only') && !el.querySelector('canvas,svg')) cortados.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} (${el.scrollWidth}>${el.clientWidth}) "${el.textContent.trim().slice(0, 30)}"`);
  }
  return { vw, rolagem, passam: [...new Set(passam)].slice(0, 8), cortados: [...new Set(cortados)].slice(0, 8) };
}

function parada() {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const r = a.getBoundingClientRect(); const vw = document.documentElement.clientWidth; const vh = window.innerHeight;
  const nome = (a.getAttribute('aria-label') || a.textContent || a.id || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 28);
  let dentroH = r.left >= -1 && r.right <= vw + 1;
  if (!dentroH) { for (let p = a.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) { dentroH = true; break; } } }
  const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1); const y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
  const topo = document.elementFromPoint(x, y);
  const visivel = r.bottom > 0 && r.top < vh;
  const livre = !!topo && (a === topo || a.contains(topo) || topo.contains(a) || !!(topo.closest('label') && topo.closest('label').contains(a)));
  return { nome, dentroH, visivel, livre, cobre: livre ? null : `${topo ? topo.tagName.toLowerCase() + '.' + String(topo.className).split(' ')[0] : 'nada'}` };
}

// Espera a rolagem suave (scroll-behavior: smooth) terminar: posição da janela estável por 3 leituras seguidas.
async function assentar(page) {
  await page.evaluate(() => new Promise((resolve) => { let ultimo = -1; let iguais = 0; const t = setInterval(() => { const y = window.scrollY + document.activeElement.getBoundingClientRect().top; if (Math.abs(y - ultimo) < 0.5) iguais += 1; else iguais = 0; ultimo = y; if (iguais >= 3) { clearInterval(t); resolve(); } }, 50); setTimeout(() => { clearInterval(t); resolve(); }, 2500); }));
}

async function main() {
  const todos = [];
  for (const vp of VIEWPORTS) {
    const { browser, page } = await abrir({ width: vp.w, height: vp.h }, { deviceScaleFactor: vp.fator, reducedMotion: 'reduce' }); // sem rolagem suave: a medida é a posição final do foco
    try {
      await entrar(page);
      for (const rota of TELAS) {
        if (rota === '/entrar') { await page.context().clearCookies(); }
        await page.goto(`${BASE_URL}${rota}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(700);
        if (rota === '/entrar' && !/\/entrar/.test(page.url())) continue; // sessão ativa redireciona
        const m = await page.evaluate(medir);
        const horizontal = m.rolagem <= m.vw + 1;
        reg(horizontal && m.passam.length === 0, `${vp.nome} ${rota}: rolagem horizontal ${m.rolagem}/${m.vw}${m.passam.length ? '; passam da borda: ' + m.passam.join(', ') : ''}`);
        if (m.cortados.length) reg(false, `${vp.nome} ${rota}: texto cortado em caixa com overflow oculto: ${m.cortados.join(' | ')}`);
        // Tab até voltar ao começo (no máximo 80 paradas)
        await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
        const vistos = new Set(); const falhas = []; let n = 0;
        for (; n < 80; n += 1) {
          await page.keyboard.press(TAB); await assentar(page);
          const p = await page.evaluate(parada);
          if (!p) continue;
          const id = p.nome + '#' + n;
          if (vistos.has(p.nome) && vistos.size > 6 && n > 20 && !vistos.has(id)) { /* pode repetir nomes */ }
          vistos.add(id);
          if (!p.dentroH || !p.livre || !p.visivel) falhas.push(`"${p.nome}"${!p.dentroH ? ' fora na horizontal' : ''}${!p.livre ? ' coberto por ' + p.cobre : ''}${!p.visivel ? ' fora da janela' : ''}`);
          const voltou = await page.evaluate(() => document.activeElement === document.body);
          if (voltou) break;
        }
        reg(falhas.length === 0, `${vp.nome} ${rota}: ${n} paradas de Tab, ${falhas.length} com foco encoberto/fora${falhas.length ? ': ' + falhas.slice(0, 5).join('; ') : ''}`);
        todos.push({ viewport: vp.nome, rota, ...m, paradas: n, falhasFoco: falhas });
      }
    } finally { await browser.close(); }
  }
  const dir = path.join(__dirname, '..', 'docs', 'evidencias');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `a11y-zoom-${process.env.E2E_BROWSER || 'chromium'}-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(todos, null, 2));
  if (estado.falhas) console.error('GOV_A11Y_ZOOM falha de zoom/reflow.');
  process.exit(estado.falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
