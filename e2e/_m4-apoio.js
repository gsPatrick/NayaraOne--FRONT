'use strict';

// Apoio dos specs do Financeiro (Marco 4) que precisam de dado próprio no banco descartável, tudo pela TELA (clicando):
// login da equipe à prova da hidratação do `next dev`, centro de custo, conta bancária e conta a pagar pendente (a natureza que exige aprovação).
// Não é spec.

/** Login pela aba "Sou da equipe". Sob o `next dev` o primeiro clique pode cair antes da hidratação: tenta de novo até o campo aparecer. */
async function loginEquipe(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/entrar`, { waitUntil: 'networkidle' });
  for (let i = 0; i < 20 && !(await page.locator('input[type=email]').count()); i += 1) {
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector('input[type=email]', { timeout: 70000 });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 70000 });
}

/** Centro de custo novo em Financeiro > Centros (cartão "Centros de custo" > Novo). Devolve o código. */
async function criarCentroDeCusto(page, baseUrl, suffix) {
  const code = `CC-E2E-${String(suffix).slice(-6)}`;
  await page.goto(`${baseUrl}/painel/financeiro/centros`, { waitUntil: 'domcontentloaded' });
  const card = page.getByRole('heading', { name: 'Centros de custo', exact: true }).locator('xpath=ancestor::*[.//button[contains(., "Novo")]][1]');
  await card.getByRole('button', { name: /Novo/ }).first().click();
  await page.getByPlaceholder('Ex: CC-001').fill(code);
  await page.getByPlaceholder('Ex: Manutenção — Prédio A').fill(`Centro E2E ${suffix}`);
  await page.getByRole('button', { name: 'Criar', exact: true }).click();
  await page.getByText(code, { exact: true }).first().waitFor({ timeout: 70000 });
  return code;
}

/** Conta bancária operacional nova (só a chave PIX, como a tela permite) em Financeiro > Contas bancárias > Nova: o novo lançamento exige
 * uma conta bancária e o banco descartável não traz nenhuma. Devolve a chave PIX. */
async function criarContaBancaria(page, baseUrl, suffix) {
  const pix = `e2e-${suffix}@e2e.nayaraone.test`;
  await page.goto(`${baseUrl}/painel/financeiro/contas-bancarias/novo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#f-pix', { timeout: 70000 });
  await page.fill('#f-pix', pix);
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.waitForURL((u) => u.pathname === '/painel/financeiro/contas-bancarias', { timeout: 70000 });
  return pix;
}

/** Hoje no fuso de São Paulo (AAAA-MM-DD), para o vencimento. */
const hojeSaoPaulo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Escolhe no select o centro de custo pelo código. */
async function escolherCentro(page, selectId, code) {
  const option = page.locator(`${selectId} option`, { hasText: code }).first();
  await option.waitFor({ state: 'attached', timeout: 70000 });
  await page.selectOption(selectId, { label: (await option.textContent()).trim() });
}

/** Conta a pagar pendente (natureza padrão) pela tela de novo lançamento. Devolve o id (da resposta do POST ou da URL). */
async function criarContaAPagar(page, baseUrl, { description, amount, costCenterCode }) {
  await page.goto(`${baseUrl}/painel/financeiro/lancamentos/novo`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#f-desc', { timeout: 70000 });
  await page.fill('#f-desc', description);
  await page.fill('#f-amount', String(amount));
  await page.fill('#f-due', hojeSaoPaulo());
  if ((await page.inputValue('#f-nature')) !== 'PAYABLE') throw new Error('a natureza padrão do novo lançamento deixou de ser "a pagar"');
  await escolherCentro(page, '#f-cc', costCenterCode);
  const submit = page.getByRole('button', { name: 'Criar lançamento', exact: true });
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && /\/finance\/entries(\?|$)/.test(r.url()), { timeout: 70000 }),
    submit.click(),
  ]);
  const body = await resp.json().catch(() => null);
  if (!resp.ok()) throw new Error(`criar lançamento → ${resp.status()} ${body && body.error ? body.error.code : ''}`);
  return body && body.data && body.data.id;
}

module.exports = { loginEquipe, criarCentroDeCusto, criarContaBancaria, criarContaAPagar, escolherCentro, hojeSaoPaulo };
