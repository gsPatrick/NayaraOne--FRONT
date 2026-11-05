'use strict';

/**
 * Enter nos botões só com ícone (RowActions: "Ver detalhes", "Editar") em /painel/pessoas e /painel/papeis, N repetições por botão e por modo
 * (foco direto + Enter; Tab até o botão + Enter; foco direto + Espaço), com teclado real do Playwright. Antes de apertar a tecla confere que o nó do botão
 * não foi trocado por re-render e que o foco não se perdeu em 1,2 s (causas do "Enter às vezes não ativa"). Mede o tempo até a URL mudar.
 * Reprova (GOV_A11Y_ENTER) se qualquer repetição não navegar em 8 s. O 1º acesso a uma rota no `next dev` compila a rota (segundos): isso aparece como
 * a repetição lenta, não como falha. Uso: E2E_EMAIL=... E2E_PASSWORD=... [N=20] node e2e/a11y-teclado-enter.spec.js (pilha descartável QA-M9).
 */
const { chromium } = require('playwright');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const N = Number(process.env.N) || 20;
const ALVOS = [
  { tela: '/painel/pessoas', rotulo: 'Ver detalhes', ok: (u) => /^\/painel\/pessoas\/[^/]+$/.test(u.pathname) && u.pathname !== '/painel/pessoas/novo' },
  { tela: '/painel/pessoas', rotulo: 'Editar', ok: (u) => /^\/painel\/pessoas\/[^/]+\/editar$/.test(u.pathname) },
  { tela: '/painel/papeis', rotulo: 'Editar', ok: (u) => /^\/painel\/papeis\/[^/]+$/.test(u.pathname) && u.pathname !== '/painel/papeis/novo' },
];
const MODOS = ['foco + Enter', 'Tab + Enter', 'foco + Espaço'];

async function main() {
  const email = process.env.E2E_EMAIL; const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Sou da equipe/i }).click();
  await page.waitForSelector('input[type=email]');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'));
  let falhas = 0; const relatorio = [];
  for (const modo of MODOS) {
    for (const alvo of ALVOS) {
      const tempos = []; let instavel = 0; let falhou = 0;
      for (let i = 0; i < N; i += 1) {
        await page.goto(`${BASE_URL}${alvo.tela}`, { waitUntil: 'load' });
        const botao = page.getByRole('button', { name: alvo.rotulo, exact: true }).first();
        await botao.waitFor({ state: 'visible' });
        if (modo === 'Tab + Enter') {
          await botao.evaluate((el) => { const todos = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter((e) => !e.disabled && e.tabIndex >= 0); todos[todos.indexOf(el) - 1].focus(); });
          await page.keyboard.press('Tab');
        } else await botao.focus();
        await botao.evaluate((el) => { window.__no = el; });
        await page.waitForTimeout(1200);
        const estavel = await page.evaluate(() => document.contains(window.__no) && document.activeElement === window.__no);
        if (!estavel) instavel += 1;
        const t0 = Date.now();
        await page.keyboard.press(modo.includes('Espaço') ? 'Space' : 'Enter');
        try { await page.waitForURL((u) => alvo.ok(u), { timeout: 8000, waitUntil: 'commit' }); tempos.push(Date.now() - t0); } catch { falhou += 1; tempos.push(null); }
      }
      const ok = tempos.filter((t) => t !== null).sort((a, b) => a - b);
      const linha = { modo, tela: alvo.tela, botao: alvo.rotulo, repeticoes: N, falhas: falhou, instaveisAntesDaTecla: instavel, msMediana: ok[Math.floor(ok.length / 2)], msMax: ok[ok.length - 1], primeira: tempos[0] };
      relatorio.push(linha); falhas += falhou;
      console.log(`${falhou ? '[FALHA]' : '[OK ]'} ${modo} | ${alvo.tela} "${alvo.rotulo}": falhas ${falhou}/${N}, instável antes da tecla ${instavel}/${N}, ms até navegar: mediana ${linha.msMediana}, máx ${linha.msMax}, 1ª ${linha.primeira}`);
    }
  }
  await browser.close();
  if (process.env.E2E_GRAVAR_RELATORIO) require('fs').writeFileSync(require('path').join(__dirname, '..', 'docs', 'evidencias', `a11y-teclado-enter-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(relatorio, null, 2));
  if (falhas) console.error('GOV_A11Y_ENTER Enter/Espaço não ativou o botão.');
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
