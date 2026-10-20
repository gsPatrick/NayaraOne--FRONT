'use strict';

/**
 * E2E real (Playwright) — R9: "Trocar de empresa" (reconferência ao vivo 20/10/2026).
 * admin@nayaraone.dev tem ADMIN em 2 empresas; o seletor precisa listá-las, trocar e,
 * depois, URL de registro da outra empresa deve responder 404 (isolamento).
 * Uso: node e2e/m45-r9-trocar-empresa.spec.js
 */
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const API = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';

let failed = 0;
function record(step, ok, detail) {
  if (!ok) failed += 1;
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function waitCompanyChange(page, prev) {
  for (let i = 0; i < 60; i += 1) {
    await page.waitForTimeout(1000);
    try {
      const now = await page.evaluate(() => localStorage.getItem('nayaraone.auth.companyId'));
      if (now && now !== prev) { await page.waitForLoadState('domcontentloaded'); return; }
    } catch { /* navegando */ }
  }
  throw new Error('companyId não mudou');
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    for (let i = 0; i < 4 && !(await page.locator('input[type=email]').count()); i += 1) {
      await page.getByText('Sou da equipe', { exact: false }).first().click();
      await page.waitForTimeout(1500);
    }
    await page.waitForSelector('input[type=email]');
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.includes('/entrar'));

    const trigger = page.getByRole('button', { name: 'Trocar de empresa' }).first();
    await trigger.waitFor();
    await page.waitForFunction(() => {
      const b = document.querySelector('button[aria-label="Trocar de empresa"]');
      return b && !b.disabled;
    }, null, { timeout: 30000 }).catch(() => {});
    record('1. seletor habilitado', await trigger.isEnabled());
    const startName = (await trigger.innerText()).trim();

    const companyBefore = await page.evaluate(() => localStorage.getItem('nayaraone.auth.companyId'));
    const tokenBefore = await page.evaluate(() => localStorage.getItem('nayaraone.auth.accessToken'));
    // Cria um registro na empresa atual (centro de custo) pela API autenticada do navegador, para testar o 404 depois.
    const created = await page.evaluate(async ({ API, token }) => {
      const r = await fetch(`${API}/finance/cost-centers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: `R9-${Date.now()}`, name: 'R9 isolamento' }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, { API, token: tokenBefore });
    record('2. registro criado na empresa atual', created.status === 201 || created.status === 200, `status ${created.status}`);
    const recordId = created.body && created.body.data && created.body.data.id;

    await trigger.click();
    const items = page.getByRole('menuitem');
    const n = await items.count();
    record('3. lista com 2+ empresas', n >= 2, `${n} empresas`);
    const names = await items.allInnerTexts();
    console.log('   empresas:', names.map((x) => x.replace(/\n/g, ' / ')).join(' | '));

    // escolhe a empresa que não é a atual
    let target = null;
    for (let i = 0; i < n; i += 1) {
      if (!(await items.nth(i).locator('svg').count())) { target = items.nth(i); break; }
    }
    await target.click();
    await waitCompanyChange(page, companyBefore);
    const companyAfter = await page.evaluate(() => localStorage.getItem('nayaraone.auth.companyId'));
    record('4. companyId da sessão mudou', companyAfter && companyAfter !== companyBefore);
    const tokenAfter = await page.evaluate(() => localStorage.getItem('nayaraone.auth.accessToken'));

    await page.waitForSelector('button[aria-label="Trocar de empresa"]');
    await page.waitForTimeout(1500);
    const newName = (await page.getByRole('button', { name: 'Trocar de empresa' }).first().innerText()).trim();
    record('5. nome da empresa no topo mudou', newName !== startName, `${startName} -> ${newName}`);

    if (recordId) {
      const res = await page.evaluate(async ({ API, token, id }) => {
        const r = await fetch(`${API}/finance/cost-centers`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        return { status: r.status, found: JSON.stringify(j).includes(id) };
      }, { API, token: tokenAfter, id: recordId });
      record('6. lista da nova empresa não contém o registro da anterior', res.status === 200 && !res.found);
    }
    const old = await page.evaluate(async ({ API, token }) => (await fetch(`${API}/auth/companies`, { headers: { Authorization: `Bearer ${token}` } })).status, { API, token: tokenBefore });
    record('7. token antigo recusado (401)', old === 401, `status ${old}`);

    // volta
    await page.getByRole('button', { name: 'Trocar de empresa' }).first().click();
    const items2 = page.getByRole('menuitem');
    for (let i = 0; i < await items2.count(); i += 1) {
      if (!(await items2.nth(i).locator('svg').count())) { await items2.nth(i).click(); break; }
    }
    await waitCompanyChange(page, companyAfter);
    record('8. volta para a empresa original', (await page.evaluate(() => localStorage.getItem('nayaraone.auth.companyId'))) === companyBefore);
  } catch (e) {
    record('erro inesperado', false, e.message);
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
}
main();
