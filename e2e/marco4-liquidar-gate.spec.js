'use strict';

/**
 * E2E real (Playwright) — gate de aprovação prévia antes de liquidar (Marco 4, FIN-004).
 *
 * GAP CORRIGIDO (re-auditoria Nayara, round 2, 13/10/2026 — M4-R01): o backend sempre
 * recusou liquidar sem aprovação prévia (`financialEntries.service.js`), mas o componente
 * de detalhe do lançamento (`lancamentos/[id]/page.js`) renderizava o botão "Liquidar"
 * sempre que `status === "PENDING"`, sem checar `approvalRequest?.status === "APPROVED"` —
 * clicar falhava com erro do backend, mas visualmente o botão aparecia habilitado. Este
 * script cria um lançamento de verdade pela UI e confirma que o botão "Liquidar" NUNCA
 * aparece habilitado antes da aprovação — só "Solicitar aprovação" / "Aguardando aprovação".
 *
 * Não testa o ciclo completo até liquidar de fato: autoaprovação (o mesmo usuário aprovando
 * o próprio pedido) é bloqueada de propósito (CRM-TS/FIN-TS antifraude), então aprovar e
 * liquidar com uma única conta de teste não é um cenário válido — o foco aqui é o ESTADO
 * VISUAL do gate antes da aprovação, que foi exatamente o que a auditora reportou quebrado.
 *
 * Uso: `node e2e/marco4-liquidar-gate.spec.js` (ou `npm run test:e2e:marco4`).
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

    // --- 2. Criar lançamento (PAYABLE, exige centro de custo) ---
    await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#f-desc', { timeout: 70000 });
    await page.fill('#f-desc', `E2E Marco4 Gate ${suffix}`);
    await page.fill('#f-amount', '1500');
    // Usa natureza "Transferência" (não exige centro de custo/resultado) — este ambiente de
    // dev local não tem nenhum centro de custo/resultado cadastrado, e nature=PAYABLE (default)
    // bloquearia o submit por isso, o que não é o gap sendo testado aqui.
    await page.selectOption('#f-nature', { label: 'Transferência' });
    const submitBtn = page.getByRole('button', { name: 'Criar lançamento', exact: true });
    await submitBtn.waitFor({ state: 'visible' });
    await page.waitForFunction(
      (sel) => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === sel); return b && !b.disabled; },
      'Criar lançamento',
      { timeout: 10000 }
    ).catch(() => {});
    // Intercepta a resposta do POST de criação pra pegar o id direto (mais robusto que caçar
    // link na listagem, cujo layout/comportamento de clique não é parte deste teste).
    const [createResponse] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && /\/finance\/entries(\?|$)/.test(r.url())).catch(() => null),
      submitBtn.click(),
    ]);
    let entryId = null;
    if (createResponse) {
      try {
        const body = await createResponse.json();
        entryId = body?.data?.id || body?.id || body?.entry?.id || body?.financialEntry?.id;
      } catch (_e) { /* ignore */ }
    }
    await page.waitForURL((u) => !u.pathname.endsWith('/novo'), { timeout: 70000 });
    await page.waitForTimeout(1000);
    if (!entryId) {
      const m = page.url().match(/\/lancamentos\/([0-9a-f-]{36})$/);
      if (m) entryId = m[1];
    }
    if (entryId) {
      await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/${entryId}`, { waitUntil: 'networkidle' });
    }
    const entryUrl = page.url();
    record('2. criar lançamento pendente', !!entryId, entryUrl);

    // --- 3. Confirmar estado do gate ANTES de qualquer aprovação ---
    await page.waitForTimeout(2000);
    const liquidarBtn = page.getByRole('button', { name: 'Liquidar', exact: true });
    const liquidarVisible = (await liquidarBtn.count()) > 0;
    const liquidarEnabled = liquidarVisible && (await liquidarBtn.isEnabled().catch(() => false));
    record('3. botão "Liquidar" NÃO aparece habilitado sem aprovação prévia', !liquidarEnabled,
      liquidarEnabled ? 'REGRESSÃO: botão habilitado sem aprovação — bug M4-R01 voltou' : 'bloqueado corretamente');

    const solicitarBtn = page.getByRole('button', { name: /Solicitar aprovação|Aprovação pendente|Aguardando aprovação/ });
    const hasGateButton = (await solicitarBtn.count()) > 0;
    record('4. botão de fluxo de aprovação (Solicitar/Aguardando) presente', hasGateButton);
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
