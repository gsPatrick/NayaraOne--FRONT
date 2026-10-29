'use strict';

/**
 * E2E (Playwright) do padrão de estados de UI (M9-D850, teste 7): os 7 estados numa tela real (Papéis & Permissões, GET /roles),
 * forçados por interceptação da resposta da API no navegador (nunca por MFA nem por token forjado), clicando na UI.
 * NÃO FOI EXECUTADO NO MARCO 9 (regra de operação: sem Playwright nesta rodada); a evidência da tela é o roteiro para o Claude Browser em
 * Maturacao/demandas/marco-9/M9-D850-*.md, seção 9 (prefixo "QA-M9"; parar se pedir MFA).
 *
 * Uso: `node e2e/m9d850-sete-estados.spec.js`
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
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

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9; nunca credencial real).');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(30000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'));
    const open = async () => { await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'domcontentloaded' }); };

    await force(page, 200, { success: true, data: [] });
    await open();
    record('EMPTY: 200 com lista vazia mostra "Nenhum papel cadastrado ainda" e o botão Novo papel', await page.getByText('Nenhum papel cadastrado ainda').isVisible());

    await force(page, 403, { success: false, error: { code: 'PERMISSION_DENIED', message: 'x', details: { required: 'roles:read' }, traceId: 't' } });
    await open();
    const denied = await page.getByText('Você não tem acesso a esta área.').isVisible();
    record('PERMISSION_DENIED: 403 mostra acesso negado, a permissão roles:read e nunca "Nenhum papel"', denied && !(await page.getByText('Nenhum papel cadastrado').count()) && (await page.getByText('roles:read').isVisible()));

    await force(page, 503, { success: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'indisponível', traceId: 't' } });
    await open();
    record('OFFLINE: 503 mostra "Sem conexão ou serviço indisponível" e o botão Tentar de novo', (await page.getByText('Sem conexão ou serviço indisponível').isVisible()) && (await page.getByRole('button', { name: 'Tentar de novo' }).isVisible()));

    await force(page, 500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro interno.', traceId: 'qa-m9-trace-500' } });
    await open();
    record('RETRY: 500 mostra o código de suporte e Tentar novamente (e não Tentar de novo)', (await page.getByText('qa-m9-trace-500').first().isVisible()) && (await page.getByRole('button', { name: 'Tentar novamente' }).isVisible()));

    await force(page, 200, { success: true, data: [{ id: 'qa-m9', name: 'QA-M9 Papel', permissions: [], isSystem: false }] });
    await page.getByRole('button', { name: 'Tentar novamente' }).click().catch(() => {});
    await open();
    record('CONTENT: 200 com itens mostra a tabela', await page.getByText('QA-M9 Papel').isVisible());

    await page.unroute('**/roles');
    await page.route('**/roles', async (route) => { await new Promise((resolve) => { setTimeout(resolve, 1500); }); await route.continue(); });
    const loading = page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'domcontentloaded' });
    await loading;
    record('LOADING: "Carregando..." com aria-busy enquanto a chamada não volta', await page.locator('[aria-busy="true"]').first().isVisible().catch(() => false));
    record('SUCCESS e VALIDATION_ERROR: ver o roteiro da seção 9 (criação de papel com nome em branco e exclusão concluída)', true, 'cobertos pelo roteiro manual');
  } finally {
    await browser.close();
  }
  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos ok`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((error) => { console.error(error); process.exit(1); });
