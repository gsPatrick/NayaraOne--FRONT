'use strict';

/**
 * E2E (Playwright) — correções da reconferência ao vivo M45-RECONF (19/10/2026), clicando na tela:
 *   F1 Locação → Encerramento → "Checar elegibilidade" mostra as pendências em português (sem erro);
 *   F2 Intenções de pagamento → "Consultar banco" mostra mensagem e muda a situação (sandbox);
 *   F3 Regra de comissão lista o histórico de versões;
 *   F4/F5 detalhe do contrato sem SALE_INST_*, sem "(JUR-...)", sem "requirement", sem UUID;
 *   F6 Intercompany: coluna Data preenchida;
 *   F7 entrega de chaves sem "KD-TERM".
 * F2 é a única etapa que grava (consulta o banco simulado e liquida a intenção de homologação
 * "HOMO M45 — pagamento sandbox em trânsito"); pule com E2E_SKIP_F2=1. Nunca chama MFA.
 *
 * Uso: node e2e/m45-reconf-correcoes.spec.js  (E2E_SHOTS = pasta dos prints)
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const SHOTS = process.env.E2E_SHOTS || path.join(__dirname, 'shots', 'm45-reconf');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail, at: new Date().toISOString() });
  console.log(`${ok ? 'OK ' : 'FALHA'} ${step} — ${detail}`);
}

// Espera a tela terminar de carregar: some todo esqueleto (Skeleton) e todo botão "carregando".
async function waitReady(page, timeout = 90000) {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[class*="Skeleton"], [class*="skeleton"], [aria-busy="true"]'), null, { timeout }).catch(() => {});
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(String(err.message)));

  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
  const teamTab = page.getByText('Sou da equipe', { exact: false });
  if (await teamTab.count()) await teamTab.first().click();
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 60000 });
  const settle = () => waitReady(page);

  // F1
  await page.goto(`${BASE_URL}/painel/contratos/locacao`); await settle();
  await page.getByRole('tab', { name: 'Encerramento' }).click();
  const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Selecione' }) }).last();
  const options = await select.locator('option').allInnerTexts();
  const target = options.find((o) => /LOC-2026-0002/.test(o)) || options[1];
  await select.selectOption({ label: target });
  await page.getByRole('button', { name: 'Checar elegibilidade' }).click();
  await page.waitForFunction(() => /Bloqueado por \d+ pendência|Elegível para encerramento|Erro|não é uma função|is not a function/.test(document.body.innerText), null, { timeout: 120000 }).catch(() => {});
  await settle();
  const f1Text = await page.locator('main').innerText();
  await page.screenshot({ path: path.join(SHOTS, 'F1-encerramento-elegibilidade.png'), fullPage: true });
  const f1ok = /Bloqueado por \d+ pendência|Elegível para encerramento/.test(f1Text) && !/is not a function|Unhandled Runtime Error|OPEN_BILLING|ACTIVE\b/.test(f1Text) && jsErrors.length === 0;
  record('F1 Checar elegibilidade', f1ok, `${target} → ${(f1Text.match(/Bloqueado por[^\n]*|Elegível[^\n]*/) || ['sem mensagem'])[0]}`);

  // F2
  if (!process.env.E2E_SKIP_F2) {
    await page.goto(`${BASE_URL}/painel/financeiro/intencoes-pagamento`); await settle();
    await page.getByRole('button', { name: /Em trânsito no banco \(/ }).click();
    const row = page.locator('li', { hasText: 'HOMO M45 — pagamento sandbox em trânsito' }).first();
    if (await row.count()) {
      await row.getByRole('button', { name: 'Consultar banco' }).click();
      await page.waitForFunction(() => /Banco consultado em|consultar o banco/.test(document.body.innerText), null, { timeout: 180000 }).catch(() => {});
      await settle();
      const f2Text = await page.locator('main').innerText();
      await page.screenshot({ path: path.join(SHOTS, 'F2-consultar-banco.png'), fullPage: true });
      const msg = (f2Text.match(/Banco consultado em[^\n]*/) || [''])[0];
      record('F2 Consultar banco', /Situação atual: Executada/.test(msg), msg || 'sem mensagem');
    } else {
      record('F2 Consultar banco', false, 'intenção HOMO M45 em trânsito não encontrada (rode scripts/seed-homo-m45.js)');
    }
  }

  // F3
  await page.goto(`${BASE_URL}/painel/financeiro/regra-comissao`); await settle();
  const f3Text = await page.locator('main').innerText();
  await page.screenshot({ path: path.join(SHOTS, 'F3-historico-regra-comissao.png'), fullPage: true });
  const versionRows = await page.locator('tbody tr').count();
  record('F3 Histórico da regra de comissão', /Histórico de versões/.test(f3Text) && versionRows >= 2 && /Vigente/.test(f3Text) && !/REG-FIN-002/.test(f3Text), `${versionRows} versões listadas`);

  // F4/F5 — contrato de venda parcelada com checklist (VEN-2026-0003)
  await page.goto(`${BASE_URL}/painel/contratos/lista/${process.env.E2E_VEN_ID || 'a4ba23cc-df19-4f4e-9b6e-8b13514bda91'}`); await settle();
  const f4Text = await page.locator('main').innerText();
  await page.screenshot({ path: path.join(SHOTS, 'F4-F5-contrato-checklist.png'), fullPage: true });
  const dispensar = page.getByRole('button', { name: 'Dispensar', exact: true }).first();
  let modalTitle = 'sem item pendente';
  if (await dispensar.count()) {
    await dispensar.click();
    modalTitle = (await page.locator('[role=dialog]').first().innerText()).split('\n')[0];
    await page.screenshot({ path: path.join(SHOTS, 'F4-dialogo-dispensar.png') });
    await page.getByRole('button', { name: 'Cancelar' }).last().click();
  }
  const f4ok = !/SALE_INST_|JUR-0|requirement|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/.test(f4Text + modalTitle);
  record('F4/F5 Checklist e detalhe do contrato', f4ok, `diálogo: "${modalTitle}"`);

  // F6
  await page.goto(`${BASE_URL}/painel/financeiro/intercompany`); await settle();
  const f6Text = await page.locator('table').last().innerText();
  await page.screenshot({ path: path.join(SHOTS, 'F6-intercompany-data.png'), fullPage: true });
  record('F6 Intercompany coluna Data', /Pedida em \d{2}\/\d{2}\/\d{4}/.test(f6Text) && !/\t—\t/.test(f6Text), (f6Text.match(/Pedida em[^\n\t]*/) || ['sem data'])[0]);

  // F7
  await page.goto(`${BASE_URL}/painel/contratos/entrega-chaves`); await settle();
  const kdIds = (process.env.E2E_KD_IDS || '1dc74d23-66a4-418c-a500-e39a98b4094b,6a7a6177-2ae5-4e7d-8b05-6c4d743dc7b8').split(',');
  let f7ok = true; const seen = [];
  for (const id of kdIds) {
    await page.goto(`${BASE_URL}/painel/contratos/entrega-chaves/${id}`); await settle();
    const prev = page.getByRole('button', { name: 'Ver prévia do termo' });
    if (await prev.count()) { await prev.click(); await settle(); }
    const t = await page.locator('main').innerText();
    seen.push((t.match(/Termo\t?[^\n]*/) || ['sem linha Termo'])[0].replace(/\t/g, ': '));
    // O texto ASSINADO de termos antigos (v1/v2) é mostrado como foi gravado; fora dele, nada de código.
    if (/KD-TERM/.test(t.replace(/TERMO DE ENTREGA[\s\S]*?(?:Assinado|PRÉVIA)[^\n]*/g, ''))) f7ok = false;
    await page.screenshot({ path: path.join(SHOTS, `F7-entrega-chaves-${id.slice(0, 8)}.png`), fullPage: true });
  }
  await page.screenshot({ path: path.join(SHOTS, 'F7-entrega-chaves.png'), fullPage: true });
  record('F7 Termo sem código técnico', f7ok, seen.join(' | ') || 'nenhuma entrega listada');

  record('Sem erro de JavaScript', jsErrors.length === 0, jsErrors.join(' | ') || 'nenhum');
  await browser.close();
  fs.writeFileSync(path.join(SHOTS, 'resultado.json'), JSON.stringify(results, null, 2));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
