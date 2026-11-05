'use strict';

/**
 * M9-D851 — zoom medido com a JANELA real do navegador (viewport do Playwright), não com CSS zoom: 640x400 (= 1280x800 a 200%), 320x256 (= 400%)
 * e 320x568, em Chromium, Firefox e WebKit, nas telas /painel/pessoas, /painel/pessoas/novo e /painel/papeis. Mede: rolagem horizontal
 * (scrollWidth x clientWidth), "Menu do usuário" e "Continuar" inteiros (caixa dentro da janela e sem ancestral que corte), botão flutuante "+"
 * sem sobrepor outro controle (interseção de caixas, rolando a página até o fim) e foco nunca coberto (Tab por toda a tela, elementFromPoint).
 * Grava docs/evidencias/a11y-zoom-janela-<navegador>-<data>.json. Reprova com GOV_A11Y_ZOOM.
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BROWSER=firefox|webkit] node e2e/a11y-zoom-janela.spec.js
 */
const fs = require('fs');
const path = require('path');
const { BASE_URL, abrir, entrar, registro, TAB } = require('./_a11y-comum');
const { reg, estado } = registro('zoom-janela');
const VIEWPORTS = [
  { nome: '200% (640x400)', w: 640, h: 400 },
  { nome: '400% (320x256)', w: 320, h: 256 },
  { nome: '320x568', w: 320, h: 568 },
];
const TELAS = ['/painel/pessoas', '/painel/pessoas/novo', '/painel/papeis'];

function inteiro(sel) {
  const vw = document.documentElement.clientWidth;
  const el = typeof sel === 'string' ? document.querySelector(sel) : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  let cortado = el.scrollWidth > el.clientWidth + 1;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const q = p.getBoundingClientRect(); if (r.left < q.left - 1 || r.right > q.right + 1 || r.top < q.top - 1 || r.bottom > q.bottom + 1) cortado = true; }
  }
  return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), dentro: r.left >= -1 && r.right <= vw + 1, cortado };
}

function fabSobrepoe() {
  const fab = document.querySelector('a[class*="fab"]');
  if (!fab || getComputedStyle(fab).display === 'none') return { existe: false, sobre: [] };
  const f = fab.getBoundingClientRect();
  const sobre = [];
  for (const el of document.querySelectorAll('a[href],button,input,select,textarea,[role=tab],[tabindex="0"]')) {
    if (el === fab || fab.contains(el) || el.closest('[aria-hidden=true]')) continue;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden') continue;
    if (r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top) sobre.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30));
  }
  return { existe: true, sobre };
}

function parada() {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const r = a.getBoundingClientRect(); const vw = document.documentElement.clientWidth; const vh = window.innerHeight;
  const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1); const y = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
  const topo = document.elementFromPoint(x, y);
  const livre = !!topo && (a === topo || a.contains(topo) || topo.contains(a) || !!(topo.closest('label') && topo.closest('label').contains(a)));
  return { nome: (a.getAttribute('aria-label') || a.textContent || a.id || a.tagName).trim().replace(/\s+/g, ' ').slice(0, 28), livre, cobre: livre ? null : `${topo ? topo.tagName.toLowerCase() + '.' + String(topo.className).split(' ')[0] : 'nada'}` };
}

async function main() {
  const nav = process.env.E2E_BROWSER || 'chromium';
  const todos = [];
  for (const vp of VIEWPORTS) {
    const { browser, page } = await abrir({ width: vp.w, height: vp.h }, { reducedMotion: 'reduce' });
    try {
      await entrar(page);
      for (const rota of TELAS) {
        await page.goto(`${BASE_URL}${rota}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(700);
        const janela = await page.evaluate(() => ({ inner: window.innerWidth, client: document.documentElement.clientWidth, scroll: document.scrollingElement.scrollWidth }));
        reg(janela.scroll <= janela.client + 1, `${nav} ${vp.nome} ${rota}: rolagem horizontal ${janela.scroll}/${janela.client} (janela ${janela.inner})`);
        const menu = await page.evaluate(inteiro, '[aria-label="Menu do usuário"]');
        reg(menu && menu.dentro && !menu.cortado, `${nav} ${vp.nome} ${rota}: "Menu do usuário" inteiro ${JSON.stringify(menu)}`);
        let continuar = null;
        if (rota === '/painel/pessoas/novo') {
          await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Continuar'); if (b) { b.setAttribute('data-qa-continuar', ''); b.scrollIntoView({ block: 'center' }); } });
          continuar = await page.evaluate(inteiro, '[data-qa-continuar]');
          reg(continuar && continuar.dentro && !continuar.cortado, `${nav} ${vp.nome} ${rota}: "Continuar" inteiro ${JSON.stringify(continuar)}`);
        }
        // FAB: topo, meio e fim da página
        const fab = [];
        for (const pos of [0, 0.5, 1]) { await page.evaluate((p) => window.scrollTo(0, (document.scrollingElement.scrollHeight - innerHeight) * p), pos); await page.waitForTimeout(150); fab.push(await page.evaluate(fabSobrepoe)); }
        const cobertos = [...new Set(fab.flatMap((f) => f.sobre))];
        reg(cobertos.length === 0, `${nav} ${vp.nome} ${rota}: botão "+" ${fab[0].existe ? 'presente' : 'ausente'}, sobrepõe ${cobertos.length} controle(s)${cobertos.length ? ': ' + cobertos.join(', ') : ''}`);
        await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0, 0); });
        const falhas = []; let n = 0; let vazios = 0; const nomes = [];
        for (; n < 90; n += 1) {
          await page.keyboard.press(TAB); await page.waitForTimeout(60);
          const p = await page.evaluate(parada);
          if (!p) { vazios += 1; if (vazios >= 3 && n > 3) break; continue; }
          vazios = 0; nomes.push(p.nome);
          if (!p.livre) falhas.push(`"${p.nome}" coberto por ${p.cobre}`);
        }
        reg(falhas.length === 0, `${nav} ${vp.nome} ${rota}: ${n} paradas de Tab, ${falhas.length} com foco coberto${falhas.length ? ': ' + falhas.slice(0, 4).join('; ') : ''}`);
        todos.push({ navegador: nav, viewport: vp.nome, rota, janela, menuUsuario: menu, continuar, fab: { presente: fab[0].existe, sobrepoe: cobertos }, paradasTab: n, controlesDistintos: new Set(nomes).size, focoCoberto: falhas });
      }
    } finally { await browser.close(); }
  }
  const dir = path.join(__dirname, '..', 'docs', 'evidencias');
  fs.writeFileSync(path.join(dir, `a11y-zoom-janela-${nav}-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(todos, null, 2));
  if (estado.falhas) console.error('GOV_A11Y_ZOOM falha de zoom com janela real.');
  process.exit(estado.falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
