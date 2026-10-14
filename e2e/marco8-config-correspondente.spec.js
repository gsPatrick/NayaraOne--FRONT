'use strict';

/**
 * E2E real (Playwright) — tela de configuração do Correspondente Bancário/Financiamentos
 * (Marco 8, Fase 0 do checklist). Confirma: a entrada chega pelo MENU lateral de verdade (não
 * por URL direta), a tela carrega os dados reais vindos da API, e salvar uma configuração nova
 * persiste de fato (reflete depois de recarregar a página).
 *
 * Uso: `node e2e/marco8-config-correspondente.spec.js`
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

    // --- 2. Navegar pelo MENU lateral até Configurações (não por URL direta) ---
    await page.goto(`${BASE_URL}/painel`, { waitUntil: 'domcontentloaded' });
    const menuLink = page.locator('a[href="/painel/configuracoes"]').first();
    await menuLink.waitFor({ state: 'visible', timeout: 15000 });
    await menuLink.click();
    await page.waitForURL(/\/painel\/configuracoes/, { timeout: 15000 });
    record('2. menu lateral -> Configurações', true, page.url());

    // --- 3. Abrir a aba "Integrações" (onde o card do Correspondente fica) ---
    const integracoesTab = page.getByText('Integrações', { exact: true }).first();
    await integracoesTab.click();
    await page.waitForTimeout(800);

    // --- 4. Confirmar que o card do Correspondente Bancário está visível, com texto em português ---
    // Ambiente de dev tem latência alta de banco (10-13s por chamada, documentado em rodadas
    // anteriores de auditoria) — o Promise.all de 5 prefixos pode passar de 15s facilmente.
    const cardTitle = page.getByText('Financiamento imobiliário', { exact: false }).first();
    await cardTitle.waitFor({ state: 'visible', timeout: 70000 });
    record('4. card "Financiamento imobiliário" visível', true);

    const select = page.locator('#integracoes-financing-provider');
    await select.waitFor({ state: 'visible', timeout: 10000 });
    const initialValue = await select.inputValue();
    record('5. select de modo carregado', true, `valor inicial: ${initialValue}`);

    // Nenhum texto técnico cru (chave de settings) deve aparecer na tela.
    const bodyText = await page.locator('body').innerText();
    const leaksTechnical = bodyText.includes('correspondent.financing_provider') || bodyText.includes('correspondent.sandbox_webhook_secret');
    record('6. sem nome de campo técnico vazando na tela', !leaksTechnical, leaksTechnical ? 'ENCONTROU chave crua na tela!' : '');

    // --- 7. Trocar pra "manual", salvar, recarregar e confirmar que persistiu ---
    // Ambiente de dev é lento (banco remoto, 10s+ por chamada) — esperar a mensagem de sucesso
    // de verdade em vez de um sleep fixo curto.
    await select.selectOption('manual');
    await page.click('button:has-text("Salvar")');
    const successToast = page.getByText('Configurações de integrações salvas', { exact: false });
    const savedOk = await successToast.waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
    record('7. salvar -> mensagem de sucesso', savedOk);

    await page.reload({ waitUntil: 'domcontentloaded' });
    const integracoesTab2 = page.getByText('Integrações', { exact: true }).first();
    await integracoesTab2.waitFor({ state: 'visible', timeout: 20000 });
    await integracoesTab2.click();
    const selectAfterReload = page.locator('#integracoes-financing-provider');
    await selectAfterReload.waitFor({ state: 'visible', timeout: 70000 });
    const persistedValue = await selectAfterReload.inputValue();
    record('8. valor persistiu após recarregar', persistedValue === 'manual', `valor pós-reload: ${persistedValue}`);

    // Volta pro sandbox pra não deixar o ambiente de dev num estado que quebre outros testes.
    await selectAfterReload.selectOption('sandbox');
    await page.click('button:has-text("Salvar")');
    await page.getByText('Configurações de integrações salvas', { exact: false }).waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    record('9. revertido para sandbox (limpeza)', true);
  } catch (err) {
    record('ERRO FATAL', false, err.message);
  } finally {
    record('console errors capturados', consoleErrors.length === 0, consoleErrors.join(' | '));
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n=== RESUMO ===');
  results.forEach((r) => console.log(`${r.ok ? '✔' : '✘'} ${r.step}${r.detail ? ' — ' + r.detail : ''}`));
  if (failed.length) {
    console.log(`\n${failed.length} passo(s) falharam.`);
    process.exitCode = 1;
  } else {
    console.log('\nTodos os passos passaram.');
  }
}

main().then(() => process.exit(process.exitCode || 0));
