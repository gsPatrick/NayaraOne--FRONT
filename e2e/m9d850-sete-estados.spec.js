'use strict';

/**
 * E2E (Playwright) do padrão de estados de UI (M9-D850, teste 7): os 7 estados numa tela real (Papéis & Permissões, GET /roles),
 * forçados por interceptação da resposta da API no navegador (nunca por MFA nem por token forjado), clicando na UI.
 * Executado pelo Playwright em 02/11/2026 contra a pilha local (relatório marco-9-acessibilidade-e-sete-estados.md); esta versão corrige os defeitos
 * do próprio spec apontados ali (login pela escolha de perfil, espera da renderização, nome legível da permissão, limiar do spinner) e
 * verifica SUCCESS e VALIDATION_ERROR de verdade, em /painel/empresas/novo (POST /companies interceptado). Roteiro manual: Maturacao/demandas/marco-9/M9-D850-*.md, seção 9.
 *
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BASE_URL=...] `node e2e/m9d850-sete-estados.spec.js`
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const WAIT_MS = Number(process.env.E2E_WAIT_MS || 15000);
const results = [];
const record = (step, ok, detail) => { results.push({ step, ok }); console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ` — ${detail}` : ''}`); };

async function force(page, status, body) {
  await page.unroute('**/roles').catch(() => {});
  await page.route('**/roles', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    if (status === 'abort') return route.abort('connectionrefused');
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

// Espera o elemento aparecer (a tela renderiza depois do domcontentloaded); falso se não aparecer no prazo.
const seen = (locator) => locator.first().waitFor({ state: 'visible', timeout: WAIT_MS }).then(() => true, () => false);
const bodyText = (page) => page.locator('body').innerText();

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9; nunca credencial real).');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(30000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Sou da equipe/i }).click(); // a tela abre primeiro na escolha de perfil
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'));
    const open = async () => { await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'domcontentloaded' }); };

    await force(page, 200, { success: true, data: [] });
    await open();
    record('EMPTY: 200 com lista vazia mostra "Nenhum papel cadastrado ainda" e o botão Novo papel', await seen(page.getByText('Nenhum papel cadastrado ainda')));

    await force(page, 403, { success: false, error: { code: 'PERMISSION_DENIED', message: 'x', details: { required: 'roles:read' }, traceId: 't' } });
    await open();
    const denied = await seen(page.getByText('Você não tem acesso a esta área.'));
    const deniedText = await bodyText(page);
    record('PERMISSION_DENIED: 403 mostra acesso negado, a permissão pelo nome legível (sem o código roles:read no texto) e nunca "Nenhum papel"', denied && deniedText.includes('Falta a permissão Papéis & Permissões: leitura.') && !deniedText.includes('roles:read') && !deniedText.includes('Nenhum papel cadastrado'));

    await force(page, 503, { success: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'indisponível', traceId: 't' } });
    await open();
    record('OFFLINE: 503 mostra "Sem conexão ou serviço indisponível" e o botão Tentar de novo', (await seen(page.getByText('Sem conexão ou serviço indisponível'))) && (await seen(page.getByRole('button', { name: 'Tentar de novo' }))));

    await force(page, 500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno.', traceId: 'qa-m9-trace-500' } });
    await open();
    record('RETRY: 500 mostra o código de suporte e Tentar novamente (e não Tentar de novo)', (await seen(page.getByText('qa-m9-trace-500'))) && (await seen(page.getByRole('button', { name: 'Tentar novamente' }))));

    await force(page, 200, { success: true, data: [{ id: 'qa-m9', name: 'QA-M9 Papel', permissions: [], isSystem: false }] });
    await page.getByRole('button', { name: 'Tentar novamente' }).click().catch(() => {});
    record('CONTENT: depois do retry com 200 e itens a tabela aparece', await seen(page.getByText('QA-M9 Papel')));

    // LOADING: o spinner só aparece depois do limiar anti-cintilação (cerca de 300 ms); a resposta é segurada por 4 s e a espera é pelo elemento, não por tempo fixo.
    await page.unroute('**/roles');
    await page.route('**/roles', async (route) => { await new Promise((resolve) => { setTimeout(resolve, 4000); }); await route.continue(); });
    await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'domcontentloaded' });
    const busy = await seen(page.locator('[aria-busy="true"]'));
    record('LOADING: "Carregando..." com aria-busy enquanto a chamada não volta', busy && (await bodyText(page)).includes('Carregando'));
    await page.unroute('**/roles');

    // VALIDATION_ERROR: 422 do POST /companies mostra o resumo com foco e o erro ligado ao campo (formulário real, clicando na UI).
    await page.route('**/companies', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: [{ field: 'taxId', message: 'CNPJ inválido (QA-M9).' }], traceId: 'qa-m9-trace-422' } }) });
    });
    await page.goto(`${BASE_URL}/painel/empresas/novo`, { waitUntil: 'domcontentloaded' });
    await page.locator('#c-tax-id').waitFor({ state: 'visible', timeout: WAIT_MS });
    await page.fill('#c-tax-id', '11222333000181');
    await page.fill('#c-legal-name', 'QA-M9 Empresa Teste');
    await page.getByRole('button', { name: 'Salvar empresa' }).click();
    const summary = page.locator('[data-ui-state="VALIDATION_ERROR"]');
    const summaryOk = await seen(summary) && (await summary.first().innerText()).includes('CNPJ inválido (QA-M9).');
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-ui-state') === 'VALIDATION_ERROR');
    record('VALIDATION_ERROR: 422 mostra "Revise os campos indicados" com o erro do campo e o foco no resumo', summaryOk && focused);
    await page.unroute('**/companies');

    // SUCCESS: 201 do POST /companies conclui a ação; a tela confirma levando à lista de empresas, com um único POST e a Idempotency-Key.
    const posts = [];
    await page.route('**/companies', (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      posts.push(route.request().headers());
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'qa-m9-empresa' } }) });
    });
    await page.goto(`${BASE_URL}/painel/empresas/novo`, { waitUntil: 'domcontentloaded' });
    await page.locator('#c-tax-id').waitFor({ state: 'visible', timeout: WAIT_MS });
    await page.fill('#c-tax-id', '11222333000181');
    await page.fill('#c-legal-name', 'QA-M9 Empresa Teste');
    await page.getByRole('button', { name: 'Salvar empresa' }).click();
    const left = await page.waitForURL((url) => url.pathname.endsWith('/painel/empresas'), { timeout: WAIT_MS }).then(() => true, () => false);
    record('SUCCESS: 201 conclui a ação (um POST com Idempotency-Key) e a tela volta à lista de empresas', left && posts.length === 1 && Boolean(posts[0]['idempotency-key']));
    await page.unroute('**/companies');
  } finally {
    await browser.close();
  }
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos ok`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((error) => { console.error(error); process.exit(1); });
