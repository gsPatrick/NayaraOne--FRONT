'use strict';

/**
 * E2E real (Playwright) — F01, cláusula condicional no fluxo "Novo contrato" (conferência
 * Nayara 18/10/2026, revisão independente 19/10).
 *
 * Pré-requisito: um modelo LEASE_RESIDENTIAL com uma cláusula sem condição e uma cláusula de
 * fiança com regra "guaranteeType = GUARANTOR" já APROVADA por outro usuário. O nome do modelo
 * vem em F01_TEMPLATE_NAME (o seed das fixtures fica fora do Front — ver relatório da rodada).
 *
 * Prova: o contrato novo não tem garantia cadastrada, então o servidor decide que a fiança fica
 * de fora; a tela mostra isso ANTES de criar, e a versão gravada não tem o texto da fiança e
 * registra o contexto e a cláusula excluída.
 *
 * Uso: F01_TEMPLATE_NAME="Modelo E2E F01 ..." node e2e/marco5-f01-novo-contrato-clausula-condicional.spec.js
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const TEMPLATE_NAME = process.env.F01_TEMPLATE_NAME;

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail: detail || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  if (!TEMPLATE_NAME) throw new Error('Defina F01_TEMPLATE_NAME com o nome do modelo de teste.');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);

  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]');
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'));
    record('login', true, EMAIL);

    await page.goto(`${BASE_URL}/painel/contratos/lista/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#f-template');
    await page.selectOption('#f-type', 'LEASE_RESIDENTIAL');
    const templateValue = await page.$eval('#f-template', (el, name) => {
      const option = [...el.options].find((o) => o.textContent.trim() === name);
      return option ? option.value : null;
    }, TEMPLATE_NAME);
    if (!templateValue) throw new Error(`Modelo "${TEMPLATE_NAME}" não aparece no seletor.`);
    await page.selectOption('#f-template', templateValue);
    await page.fill('#f-value', '2500');
    await page.selectOption('#f-party-role', 'TENANT');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    record('formulário preenchido', true, `modelo ${TEMPLATE_NAME}, sem garantia cadastrada`);

    await page.getByRole('button', { name: 'Criar contrato' }).click();
    await page.waitForSelector('[data-testid=clause-preview]');
    const included = await page.$$eval('[data-testid=clause-included]', (els) => els.map((e) => e.textContent));
    const excluded = await page.$$eval('[data-testid=clause-excluded]', (els) => els.map((e) => e.textContent));
    const previewOk =
      included.some((t) => t.includes('DO OBJETO (E2E F01)')) &&
      !included.some((t) => t.includes('DA FIANÇA')) &&
      excluded.some((t) => t.includes('DA FIANÇA (E2E F01)') && t.includes('regra não atendida'));
    record('pré-visualização mostra o que entra e o que sai', previewOk, `entram: ${included.length}, saem: ${JSON.stringify(excluded)}`);
    await page.screenshot({ path: '/tmp/e2e-f01-preview.png', fullPage: true });

    await page.getByRole('button', { name: 'Confirmar e criar contrato' }).click();
    await page.waitForURL(/\/painel\/contratos\/lista\/[0-9a-f-]{36}$/);
    const contractId = page.url().split('/').pop();
    record('contrato criado', true, contractId);

    const token = await page.evaluate(() => localStorage.getItem('nayaraone.auth.accessToken'));
    const res = await fetch(`${API_URL}/legal/contracts/${contractId}/versions`, { headers: { Authorization: `Bearer ${token}` } });
    const versions = (await res.json()).data || [];
    const v = versions[0];
    const versionOk =
      versions.length === 1 &&
      v.content.includes('Locação do imóvel descrito.') &&
      !v.content.includes('Obrigações do fiador E2E.') &&
      v.conditionContext?.source === 'CONTRACT' &&
      v.conditionContext?.values?.guaranteeType === 'NONE' &&
      (v.excludedClauses || []).some((c) => c.title === 'DA FIANÇA (E2E F01)' && c.reason === 'CONDITION_FALSE');
    record(
      'versão gravada pelo servidor sem a fiança, com contexto e excluída',
      versionOk,
      JSON.stringify({ versions: versions.length, context: v?.conditionContext, excluded: v?.excludedClauses?.map((c) => [c.title, c.reason]) })
    );
  } catch (err) {
    record('execução', false, err.message);
    await page.screenshot({ path: '/tmp/e2e-f01-erro.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResumo: ${results.length - failed.length}/${results.length} OK`);
  process.exit(failed.length ? 1 : 0);
}

main();
