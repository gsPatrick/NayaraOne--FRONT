'use strict';

/**
 * E2E real (Playwright) — reconferência 20/10/2026: R3 (sinal "-" no valor), R2 (lançamento
 * "QA-M4-03 a pagar" destravado: botão de pedir aprovação disponível), R5 (intenção antiga
 * invalidada, mensagem única, titular).
 * Uso: `node e2e/reconferencia-2010-r2-r3-r5.spec.js`
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const results = [];
const rec = (s, ok, d) => { results.push(ok); console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${s}${d ? ' — ' + d : ''}`); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(60000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const team = page.getByText('Sou da equipe', { exact: false });
    if (await team.count()) await team.first().click();
    await page.waitForSelector('input[type=email]');
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.includes('/entrar'));
    await page.waitForTimeout(1200);

    // R3
    await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/novo`, { waitUntil: 'domcontentloaded' });
    await page.fill('#f-amount', '-10');
    await page.waitForTimeout(400);
    const val = await page.inputValue('#f-amount');
    const warn = await page.getByText('O valor deve ser maior que zero', { exact: false }).count();
    rec('R3: "-10" não vira 10 em silêncio (campo esvaziado + aviso)', warn > 0 && val === '', `valor no campo="${val}", avisos=${warn}`);

    // R2
    await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/6b3d0585-d4ed-4eba-b823-bc45f4fe0cc8`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Detalhes do lançamento', { timeout: 60000 });
    const btn = page.getByRole('button', { name: 'Solicitar aprovação' });
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
