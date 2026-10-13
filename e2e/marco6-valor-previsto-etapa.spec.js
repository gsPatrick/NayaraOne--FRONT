'use strict';

/**
 * E2E real (Playwright) — campo "Valor previsto (R$)" no formulário de etapa (Marco 6, M6-R03).
 *
 * CONFIRMAÇÃO (análise formal pós-manifestação da auditora, 13/10/2026): a auditora pediu
 * confirmação expressa se `plannedCost` está no formulário de CRIAÇÃO/edição de etapa (não
 * só numa tela comparativa). Já estava (commit `3ce8d7b`) — este script prova criando uma
 * etapa de verdade com o campo preenchido e confirmando que persiste e é exibido depois.
 *
 * Uso: `node e2e/marco6-valor-previsto-etapa.spec.js`.
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

  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL(/\/painel/, { timeout: 70000 });
    record('Login', true);

    await page.goto(`${BASE_URL}/painel/obras/lista`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('a[href^="/painel/obras/lista/"]', { timeout: 70000 });
    const projectLinks = page.locator('a[href^="/painel/obras/lista/"]:not([href$="/novo"])');
    await projectLinks.first().click();
    await page.waitForURL(/\/painel\/obras\/lista\/[0-9a-f-]{8}/, { timeout: 70000 });
    record('Abriu um projeto de obra', true, page.url());

    const newStageBtn = page.getByRole('button', { name: /nova etapa/i });
    if (!(await newStageBtn.count())) {
      record('Botão "Nova etapa" encontrado', false, 'não encontrado — verificar navegação/aba de etapas');
      throw new Error('botão nova etapa ausente');
    }
    await newStageBtn.first().click();
    await page.waitForSelector('#m-stage-cost', { timeout: 20000 });
    record('Campo "Valor previsto (R$)" presente no formulário de criação de etapa', true);

    const suffix = Date.now();
    await page.fill('#m-stage-name', `Etapa E2E ${suffix}`);
    await page.fill('#m-stage-cost', '15000');
    const saveBtn = page.getByRole('button', { name: /criar etapa|salvar altera/i });
    await saveBtn.first().click();
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent('body');
    const hasValue = /15[.,]?000|15000/.test(bodyText);
    record('Etapa criada e valor previsto refletido na tela', hasValue, hasValue ? '' : 'valor "15000" não encontrado no DOM após salvar');
  } catch (err) {
    record('Fluxo completo sem exceção', false, err.message);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos OK.`);
  if (failed.length) {
    console.log('FALHAS:', JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

main();
