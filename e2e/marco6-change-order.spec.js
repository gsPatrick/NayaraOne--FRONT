'use strict';

/**
 * E2E real (Playwright) — criar Change Order pela interface (Marco 6, M6-R02).
 *
 * GAP CORRIGIDO (re-auditoria Nayara, round 2, 13/10/2026 — M6-R02): o backend passou a
 * exigir `idempotencyKey` obrigatória em `createChangeOrder`
 * (`CHANGE_ORDER_IDEMPOTENCY_KEY_REQUIRED`), mas nem o client (`lib/api/construction.js`)
 * nem o formulário (`change-orders/page.js`) geravam/enviavam esse campo — criar Change
 * Order pela UI retornava "idempotencyKey must be a UUID" e o fluxo inteiro ficava
 * inacessível. Este script cria uma obra nova e um Change Order de verdade clicando nos
 * botões reais, confirmando que não aparece nenhum erro de idempotência e que o registro é
 * criado com sucesso.
 *
 * BUG REAL #2 CORRIGIDO (Claude Browser, 13/10/2026, mesma rodada de re-auditoria): o
 * backend também exige `evidenceFileIds` com pelo menos 1 arquivo
 * ("evidenceFileIds" é obrigatório e precisa ter pelo menos 1 arquivo de evidência
 * sustentando o aditivo — changeOrders.service.js, citando o Guia do Marcelo do Caderno),
 * mas o campo "Evidência" do formulário estava rotulado como "Opcional" e o botão "Criar
 * Change Order" não bloqueava o envio sem arquivo — só o backend recusava, com erro cru.
 * Este script antigo nunca anexava evidência e só checava erro de idempotencyKey, por isso
 * não pegou esse segundo bug. Agora testa os dois lados: (a) sem arquivo, o botão fica
 * desabilitado; (b) com arquivo, o Change Order é criado com sucesso.
 *
 * Uso: `node e2e/marco6-change-order.spec.js` (ou `npm run test:e2e:marco6-change-order`).
 */

const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
  const projectName = `E2E Marco6 CO ${suffix}`;

  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  try {
    // --- 1. Login ---
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 70000 }).catch(() => {});
    record('1. login', true, EMAIL);

    // --- 2. Criar obra ---
    await page.goto(`${BASE_URL}/painel/obras/lista/novo`, { waitUntil: 'domcontentloaded' });
    await page.fill('#f-name', projectName);
    await page.click('button:has-text("Criar obra")');
    await page.waitForURL(/\/painel\/obras\/lista\/[0-9a-f-]{36}$/, { timeout: 70000 });
    const projectUrl = page.url();
    record('2. criar obra', true, projectUrl);

    // --- 2b. Orçamento + aprovação (Change Order exige baseline aprovada) ---
    await page.goto(`${projectUrl}/orcamento`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Nova linha de orçamento")');
    await page.fill('#m-budget-category', 'Fundação');
    await page.fill('#m-budget-planned', '50000');
    await page.click('button:has-text("Criar linha")');
    await page.waitForTimeout(1500);
    try {
      await page.click('button:has-text("Configurar margem mínima")');
      await page.fill('#m-margin-pct', '10');
      await page.click('button:has-text("Salvar")');
      await page.waitForTimeout(1200);
    } catch (_e) { /* pode já estar configurada */ }
    await page.click('button:has-text("Aprovar orçamento")');
    await page.waitForTimeout(800);
    await page.click('button:has-text("Confirmar aprovação")');
    await page.waitForTimeout(1500);
    record('2b. orçamento aprovado (pré-requisito do Change Order)', true);

    // --- 3. Abrir Change Orders e criar um novo ---
    await page.goto(`${projectUrl}/change-orders`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const newCoBtn = page.getByRole('button', { name: 'Novo Change Order' });
    await page.waitForFunction(() => {
      const btns = [...document.querySelectorAll('button')];
      const b = btns.find((x) => x.textContent.trim() === 'Novo Change Order');
      return b && !b.disabled;
    }, { timeout: 15000 }).catch(async () => {
      // budget pode ter sido buscado antes da aprovação concluir no backend — recarrega.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
    });
    await newCoBtn.click();
    await page.waitForSelector('#m-co-reason', { timeout: 70000 });

    const reasonOptions = await page.locator('#m-co-reason option').count();
    if (reasonOptions > 1) await page.selectOption('#m-co-reason', { index: 1 });

    await page.fill('#m-co-description', `Alteração de escopo — teste E2E (${suffix}).`);

    // Digitação real no DecimalInput, não .fill() (padrão do projeto — ver
    // PADRAO_AUDITORIA_E2E_MARCOS.md, evita falso-positivo de inflação de valor).
    const impactField = page.locator('#m-co-impact');
    await impactField.click();
    await impactField.press('Control+A');
    await page.keyboard.type('5000', { delay: 20 });

    await page.fill('#m-co-schedule', '3');

    const createBtn = page.getByRole('button', { name: 'Criar Change Order', exact: true });

    // --- 3a. Sem evidência: botão tem que ficar desabilitado (evidenceFileIds é obrigatório) ---
    const disabledWithoutFile = await createBtn.isDisabled();
    record('3a. botão "Criar Change Order" desabilitado sem evidência anexada', disabledWithoutFile,
      disabledWithoutFile ? 'bloqueado corretamente antes de chamar a API' : 'REGRESSÃO: deixa enviar sem evidência obrigatória');

    // --- 3b. Anexa evidência fictícia e cria de verdade ---
    const fixturePath = path.join(os.tmpdir(), `co-evidencia-${suffix}.txt`);
    fs.writeFileSync(fixturePath, 'Evidência fictícia de teste E2E — Change Order.');
    await page.setInputFiles('#m-co-file', fixturePath);
    await page.waitForTimeout(800);

    await createBtn.click();
    await page.waitForTimeout(2000);

    const idemError = page.getByText('idempotencyKey', { exact: false });
    const hasIdemError = (await idemError.count()) > 0;
    record('3. criar Change Order sem erro de idempotencyKey', !hasIdemError,
      hasIdemError ? 'REGRESSÃO: erro de idempotencyKey voltou a aparecer (M6-R02)' : 'sem erro de idempotência');

    const consoleIdemError = consoleErrors.some((e) => e.toLowerCase().includes('idempotencykey'));
    record('4. nenhum erro de idempotencyKey no console do navegador', !consoleIdemError,
      consoleIdemError ? consoleErrors.find((e) => e.toLowerCase().includes('idempotencykey')) : 'limpo');

    const evidenceError = page.getByText('evidenceFileIds', { exact: false });
    const hasEvidenceError = (await evidenceError.count()) > 0;
    record('4b. nenhum erro de evidenceFileIds após anexar evidência', !hasEvidenceError,
      hasEvidenceError ? 'REGRESSÃO: erro de evidência obrigatória apareceu mesmo com arquivo anexado' : 'sem erro de evidência');

    // Confirma que o CO aparece listado (criação realmente persistiu, não só fechou o modal).
    await page.waitForTimeout(1000);
    const createdCo = page.getByText('Alteração de escopo — teste E2E', { exact: false });
    record('5. Change Order aparece na listagem após criação', (await createdCo.count()) > 0);
  } catch (err) {
    record('ERRO FATAL', false, err.stack || err.message);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== Resumo: ${passed}/${results.length} passos OK ===`);
  for (const r of results) console.log(`  ${r.ok ? '✔' : '✖'} ${r.step}${r.detail ? ' — ' + r.detail : ''}`);

  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main();
