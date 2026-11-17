'use strict';

const { requireE2ePassword } = require('./_e2e-env');
const { loginEquipe, criarCentroDeCusto, criarContaBancaria, criarContaAPagar } = require('./_m4-apoio');

/**
 * E2E real (Playwright) — reconferência 20/10/2026: R3 (sinal "-" no valor), R2 (lançamento
 * "QA-M4-03 a pagar" destravado: botão de pedir aprovação disponível), R5 (intenção antiga
 * invalidada, mensagem única, titular).
 * Atualizado em 17/11/2026: R3 confere o componente de valor de 27/10 (o sinal é removido COM aviso visível, não em silêncio); R2 cria
 * pela tela o próprio lançamento "a pagar" com pedido de aprovação e o edita depois do pedido (antes abria um id fixo do banco de dev);
 * o login espera a hidratação do `next dev`.
 * Uso: `node e2e/reconferencia-2010-r2-r3-r5.spec.js`
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = requireE2ePassword();
const results = [];
const rec = (s, ok, d) => { results.push(ok); console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${s}${d ? ' — ' + d : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(60000);
  try {
    await loginEquipe(page, BASE_URL, EMAIL, PASSWORD);
    await page.waitForTimeout(1200);

    // R3
    await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/novo`, { waitUntil: 'domcontentloaded' });
    await page.fill('#f-amount', '-10');
    await page.waitForTimeout(400);
    const val = await page.inputValue('#f-amount');
    // Componente de valor (DecimalInput, 27/10): o sinal é removido e um aviso visível (role=alert) pede para conferir o valor.
    const warn = await page.getByRole('alert').filter({ hasText: 'Não use sinal negativo: o sinal foi removido, confira o valor.' }).count();
    rec('R3: "-10" não vira 10 em silêncio (sinal removido + aviso visível ao lado do campo)', warn > 0 && val === '10', `valor no campo="${val}", avisos=${warn}`);
    // DI-BI2-6 (16/11/2026): no mesmo formulário (a pagar, padrão), o vencimento é obrigatório e o botão de criar fica desligado sem ele.
    const dueWarn = await page.getByText('Informe o vencimento.', { exact: false }).count();
    const createDisabled = await page.getByRole('button', { name: 'Criar lançamento', exact: true }).isDisabled().catch(() => false);
    rec('DI-BI2-6: a pagar sem vencimento não cria (aviso + botão desligado)', dueWarn > 0 && createDisabled, `avisos=${dueWarn}, desligado=${createDisabled}`);

    // R2 — o cenário do "QA-M4-03 a pagar": conta a pagar com pedido de aprovação, editada DEPOIS do pedido. O pedido fica invalidado e a
    // tela tem de mostrar o aviso e liberar de novo o "Solicitar aprovação" (antes o lançamento ficava travado).
    const suffix = Date.now();
    const cc = await criarCentroDeCusto(page, BASE_URL, suffix);
    await criarContaBancaria(page, BASE_URL, suffix);
    const entryId = await criarContaAPagar(page, BASE_URL, { description: `QA-M4-03 a pagar E2E ${suffix}`, amount: '1250', costCenterCode: cc });
    await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/${entryId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Detalhes do lançamento', { timeout: 60000 });
    await page.getByRole('button', { name: 'Solicitar aprovação' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Solicitar aprovação' }).click();
    await page.getByRole('button', { name: 'Aprovação pendente' }).first().waitFor({ timeout: 60000 });
    rec('R2 (preparo): pedido de aprovação aberto pela tela', true, entryId);
    await page.getByRole('button', { name: 'Editar' }).first().click();
    await page.fill('#e-desc', `QA-M4-03 a pagar E2E ${suffix} (editado depois do pedido)`);
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await page.getByText('(editado depois do pedido)', { exact: false }).first().waitFor({ timeout: 60000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Detalhes do lançamento', { timeout: 60000 });
    const btn = page.getByRole('button', { name: 'Solicitar aprovação' });
    await btn.first().waitFor({ timeout: 60000 }).catch(() => {});
    rec('R2: botão "Solicitar aprovação" disponível no QA-M4-03 a pagar', (await btn.count()) > 0 && (await btn.first().isEnabled()));
    rec('R2: aviso de pedido invalidado visível', (await page.getByText('Invalidada: o lançamento foi alterado depois do pedido', { exact: false }).count()) > 0);

    // R5
    await page.goto(`${BASE_URL}/painel/financeiro/intencoes-pagamento`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.innerText('body');
    const dup = (text.match(/Lançamento alterado após a aprovação/gi) || []).length;
    rec('R5: mensagem de invalidação aparece no máximo uma vez por intenção', dup <= (text.match(/Invalidada/g) || []).length, `ocorrências=${dup}`);
  } catch (e) {
    rec('execução', false, e.message);
  } finally {
    await browser.close();
  }
  process.exit(results.every(Boolean) ? 0 : 1);
})();
