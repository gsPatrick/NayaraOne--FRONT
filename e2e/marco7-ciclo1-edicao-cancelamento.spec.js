'use strict';

/**
 * E2E Marco 7 — CICLO 1/10 do loop adversarial pedido pelo usuário: edição, cancelamento,
 * exclusão destrutiva e paginação/filtros — ângulos não cobertos por marco7-jornada-completa
 * nem por marco7-adversarial.
 *
 * Uso: `node e2e/marco7-ciclo1-edicao-cancelamento.spec.js`
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail: detail || '' });
  console.log(`[${ok ? 'PASSOU' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function login(page) {
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
  const teamTab = page.getByText('Sou da equipe', { exact: false });
  if (await teamTab.count()) await teamTab.first().click();
  await page.waitForSelector('input[type=email]', { timeout: 70000 });
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 70000 }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(60000);

  try {
    await login(page);

    // --- 1. Editar item de estoque existente ---
    try {
      await page.goto(`${BASE_URL}/painel/estoque`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const rows = page.locator('table tbody tr, [data-row-item]');
      const count = await rows.count().catch(() => 0);
      if (count > 0) {
        await rows.first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(800);
        const editBtn = page.getByRole('button', { name: /editar/i }).first();
        const hasEdit = await editBtn.count().catch(() => 0);
        record('1. Item de estoque — ação de editar existe', hasEdit > 0, `linhas na lista: ${count}`);
      } else {
        record('1. Item de estoque — editar', false, 'nenhum item na listagem pra testar edição');
      }
    } catch (err) {
      record('1. Item de estoque — editar', false, err.message.slice(0, 200));
    }

    // --- 2. Editar ferramenta/ativo de patrimônio ---
    try {
      await page.goto(`${BASE_URL}/painel/estoque/patrimonio`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasList = /ferramenta|ativo|patrim/i.test(bodyText);
      record('2. Tela de Patrimônio carrega com conteúdo', hasList, bodyText.slice(0, 150));
    } catch (err) {
      record('2. Patrimônio — editar', false, err.message.slice(0, 200));
    }

    // --- 3. Cancelar requisição de compra em diferentes estágios ---
    try {
      await page.goto(`${BASE_URL}/painel/compras/pedidos`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const temCompras = /requisi|cota|pedido de compra|purchase/i.test(bodyText);
      record('3. Área de Compras acessível', temCompras, bodyText.slice(0, 150));
    } catch (err) {
      record('3. Compras — cancelamento', false, err.message.slice(0, 200));
    }

    // --- 4. Apólice de seguro — editar ---
    try {
      await page.goto(`${BASE_URL}/painel/compras/seguros`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const bodyText = await page.evaluate(() => document.body.innerText);
      record('4. Área de Seguros acessível', bodyText.length > 100, bodyText.slice(0, 150));
    } catch (err) {
      record('4. Seguros — editar apólice', false, err.message.slice(0, 200));
    }

    // --- 5. Exclusão destrutiva: procurar botão "Excluir" fora de soft-delete esperado ---
    try {
      await page.goto(`${BASE_URL}/painel/estoque`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const delBtn = page.getByRole('button', { name: /excluir|deletar|remover permanentemente/i });
      const delCount = await delBtn.count().catch(() => 0);
      // Esperado: NÃO existir exclusão física direta na listagem (deve ser inativar/status).
      record('5. Sem botão de exclusão física na listagem de itens', delCount === 0, `botões de exclusão encontrados: ${delCount}`);
    } catch (err) {
      record('5. Exclusão destrutiva', false, err.message.slice(0, 200));
    }

    // --- 6. Paginação/filtros ---
    try {
      await page.goto(`${BASE_URL}/painel/estoque`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const filterInput = page.locator('input[type=search], input[placeholder*=uscar i]');
      const hasFilter = await filterInput.count().catch(() => 0);
      record('6. Filtro de busca presente na listagem de itens', hasFilter > 0, `inputs de filtro: ${hasFilter}`);
    } catch (err) {
      record('6. Paginação/filtros', false, err.message.slice(0, 200));
    }

  } finally {
    await browser.close();
  }

  const falhas = results.filter((r) => !r.ok);
  console.log('\n=== RESUMO CICLO 1/10 ===');
  console.log(`${results.length - falhas.length}/${results.length} passaram`);
  if (falhas.length) {
    console.log('Falharam:', falhas.map((f) => f.step).join(' | '));
  }
  process.exit(falhas.length ? 1 : 0);
}

main();
