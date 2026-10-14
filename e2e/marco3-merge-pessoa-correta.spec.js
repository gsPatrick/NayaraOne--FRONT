'use strict';

/**
 * E2E real (Playwright) — mesclagem de pessoas mostra a pessoa correta na confirmação
 * (Marco 3, CRMX-002).
 *
 * BUG REAL CORRIGIDO (auditoria externa, rodada "definitiva", 14/10/2026 — item 2c): numa
 * pessoa que já tem uma duplicata detectada automaticamente, usar "Mesclar com outro cadastro"
 * e escolher uma pessoa DIFERENTE pela busca manual fazia a tela de confirmação mostrar a
 * duplicata automática, não a pessoa escolhida — risco real de mesclar o cadastro errado.
 * Causa: `mergePartner = duplicatePartner || manualPartner` (ordem invertida). Corrigido para
 * `manualPartner || duplicatePartner`.
 *
 * Pré-requisito: já existem 3 pessoas de teste no banco (A e B com mesmo nome/telefone,
 * disparando a duplicata automática entre si; C sem relação com nenhuma das duas) — IDs
 * passados via env (MERGE_TEST_A/B/C), seedados fora deste script.
 *
 * Uso: `MERGE_TEST_A=... MERGE_TEST_B=... MERGE_TEST_C=... node e2e/marco3-merge-pessoa-correta.spec.js`.
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
  const idA = process.env.MERGE_TEST_A;
  const idC = process.env.MERGE_TEST_C;
  const nameC = process.env.MERGE_TEST_C_NAME;
  if (!idA || !idC || !nameC) {
    console.error('Defina MERGE_TEST_A, MERGE_TEST_C e MERGE_TEST_C_NAME antes de rodar.');
    process.exit(1);
  }

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
    record('login', true);

    await page.goto(`${BASE_URL}/painel/pessoas/${idA}`, { waitUntil: 'domcontentloaded' });
    const autoMergeBtn = page.getByRole('button', { name: /duplicata detectada/i });
    record('pessoa A tem duplicata automática detectada', (await autoMergeBtn.count()) > 0);

    await page.getByRole('button', { name: /mesclar com outro cadastro/i }).click();
    await page.waitForSelector('input[placeholder*=CPF], input[placeholder*=Nome]', { timeout: 10000 });
    await page.fill('input[placeholder*=CPF], input[placeholder*=Nome]', nameC);
    await page.waitForTimeout(600);
    const candidateButton = page.locator('button', { hasText: nameC }).first();
    await candidateButton.waitFor({ timeout: 10000 });
    await candidateButton.click();

    await page.waitForSelector('text=Mesclar cadastros', { timeout: 10000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    const showsC = bodyText.includes(nameC);
    record('tela de confirmação mostra a pessoa C (a escolhida manualmente)', showsC);

    const allOk = results.every((r) => r.ok);
    console.log(allOk ? '\nTODOS OS PASSOS PASSARAM' : '\nALGUM PASSO FALHOU');
    process.exitCode = allOk ? 0 : 1;
  } catch (err) {
    console.error('ERRO:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
