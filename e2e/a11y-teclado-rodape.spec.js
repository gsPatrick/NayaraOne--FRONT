'use strict';

/**
 * Acessibilidade só com teclado: o foco não pode ficar atrás do rodapé fixo de ações (WCAG 2.4.7 e 2.4.11). Em /painel/pessoas/novo
 * tabula do campo anterior até o último chip de papel e, a cada parada, espera a rolagem suave terminar e confere por geometria que o
 * elemento focado está inteiro dentro da viewport e que o elemento visível no topo, no centro e no pé dele É ele (document.elementFromPoint):
 * se o rodapé fixo ou a barra de abas do celular estiverem por cima, reprova. Roda em 4 viewports (desktop alto, desktop baixo, tablet, celular).
 * Reprova com GOV_A11Y_FOCUS_OBSCURED. Regravar o relatório: docs/evidencias/a11y-teclado-rodape-<data>.json.
 *
 * Margem: pé do elemento + largura e deslocamento do contorno de foco precisam caber acima do topo da barra.
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BASE_URL=http://localhost:3000] node e2e/a11y-teclado-rodape.spec.js (usuário de teste QA-M9, pilha descartável).
 */
const fs = require('fs');
const path = require('path');
const { navegador, TAB, STAB } = require('./_a11y-comum'); // E2E_BROWSER=chromium|firefox|webkit

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const VIEWPORTS = [
  { nome: 'desktop 1280x800', width: 1280, height: 800 },
  { nome: 'desktop baixo 1280x500', width: 1280, height: 500 },
  { nome: 'tablet 768x600', width: 768, height: 600 },
  { nome: 'celular 390x700', width: 390, height: 700 },
  { nome: 'celular 390x844', width: 390, height: 844 },
];

/** Mede o elemento focado: dentro da viewport e sem nenhum outro elemento por cima nos 3 pontos (topo, centro, pé). */
function medirFocado() {
  const a = document.activeElement;
  const r = a.getBoundingClientRect();
  const livre = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === a || a.contains(t) || t.contains(a) && t.tagName === 'LABEL'); };
  const cx = r.left + r.width / 2;
  const barra = document.querySelector('[class*="actionBar"]');
  const topoBarra = barra ? barra.getBoundingClientRect().top : null;
  const cs = getComputedStyle(a);
  const contorno = (parseFloat(cs.outlineWidth) || 0) + (parseFloat(cs.outlineOffset) || 0); // o contorno de foco também precisa ficar visível, não só a caixa
  return {
    texto: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 24),
    topo: Math.round(r.top), pe: Math.round(r.bottom), alturaViewport: window.innerHeight, topoDaBarra: topoBarra === null ? null : Math.round(topoBarra),
    contorno,
    dentro: r.top - contorno >= 0 && r.bottom + contorno <= (topoBarra === null ? window.innerHeight : Math.min(window.innerHeight, topoBarra)),
    descoberto: livre(cx, r.top + 2) && livre(cx, r.top + r.height / 2) && livre(cx, r.bottom - 2),
  };
}

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  const browser = await navegador().launch();
  const relatorio = [];
  let falhas = 0;
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Sou da equipe/i }).click();
      await page.waitForSelector('input[type=email]');
      await page.fill('input[type=email]', email);
      await page.fill('input[type=password]', password);
      await page.click('button[type=submit]');
      await page.waitForURL((url) => !url.pathname.includes('/entrar'));
      await page.goto(`${BASE_URL}/painel/pessoas/novo`, { waitUntil: 'networkidle' });
      const total = await page.locator('button[aria-pressed]').count();
      if (total < 2) throw new Error(`Chips de papel não encontrados em ${vp.nome}`);
      // tabula do topo da página, como o usuário de teclado: Tab até o primeiro chip e depois um Tab por chip, medindo cada parada
      await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement.blur(); });
      await page.waitForTimeout(500);
      const paradas = [];
      let noChip = 0;
      for (let i = 0; i < 80 && noChip < total; i += 1) {
        await page.keyboard.press(TAB);
        await page.waitForTimeout(150); // rolagem suave (scroll-behavior: smooth) precisa terminar antes de medir
        const ehChip = await page.evaluate(() => document.activeElement.hasAttribute('aria-pressed'));
        if (!ehChip) continue;
        await page.waitForTimeout(400);
        paradas.push(await page.evaluate(medirFocado));
        noChip += 1;
      }
      if (paradas.length !== total) throw new Error(`Só ${paradas.length} de ${total} chips foram alcançados por Tab em ${vp.nome}`);
      const ultimo = paradas[paradas.length - 1];
      const ruins = paradas.filter((p) => !p.dentro || !p.descoberto);
      if (ruins.length) { falhas += 1; console.error(`GOV_A11Y_FOCUS_OBSCURED ${vp.nome}: ${ruins.map((p) => `${p.texto} (topo ${p.topo}, pé ${p.pe}, viewport ${p.alturaViewport}, barra ${p.topoDaBarra})`).join('; ')}`); }
      else console.log(`[OK ] ${vp.nome}: ${paradas.length} chips tabulados, todos visíveis e sem cobertura; último "${ultimo.texto}" pé ${ultimo.pe} ≤ topo da barra ${ultimo.topoDaBarra}`);
      relatorio.push({ viewport: vp.nome, paradas });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (process.env.E2E_GRAVAR_RELATORIO) {
    const dir = path.join(__dirname, '..', 'docs', 'evidencias');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `a11y-teclado-rodape-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(relatorio, null, 2));
  }
  process.exit(falhas ? 1 : 0);
}

main().catch((error) => { console.error(error); process.exit(1); });
