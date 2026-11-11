/**
 * E2E real (Playwright) — Marco 6, matriz de fechamento (10/11/2026): parâmetro "Custo realizado das obras"
 * (construction.custo_realizado.base) na tela Obras → Configurações. Troca para Competência pela tela, confere pela
 * API que a base mudou e que a Saúde de uma obra com medição aprovada a pagar passa a contá-la; volta para Caixa.
 *
 * Uso: E2E_BASE_URL=http://localhost:3106 E2E_API_URL=http://localhost:4107/api/v1 E2E_EMAIL=... E2E_PASSWORD=... \
 *      node e2e/marco6-custo-realizado.spec.js   (só contra API em banco descartável: cria obra e medição)
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const results = [];
const record = (step, ok, detail) => { results.push({ step, ok, detail: detail || '' }); console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ` — ${detail}` : ''}`); };

async function api(token, method, path, body) {
  const r = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${j && j.error ? j.error.code : ''}`);
  return j.data;
}

async function obraComMedicaoAPagar(t) {
  const s = Date.now();
  await api(t, 'POST', '/construction/margin-rules', { minMarginPct: 10, enforcementMode: 'ALERT', description: 'E2E custo realizado' });
  const p = await api(t, 'POST', '/construction/projects', { name: `E2E M6 Custo realizado ${s}`, budgetAmount: 50000 });
  const b = await api(t, 'POST', `/construction/projects/${p.id}/budgets`, {});
  await api(t, 'POST', `/construction/projects/${p.id}/budget-lines`, { budgetId: b.id, category: 'Estrutura', plannedAmount: 40000 });
  await api(t, 'POST', `/construction/budgets/${b.id}/approve`);
  const st = await api(t, 'POST', `/construction/projects/${p.id}/stages`, { name: 'Estrutura', stageCode: `E2E-${s}`, sequence: 1, plannedPct: 100, plannedCost: 40000, startsAt: '2026-10-01', endsAt: '2027-01-31' });
  const m = await api(t, 'POST', `/construction/projects/${p.id}/measurements`, { projectStageId: st.id, measuredPct: 50, measuredAt: '2026-11-10', items: [{ description: 'Pilares', quantity: 1, unitPrice: 12000 }] });
  await api(t, 'POST', `/construction/measurements/${m.id}/submit`);
  await api(t, 'POST', `/construction/measurements/${m.id}/review`, { notes: 'ok' });
  await api(t, 'POST', `/construction/measurements/${m.id}/approve`);
  return p.id;
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário do banco descartável).');
  const { accessToken: t } = await api(null, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  const projectId = await obraComMedicaoAPagar(t);
  const antes = await api(t, 'GET', `/construction/projects/${projectId}/health`);
  record('0. obra com medição aprovada de R$ 12.000,00 a pagar; em CAIXA o custo realizado é 0', antes.costBasis.base === 'CAIXA' && antes.actualFinancialCost === 0 && antes.costBasis.pendingApprovedMeasurementsCost === 12000, `${antes.costBasis.base} ${antes.actualFinancialCost}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    await teamTab.first().waitFor({ timeout: 70000 }).catch(() => {});
    for (let i = 0; i < 40 && !(await page.locator('input[type=email]').count()); i += 1) {
      if (await teamTab.count()) await teamTab.first().click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 70000 }).catch(() => {});
    record('1. login pela tela', true);

    await page.goto(`${BASE_URL}/painel/obras/configuracoes`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Custo realizado das obras').first().waitFor();
    await page.getByText('Base vigente: Caixa', { exact: false }).waitFor();
    record('2. card "Custo realizado das obras" mostra a base vigente Caixa (padrão)', true);

    await page.locator('#cost-basis-competencia').check({ force: true });
    await page.getByRole('button', { name: /Salvar base do custo realizado/ }).click();
    await page.getByText('Base do custo realizado salva', { exact: false }).waitFor();
    if (process.env.E2E_PRINT) await page.screenshot({ path: process.env.E2E_PRINT });
    const cfg = await api(t, 'GET', '/construction/settings/cost-basis');
    record('3. escolher Competência e salvar pela tela grava o parâmetro', cfg.base === 'COMPETENCIA', cfg.base);

    const depois = await api(t, 'GET', `/construction/projects/${projectId}/health`);
    record('4. Saúde da obra em COMPETENCIA conta a medição aprovada a pagar no custo realizado', depois.costBasis.base === 'COMPETENCIA' && depois.actualFinancialCost === 12000, String(depois.actualFinancialCost));

    await page.locator('#cost-basis-caixa').check({ force: true });
    await page.getByRole('button', { name: /Salvar base do custo realizado/ }).click();
    await page.getByText('Base do custo realizado salva: Caixa', { exact: false }).waitFor();
    const volta = await api(t, 'GET', `/construction/projects/${projectId}/health`);
    record('5. voltar para Caixa pela tela restaura o cálculo anterior', volta.costBasis.base === 'CAIXA' && volta.actualFinancialCost === 0, String(volta.actualFinancialCost));
  } catch (err) {
    record('erro inesperado', false, err.message);
  } finally {
    await browser.close();
  }
  const falhas = results.filter((x) => !x.ok).length;
  console.log(`\nResultado: ${results.length - falhas}/${results.length} passos OK`);
  process.exit(falhas ? 1 : 0);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
