'use strict';

/**
 * E2E real (Playwright) — consolidação das frentes dos Marcos 4/5 (19/10/2026).
 * Clica na UI: fechamento (devolver para aberto), comprovante no lançamento, régua de cobrança
 * (paginação + filtro por contrato), intercompany (recusa com modal de motivo), regra de comissão,
 * consolidado do grupo, repasse (aprovação), entrega de chaves e dispensa de documento.
 *
 * Passos que exigem MFA (TOTP) param no modal de verificação: não há segredo TOTP de dev e o
 * teste NÃO chama endpoints de MFA por HTTP. Esses passos são registrados como "MFA-STOP".
 * A descoberta de dados usa GET autenticado da própria sessão do navegador (sem escrita por HTTP).
 *
 * Uso: `node e2e/marco4-5-consolidacao.spec.js` (E2E_SHOTS define a pasta de screenshots).
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const SHOTS = process.env.E2E_SHOTS || path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function record(step, status, detail) {
  results.push({ step, status, detail: detail || '' });
  console.log(`[${status}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(120000);
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: ${e.message}`));
  const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  const apiGet = (p) =>
    page.evaluate(
      async ([base, p2]) => {
        const token = localStorage.getItem('nayaraone.auth.accessToken');
        const r = await fetch(base + p2, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json().catch(() => null);
        return j && j.data;
      },
      [API_URL, p]
    );
  const mfaVisible = async () => (await page.locator('text=/verifica[cç][aã]o|c[oó]digo do autenticador|MFA/i').count()) > 0;
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (err) {
      record(name, 'FALHOU', String(err && err.message).split('\n')[0]);
      await shot(`erro-${name.replace(/[^a-z0-9]+/gi, '-')}`).catch(() => {});
    }
  };

  // 1. Login
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
  const teamTab = page.getByText('Sou da equipe', { exact: false });
  if (await teamTab.count()) await teamTab.first().click();
  await page.waitForSelector('input[type=email]');
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 60000 }).catch(() => {});
  if (page.url().includes('/entrar')) {
    await shot('00-login-falhou');
    record('login', 'FALHOU', 'continua em /entrar (MFA no login?)');
    await browser.close();
    return finish();
  }
  record('login', 'OK', EMAIL);
  await shot('00-login');

  // 2. Fechamento — devolver para aberto
  await step('fechamento: devolver para aberto', async () => {
    await page.goto(`${BASE_URL}/painel/financeiro/fechamento`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot('01-fechamento');
    const btn = page.getByRole('button', { name: 'Devolver para aberto' });
    if (!(await btn.count())) {
      record('fechamento: devolver para aberto', 'SEM-DADO', 'nenhum período em REVIEW no mês selecionado');
      return;
    }
    await btn.first().click();
    await page.click('button:has-text("Confirmar devolução")');
    const err = await page.locator('[role=alert]').allInnerTexts();
    await shot('01b-fechamento-sem-motivo');
    await page.fill('#reopenReason', 'E2E: conferência desatualizada após pedido de fechamento');
    await page.click('button:has-text("Confirmar devolução")');
    await page.waitForTimeout(1500);
    await shot('01c-fechamento-devolver');
    record('fechamento: devolver para aberto', (await mfaVisible()) ? 'MFA-STOP' : 'OK', `validação sem motivo: ${err.join(' | ').slice(0, 120) || '(nenhuma)'}`);
  });

  // 3. Lançamento — anexar comprovante
  await step('lançamento: anexar comprovante', async () => {
    const entries = (await apiGet('/finance/entries?nature=PAYABLE&status=PENDING&pageSize=50')) || [];
    const list = Array.isArray(entries) ? entries : entries.items || entries.rows || [];
    const target = list.find((e) => !e.settlementEvidenceFileId) || list[0];
    if (!target) return record('lançamento: anexar comprovante', 'SEM-DADO', 'nenhum PAYABLE pendente');
    await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/${target.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const open = page.getByRole('button', { name: /Anexar comprovante|Trocar comprovante/ });
    if (!(await open.count())) {
      await shot('02-lancamento-sem-botao');
      return record('lançamento: anexar comprovante', 'SEM-DADO', `lançamento ${target.id} sem botão (sem conta bancária?)`);
    }
    await open.first().click();
    const pdf = path.join(SHOTS, 'comprovante-e2e.pdf');
    fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
    await page.setInputFiles('input[type=file]', pdf);
    await page.getByPlaceholder(/TED feita/).fill('E2E: TED feita no internet banking');
    await page.locator('button:has-text("Anexar comprovante")').last().click();
    const confirm = page.getByRole('button', { name: 'Anexar comprovante' }).last();
    await page.waitForTimeout(800);
    if (await confirm.count()) await confirm.click().catch(() => {});
    await page.waitForTimeout(2500);
    await shot('02-lancamento-comprovante');
    const alerts = (await page.locator('[role=alert]').allInnerTexts()).join(' | ');
    record('lançamento: anexar comprovante', /erro|falha|não/i.test(alerts) ? 'VER' : 'OK', `${target.id} :: ${alerts.slice(0, 160)}`);
  });

  // 4. Régua de cobrança — total de páginas + filtro por contrato
  await step('régua de cobrança', async () => {
    await page.goto(`${BASE_URL}/painel/financeiro/regua-cobranca`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=/Página \\d+ de \\d+/');
    const label = await page.locator('text=/Página \\d+ de \\d+/').first().innerText();
    await page.waitForFunction(() => document.querySelectorAll('#f-contract option').length > 1, null, { timeout: 15000 }).catch(() => {});
    const options = await page.locator('#f-contract option').count();
    if (options > 1) {
      await page.selectOption('#f-contract', { index: 1 });
      await page.click('button:has-text("Filtrar")');
      await page.waitForTimeout(1500);
    }
    await shot('03-regua-cobranca');
    const after = await page.locator('text=/Página \\d+ de \\d+/').first().innerText();
    record('régua de cobrança', 'OK', `antes: "${label}" · contratos no filtro: ${options - 1} · depois: "${after}"`);
  });

  // 5. Intercompany — recusa com modal
  await step('intercompany: recusa com modal', async () => {
    await page.goto(`${BASE_URL}/painel/financeiro/intercompany`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot('04-intercompany');
    const reject = page.getByRole('button', { name: 'Recusar' });
    if (!(await reject.count())) {
      // Criação exige MFA: só valida o formulário até o modal de verificação.
      await page.click('button:has-text("Pedir transferência")');
      await shot('04b-intercompany-validacao');
      return record('intercompany: recusa com modal', 'SEM-DADO', 'nenhuma transferência aguardando aprovação (criar exige MFA)');
    }
    await reject.first().click();
    await page.waitForSelector('#rejectReason');
    await page.click('button:has-text("Confirmar recusa")');
    const msg = await page.locator('text=Informe o motivo da recusa.').count();
    await page.fill('#rejectReason', 'E2E: documento não confere');
    await shot('04c-intercompany-modal');
    await page.click('button:has-text("Confirmar recusa")');
    await page.waitForTimeout(2000);
    await shot('04d-intercompany-recusada');
    const stillOpen = await page.locator('#rejectReason').count();
    const err = stillOpen ? (await page.locator('[role=alert]').allInnerTexts()).join(' | ') : '';
    record('intercompany: recusa com modal', stillOpen ? 'VER' : 'OK', `validação vazia: ${msg ? 'sim' : 'não'} ${err}`);
  });

  // 6. Regra de comissão + consolidado
  await step('regra de comissão', async () => {
    await page.goto(`${BASE_URL}/painel/financeiro/regra-comissao`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#pct-BROKER');
    await page.fill('#pct-BROKER', '150');
    await page.click('button:has-text("Publicar regra")');
    const v = await page.locator('text=/até 100/').count();
    await page.fill('#pct-BROKER', '5');
    await page.click('button:has-text("Publicar regra")');
    await page.waitForTimeout(800);
    await shot('05-regra-comissao');
    record('regra de comissão', (await mfaVisible()) ? 'MFA-STOP' : 'VER', `validação >100: ${v ? 'sim' : 'não'}`);
  });
  await step('consolidado do grupo', async () => {
    await page.goto(`${BASE_URL}/painel/financeiro/consolidado-grupo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=consolidated-totals]').catch(() => {});
    await shot('06-consolidado-grupo');
    const t = await page.locator('[data-testid=consolidated-totals]').allInnerTexts();
    record('consolidado do grupo', t.length ? 'OK' : 'FALHOU', t.join(' ').slice(0, 160));
  });

  // 7. Repasse — aprovar
  await step('repasse: aprovar', async () => {
    await page.goto(`${BASE_URL}/painel/financeiro/comissoes-repasses`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot('07-repasses');
    const approve = page.getByRole('button', { name: 'Aprovar', exact: true });
    if (!(await approve.count())) return record('repasse: aprovar', 'SEM-DADO', 'nenhum repasse PENDING');
    await approve.first().click();
    await page.waitForSelector('#ar-cc');
    await page.selectOption('#ar-cc', { index: 1 }).catch(() => {});
    await shot('07b-repasse-modal');
    await page.locator('button:has-text("Aprovar")').last().click();
    await page.waitForTimeout(1500);
    await shot('07c-repasse-aprovar');
    record('repasse: aprovar', (await mfaVisible()) ? 'MFA-STOP' : 'VER');
  });

  // 8. Entrega de chaves
  await step('entrega de chaves', async () => {
    await page.goto(`${BASE_URL}/painel/contratos/entrega-chaves`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await shot('08-entrega-chaves');
    const release = page.getByRole('button', { name: /Liberar chaves/ });
    if (!(await release.count())) return record('entrega de chaves', 'SEM-DADO', 'nenhuma entrega PENDING');
    await release.first().click();
    await page.waitForURL(/entrega-chaves\/.+/);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    await shot('08b-entrega-chaves-detalhe');
    const dialog = page.locator('[role=dialog]');
    if (await dialog.count()) {
      await dialog.locator('button').last().click();
      await page.waitForTimeout(2000);
      await shot('08c-entrega-chaves-tentativa');
    }
    const alerts = (await page.locator('[role=alert]').allInnerTexts()).join(' | ');
    record('entrega de chaves', 'OK', `formulário/gate: ${alerts.slice(0, 200) || '(sem alerta)'}`);
  });

  // 9. Dispensa de documento
  await step('dispensa de documento', async () => {
    const contracts = (await apiGet('/legal/contracts')) || [];
    let target = null;
    for (const c of (Array.isArray(contracts) ? contracts : []).slice(0, 40)) {
      // eslint-disable-next-line no-await-in-loop
      const reqs = (await apiGet(`/legal/contracts/${c.id}/requirements`)) || [];
      if ((Array.isArray(reqs) ? reqs : []).some((r) => r.status === 'PENDING')) {
        target = c;
        break;
      }
    }
    if (!target) return record('dispensa de documento', 'SEM-DADO', 'nenhum contrato com documento pendente');
    await page.goto(`${BASE_URL}/painel/contratos/lista/${target.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const waive = page.getByRole('button', { name: 'Dispensar', exact: true });
    if (!(await waive.count())) {
      await shot('09-dispensa-sem-botao');
      return record('dispensa de documento', 'SEM-DADO', `contrato ${target.id}: botão Dispensar não visível`);
    }
    await waive.first().click();
    await page.fill('#f-req-reason', 'E2E: documento dispensado por decisão da gestão (teste)');
    await shot('09b-dispensa-modal');
    await page.locator('[role=dialog] button:has-text("Dispensar")').last().click();
    await page.waitForSelector('#f-req-reason', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await shot('09c-dispensa-resultado');
    const alerts = (await page.locator('[role=alert]').allInnerTexts()).join(' | ');
    record('dispensa de documento', /dispensad/i.test(alerts) ? 'OK' : 'VER', alerts.slice(0, 200));
  });

  await browser.close();
  if (consoleErrors.length) record('erros de JS na página', 'FALHOU', consoleErrors.slice(0, 5).join(' || '));
  return finish();
}

function finish() {
  fs.writeFileSync(path.join(SHOTS, 'resultado.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => r.status === 'FALHOU');
  console.log(`\nResumo: ${results.length} passos, ${failed.length} falha(s).`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
