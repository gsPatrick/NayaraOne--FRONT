/**
 * E2E real (Playwright) — Marco 6, matriz de fechamento (10/11/2026): bloqueio de retirada das fotos obrigatórias
 * de um chamado de garantia FECHADO. O chamado é preparado pela API real (login normal, fotos enviadas pelo módulo
 * de arquivos, ação de atendimento, RESOLVED → CLOSED); a tela é exercida de verdade: abrir o chamado, Editar,
 * remover a foto "antes" e conferir o aviso e o botão Salvar desabilitado; depois a API confirma que nada mudou.
 *
 * Uso: E2E_BASE_URL=http://localhost:3106 E2E_API_URL=http://localhost:4107/api/v1 E2E_EMAIL=... E2E_PASSWORD=... \
 *      node e2e/marco6-chamado-fechado-fotos.spec.js
 * Rode só contra uma API em banco descartável: o script cria obra, imóvel e chamado.
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
const jpeg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(String(Math.random()))]).toString('base64');

async function preparar() {
  const { accessToken: t } = await api(null, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  const s = Date.now();
  const obra = await api(t, 'POST', '/construction/projects', { name: `E2E M6 Chamado fechado ${s}` });
  const imovel = await api(t, 'POST', '/properties', { title: `E2E M6 Imóvel ${s}`, internalCode: `E2E-M6-${s}`, propertyType: 'RESIDENTIAL' });
  const antes = await api(t, 'POST', '/files', { fileName: 'antes.jpg', mimeType: 'image/jpeg', contentBase64: jpeg() });
  const depois = await api(t, 'POST', '/files', { fileName: 'depois.jpg', mimeType: 'image/jpeg', contentBase64: jpeg() });
  const c = await api(t, 'POST', '/construction/warranty-cases', { propertyId: imovel.id, projectId: obra.id, description: 'Infiltração (E2E)', severity: 'MEDIUM', beforeMediaFileIds: [antes.id] });
  await api(t, 'POST', `/construction/maintenance-cases/${c.id}/actions`, { description: 'Atendimento (E2E)', cost: 100 });
  await api(t, 'PATCH', `/construction/maintenance-cases/${c.id}`, { status: 'RESOLVED' });
  await api(t, 'PATCH', `/construction/maintenance-cases/${c.id}`, { status: 'CLOSED', rootCauseCode: 'WORKMANSHIP', afterMediaFileIds: [depois.id] });
  return { t, caseId: c.id, antes: antes.id, depois: depois.id };
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário do banco descartável).');
  const prep = await preparar();
  record('0. chamado FECHADO preparado pela API (fotos antes/depois, causa raiz, atendimento)', true, prep.caseId);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    // Em `next dev` a hidratação pode demorar: o texto chega pelo SSR antes do clique funcionar. Clica até o formulário abrir.
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

    await page.goto(`${BASE_URL}/painel/obras/pos-obra/${prep.caseId}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Editar/ }).first().click();
    const aviso = page.getByText('não podem ser retiradas de um chamado fechado', { exact: false });
    await aviso.waitFor();
    record('2. Editar chamado fechado mostra o aviso de fotos/causa obrigatórias', true);

    await page.locator('#e-before-evidence').locator('..').locator('button[aria-label^="Remover"]').first().click()
      .catch(async () => page.locator('button[aria-label^="Remover"]').first().click());
    await page.getByText('Falta preencher: evidência "antes"', { exact: false }).waitFor();
    const salvar = page.getByRole('button', { name: 'Salvar alterações' });
    const desabilitado = await salvar.isDisabled();
    record('3. remover a foto "antes": aviso "Falta preencher" e Salvar desabilitado', desabilitado, desabilitado ? '' : 'Salvar continuou habilitado');
    await page.screenshot({ path: process.env.E2E_PRINT || 'e2e-marco6-chamado-fechado-fotos.png', fullPage: false });

    const depoisApi = await api(prep.t, 'GET', `/construction/maintenance-cases/${prep.caseId}`);
    const intacto = depoisApi.status === 'CLOSED' && depoisApi.beforeMediaFileIds.includes(prep.antes) && depoisApi.afterMediaFileIds.includes(prep.depois) && depoisApi.rootCauseCode === 'WORKMANSHIP';
    record('4. API confirma: chamado continua FECHADO com as duas fotos e a causa raiz', intacto);

    const r = await fetch(`${API}/construction/maintenance-cases/${prep.caseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prep.t}` }, body: JSON.stringify({ beforeMediaFileIds: [] }) });
    const j = await r.json();
    record('5. mesma retirada direto na API é recusada (422 MAINTENANCE_CASE_CLOSED_REQUIREMENTS)', r.status === 422 && j.error.code === 'MAINTENANCE_CASE_CLOSED_REQUIREMENTS', `${r.status} ${j.error && j.error.code}`);
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
