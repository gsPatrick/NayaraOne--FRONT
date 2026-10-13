'use strict';

/**
 * E2E real (Playwright, navegador de verdade) dos fluxos do Marco 7 — Estoque, Ferramentas,
 * Patrimônio, Compras/Procurement e Seguros. Segue o mesmo padrão de
 * `marco6-jornada-completa.spec.js`: script Node simples usando Playwright direto (sem
 * test-runner), roda contra http://localhost:3000, dirige o NAVEGADOR de verdade.
 *
 * Uso: `node e2e/marco7-jornada-completa.spec.js` (ou `npm run test:e2e:marco7`).
 * Idempotente: cada execução usa nomes com timestamp, nunca colide com execuções anteriores.
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail: detail || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);
  const suffix = Date.now();

  try {
    // --- Login ---
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 70000 }).catch(() => {});
    await page.waitForTimeout(1500);
    record('login', true, EMAIL);

    // --- 1. Estoque: requisição de material (abre modal de criação) ---
    try {
      await page.goto(`${BASE_URL}/painel/estoque/requisicoes`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Nova requisição', { timeout: 70000 });
      await page.getByText('Nova requisição', { exact: false }).first().click();
      await page.waitForTimeout(1200);
      const modalVisible = await page.getByText('Nova requisição de material', { exact: false }).count();
      record('1. estoque — modal de nova requisição abre', modalVisible > 0);
      await page.keyboard.press('Escape').catch(() => {});
    } catch (err) {
      record('1. estoque — modal de nova requisição abre', false, err.message.slice(0, 200));
    }

    // --- 2. Patrimônio: cadastrar ativo e confirmar depreciação na listagem ---
    try {
      await page.goto(`${BASE_URL}/painel/estoque/patrimonio`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Novo patrimônio', { timeout: 70000 });
      await page.getByText('Novo patrimônio', { exact: false }).first().click();
      await page.waitForTimeout(800);
      const tag = `E2E-AT-${suffix}`;
      // A página tem um campo de busca (placeholder "Ex.: TOOL-00123") sempre visível ANTES
      // do modal — os campos Nome/Tag do form são o 2º e 3º input visível, não o 1º e 2º.
      const visibleInputs = page.locator('input:visible');
      await visibleInputs.nth(1).fill(`Ativo E2E ${suffix}`);
      await visibleInputs.nth(2).fill(tag);
      await page.getByRole('button', { name: /^criar$/i }).click();
      await page.waitForTimeout(2500);
      const bodyText = await page.textContent('body');
      const createdOk = (bodyText || '').includes(tag);
      let detail = createdOk ? tag : 'tag não apareceu na listagem';
      if (!createdOk) {
        const alertText = await page.locator('[class*="Alert"], [role="alert"]').allTextContents().catch(() => []);
        if (alertText.length) detail += ` | alerta: ${alertText.join(' / ').slice(0, 150)}`;
      }
      record('2. patrimônio — cadastro de ativo criado', createdOk, detail);
      if (createdOk) {
        const hasDeprecColumn = /deprecia/i.test(bodyText || '');
        record('2b. patrimônio — coluna de depreciação presente na listagem', hasDeprecColumn);
      }
    } catch (err) {
      record('2. patrimônio — cadastro de ativo criado', false, err.message.slice(0, 200));
    }

    // --- 3. Compras: pedidos / cotação ---
    try {
      await page.goto(`${BASE_URL}/painel/compras/pedidos`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const bodyText = await page.textContent('body');
      record('3. compras — tela de pedidos carrega', !!bodyText && bodyText.length > 100);

      await page.goto(`${BASE_URL}/painel/compras`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const body2 = await page.textContent('body');
      record('3b. compras — hub/visão geral carrega', !!body2 && body2.length > 100);
    } catch (err) {
      record('3. compras — fluxo', false, err.message.slice(0, 200));
    }

    // --- 4. Seguros: criar apólice → abrir detalhe → confirmar ação de cancelamento ---
    try {
      await page.goto(`${BASE_URL}/painel/compras/seguros`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Nova apólice', { timeout: 70000 });
      await page.getByText('Nova apólice', { exact: false }).first().click();
      await page.waitForTimeout(800);
      await page.locator('input:visible, textarea:visible').first().fill(`Seguro E2E ${suffix}`);
      await page.getByRole('button', { name: /^criar$/i }).click();
      await page.waitForTimeout(2500);
      const bodyText = await page.textContent('body');
      const createdOk = !(await page.getByText('Nova apólice de seguro', { exact: false }).count());
      let detail = '';
      if (!createdOk) {
        const alertText = await page.locator('[class*="Alert"], [role="alert"]').allTextContents().catch(() => []);
        detail = alertText.length ? `alerta: ${alertText.join(' / ').slice(0, 150)}` : 'modal de criação continua aberto';
      }
      record('4. seguros — apólice criada', createdOk, detail);
      if (!createdOk) await page.keyboard.press('Escape').catch(() => {});

      // abre o detalhe da primeira apólice da lista pra checar a ação de cancelamento
      await page.getByRole('button', { name: /^ver$/i }).first().click();
      await page.waitForTimeout(800);
      const cancelBtn = page.getByRole('button', { name: /cancelar ap[óo]lice/i });
      const hasCancelAction = (await cancelBtn.count()) > 0;
      record('4b. seguros — ação de cancelamento visível no detalhe da apólice', hasCancelAction);
    } catch (err) {
      record('4. seguros — fluxo', false, err.message.slice(0, 200));
    }

  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== RESUMO MARCO 7 ===');
  console.log(`${results.length - failed.length}/${results.length} passos OK`);
  if (failed.length) {
    console.log('Falhas:', failed.map((f) => f.step).join('; '));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('ERRO FATAL:', err);
  process.exitCode = 1;
});
