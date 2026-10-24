'use strict';

/**
 * E2E real (Playwright) das lacunas do Marco 8 fechadas em 24/10/2026:
 * resultado manual do banco + proposta + cancelamento, produto no caso, comissão com fato gerador
 * e divisão corretor/gerente, tela de Parâmetros, conferências fiscais, arquivos da NFS-e,
 * exportação contábil com ajuste e retorno do contador, e calendário de obrigações.
 *
 * Uso: node e2e/marco8-lacunas.spec.js
 * Os dados criados levam a marca QA-M8-LAC e são removidos no final (banco de homologação compartilhado).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const API_DIR = process.env.E2E_API_DIR || path.join(__dirname, '..', '..', 'NayaraOne--API');
const PRINTS = process.env.E2E_PRINTS || '';
const OBLIGATION_YEAR = new Date().getFullYear() + 1;

const passos = [];
function passo(nome, ok, detalhe) {
  passos.push({ nome, ok: Boolean(ok), detalhe: detalhe || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}

// Roda um trecho no contexto do banco da API (mesma conexão dos testes), fora do navegador.
function bancoApi(codigo, args = {}) {
  const script = `
    const { sequelize, getSeedTenant, withTenantTransaction } = require('./test/testHelpers');
    const models = require('./src/models');
    (async () => {
      const tenant = await getSeedTenant();
      const args = JSON.parse(process.env.E2E_ARGS);
      const out = await withTenantTransaction(tenant, async (t) => { ${codigo} });
      console.log('@@' + JSON.stringify(out || null));
      await sequelize.close();
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const out = execFileSync('node', ['-e', script], { cwd: API_DIR, env: { ...process.env, E2E_ARGS: JSON.stringify(args) }, encoding: 'utf8', timeout: 120000 });
  const linha = out.split('\n').find((l) => l.startsWith('@@'));
  return linha ? JSON.parse(linha.slice(2)) : null;
}

async function shot(page, nome) {
  if (!PRINTS) return;
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(PRINTS, nome), fullPage: false });
}

async function digitar(page, locator, valor) {
  await locator.click();
  await locator.fill('');
  await page.keyboard.type(valor, { delay: 15 });
}

async function main() {
  const inicio = new Date();
  const marca = `QA-M8-LAC-${inicio.getTime()}`;
  const browser = await chromium.launch({ headless: true, args: ['--lang=pt-BR'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true, locale: 'pt-BR' });
  page.setDefaultTimeout(60000);
  let casoId = '';
  page.on('response', async (res) => {
    if (res.status() < 400) return;
    let corpo = '';
    try { corpo = (await res.text()).slice(0, 300); } catch { corpo = ''; }
    console.log(`[HTTP ${res.status()}] ${res.url().replace(/https?:\/\/[^/]+/, '')} ${corpo}`);
  });
  const parametrosOriginais = {};

  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const equipe = page.getByText('Sou da equipe', { exact: false });
    if (await equipe.count()) await equipe.first().click();
    await page.waitForSelector('input[type=email]');
    await digitar(page, page.locator('input[type=email]'), EMAIL);
    await digitar(page, page.locator('input[type=password]'), PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 60000 });
    passo('login pela tela', true);

    // ---------- Parâmetros (pelo menu) ----------
    await page.goto(`${BASE_URL}/painel/correspondente`, { waitUntil: 'domcontentloaded' });
    const menuParametros = page.locator('a[href="/painel/correspondente/parametros"]').first();
    await menuParametros.waitFor({ state: 'visible' });
    await menuParametros.click();
    await page.waitForURL(/\/correspondente\/parametros/);
    await page.getByText('Quem pode receber um caso').waitFor({ state: 'visible' });
    passo('Parâmetros abre pelo menu lateral', true);

    const produtos = await page.getByText('Financiamento de construção').count();
    passo('elegibilidade lista os produtos', produtos > 0);
    await shot(page, 'F18-parametros-elegibilidade.png');

    await page.getByRole('tab', { name: 'Comissão' }).click();
    await page.locator('#co-broker-manual').waitFor({ state: 'visible' });
    parametrosOriginais.broker = await page.locator('#co-broker-manual').inputValue();
    await digitar(page, page.locator('#co-broker-manual'), '60');
    const gerenteMsg = await page.getByText('Gerente fica com 40%').count();
    passo('divisão mostra a parte do gerente ao digitar', gerenteMsg > 0);
    await shot(page, 'F19-parametros-comissao.png');
    await digitar(page, page.locator('#co-reason'), `${marca} teste de divisão`);
    const versoesAntes = await page.locator('table').last().locator('tbody tr').count();
    await page.getByRole('button', { name: 'Salvar comissão' }).click();
    await page.getByText('Comissão atualizada').waitFor({ state: 'visible' });
    await page.waitForFunction((n) => document.querySelectorAll('table')[document.querySelectorAll('table').length - 1].querySelectorAll('tbody tr').length > n, versoesAntes, { timeout: 30000 }).catch(() => {});
    const versoesDepois = await page.locator('table').last().locator('tbody tr').count();
    passo('salvar comissão cria versão nova no histórico', versoesDepois === versoesAntes + 1 || (versoesAntes >= 20 && versoesDepois === 20), `${versoesAntes} → ${versoesDepois}`);

    // motivo vazio bloqueia o botão
    await page.locator('#co-reason').fill('');
    passo('sem motivo o botão salvar fica desabilitado', await page.getByRole('button', { name: 'Salvar comissão' }).isDisabled());

    // ---------- Novo caso manual com produto ----------
    await page.goto(`${BASE_URL}/painel/correspondente`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Novo caso de financiamento/ }).click();
    await page.locator('#fc-principal').waitFor({ state: 'visible' });
    await page.locator('#fc-product').selectOption('CONSTRUCAO');
    await page.locator('#fc-provider').selectOption('manual');
    await page.locator('#fc-principal').click();
    await page.keyboard.type('a', { delay: 30 });
    const opcao = page.locator('#fc-principal').locator('xpath=../..//ul//button').first();
    await opcao.waitFor({ state: 'visible', timeout: 30000 });
    await opcao.click();
    await page.getByRole('button', { name: 'Criar' }).click();
    await page.waitForURL(/\/painel\/correspondente\/[0-9a-f-]{36}/i, { timeout: 60000 }).catch(() => {});
    if (!/\/correspondente\/[0-9a-f-]{36}/i.test(page.url())) {
      await page.getByRole('button', { name: 'Ver' }).first().click();
      await page.waitForURL(/\/painel\/correspondente\/[0-9a-f-]{36}/i);
    }
    casoId = page.url().split('/').pop();
    await page.getByText('Caso de financiamento').first().waitFor({ state: 'visible' });
    const produtoVisivel = await page.getByText('Financiamento de construção').first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
    passo('caso manual criado com produto Construção', produtoVisivel, casoId);

    // coloca o caso em SUBMITTED (o envio real exige checklist/consentimento; aqui o foco é o resultado do banco)
    bancoApi(`await models.FinancingCase.update({ status: 'SUBMITTED' }, { where: { id: args.id }, transaction: t }); return true;`, { id: casoId });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Resultado do banco').first().waitFor({ state: 'visible' });
    passo('card Resultado do banco aparece em caso manual enviado', true);

    // ---------- Resultado do banco ----------
    await page.locator('#manual-status').selectOption('UNDER_ANALYSIS');
    await digitar(page, page.locator('#manual-note'), 'Falei com o gerente do banco');
    await page.getByRole('button', { name: 'Registrar resultado do banco' }).click();
    await page.getByText('Em análise').first().waitFor({ state: 'visible' });
    passo('registrar Em análise', true);

    await page.locator('#manual-status').selectOption('REJECTED');
    passo('recusa sem motivo bloqueia o botão', await page.getByRole('button', { name: 'Registrar resultado do banco' }).isDisabled());
    await page.locator('#manual-status').selectOption('APPROVED');
    await digitar(page, page.locator('#proposal-amount'), '250000,50');
    await digitar(page, page.locator('#proposal-rate'), '10,5');
    await page.locator('#proposal-term').fill('360');
    await digitar(page, page.locator('#proposal-payment'), '2300,55');
    await page.getByRole('button', { name: 'Registrar resultado do banco' }).click();
    await page.getByText('Vigente').first().waitFor({ state: 'visible' });
    const valorMostrado = await page.getByText('250.000,50').count();
    passo('aprovar com proposta: proposta vigente aparece na tabela', valorMostrado > 0);
    await shot(page, 'F20-proposta-vigente.png');

    await page.locator('#manual-status').selectOption('CONTRACTING');
    await digitar(page, page.locator('#proposal-amount'), '240000');
    await digitar(page, page.locator('#proposal-rate'), '10');
    await page.locator('#proposal-term').fill('300');
    await page.getByRole('button', { name: 'Registrar resultado do banco' }).click();
    await page.getByText('Substituída').first().waitFor({ state: 'visible' });
    passo('nova proposta substitui a anterior (histórico preservado)', true);
    await shot(page, 'F21-proposta-substituida.png');

    // ---------- Comissão ----------
    await page.locator('#commission-trigger').selectOption('CONTRATO_ASSINADO');
    await digitar(page, page.locator('#commission-base-amount'), '100000');
    await page.getByRole('button', { name: 'Registrar direito à comissão' }).click();
    await page.getByText('Prevista').first().waitFor({ state: 'visible' });
    const corpo = await page.locator('body').innerText();
    passo('comissão mostra provider, fato gerador e divisão', /Manual/.test(corpo) && /Contrato assinado/.test(corpo) && /60/.test(corpo));
    await page.getByRole('columnheader', { name: 'Corretor' }).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await shot(page, 'F22-comissao-divisao.png');
    await page.getByRole('button', { name: 'Confirmar' }).first().click();
    await digitar(page, page.locator('#commission-external-id'), `${marca}-conf`);
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click().catch(async () => {
      await page.locator('button:has-text("Confirmar")').last().click();
    });
    await page.getByText('A receber').first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Emitir NFS-e' }).first().click();
    await page.getByText('NFS-e solicitada').first().waitFor({ state: 'visible' });
    passo('confirmar comissão e emitir NFS-e pela ficha', true);

    // ---------- Fiscal ----------
    await page.waitForTimeout(1800);
    await page.goto(`${BASE_URL}/painel/correspondente/fiscal`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Notas fiscais de serviço').waitFor({ state: 'visible' });
    const consultar = page.getByRole('button', { name: 'Consultar status' }).first();
    await consultar.waitFor({ state: 'visible' });
    await consultar.click();
    await page.getByText('Status consultado').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'XML' }).first().waitFor({ state: 'visible' });
    const [dlXml] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'XML' }).first().click()]);
    const xmlPath = path.join(os.tmpdir(), `${marca}.xml`);
    await dlXml.saveAs(xmlPath);
    passo('XML da NFS-e baixa e é um XML válido', /<NFSe/.test(fs.readFileSync(xmlPath, 'utf8')), dlXml.suggestedFilename());
    const [dlPdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF' }).first().click()]);
    const pdfPath = path.join(os.tmpdir(), `${marca}.pdf`);
    await dlPdf.saveAs(pdfPath);
    passo('PDF da NFS-e baixa e é um PDF', fs.readFileSync(pdfPath).subarray(0, 4).toString() === '%PDF', dlPdf.suggestedFilename());
    passo('número oficial aparece na lista', (await page.getByText(/NFSE-/).count()) > 0);
    await shot(page, 'F23-nfse-xml-pdf.png');

    // Calendário
    await page.getByRole('tab', { name: 'Calendário' }).click();
    await page.getByRole('button', { name: 'Cadastrar obrigação' }).click();
    await digitar(page, page.locator('#obl-year'), String(OBLIGATION_YEAR));
    await page.getByRole('dialog').getByRole('button', { name: 'Cadastrar' }).click();
    await page.getByText('Obrigação cadastrada').waitFor({ state: 'visible' });
    const linhaObr = page.locator('tr', { hasText: String(OBLIGATION_YEAR) }).first();
    await linhaObr.waitFor({ state: 'visible' });
    passo('obrigação aparece no calendário com prazo e situação', /Faltam \d+ dia/.test(await linhaObr.innerText()), (await linhaObr.innerText()).replace(/\s+/g, ' '));
    await shot(page, 'F24-calendario-fiscal.png');
    await linhaObr.getByRole('button', { name: 'Concluir' }).click();
    await digitar(page, page.locator('#obl-note'), `${marca} entregue`);
    await page.getByRole('dialog').getByRole('button', { name: 'Concluir' }).click();
    await page.getByText('Obrigação concluída').waitFor({ state: 'visible' });
    passo('concluir obrigação com observação', true);

    // DIMOB registros
    await page.getByRole('tab', { name: 'DIMOB' }).click();
    await page.getByRole('button', { name: 'Gerar batch do ano' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gerar' }).click();
    await page.getByText('Batch DIMOB gerado').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Ver registros' }).first().click();
    await page.getByText('Total do batch').waitFor({ state: 'visible' });
    passo('DIMOB mostra os registros do batch', true);
    await shot(page, 'F25-dimob-registros.png');
    await page.keyboard.press('Escape');

    // Reconciliações
    await page.getByRole('tab', { name: 'Reconciliações' }).click();
    await page.getByRole('button', { name: 'Conferir agora' }).click();
    await page.getByText(/Conferência concluída/).waitFor({ state: 'visible' });
    passo('Conferir agora roda e informa o resultado', true, (await page.getByText(/Conferência concluída/).first().innerText()).trim());
    await shot(page, 'F26-conferencia-fiscal.png');

    // Exportação contábil
    await page.getByRole('tab', { name: 'Exportação contábil' }).click();
    await page.getByRole('button', { name: 'Ver lançamentos pendentes' }).click();
    await page.getByRole('button', { name: /Gerar batch com/ }).waitFor({ state: 'visible' });
    passo('exportação lista lançamentos pendentes do mês', true);
    await shot(page, 'F27-exportacao-pendentes.png');
    await page.getByRole('button', { name: /Gerar batch com/ }).click();
    await page.getByText('gerado para o contador').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Abrir' }).first().click();
    await page.getByText('Retorno do contador').first().waitFor({ state: 'visible' });
    const [dlCsv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar CSV para o contador' }).click()]);
    const csvPath = path.join(os.tmpdir(), `${marca}.csv`);
    await dlCsv.saveAs(csvPath);
    const csv = fs.readFileSync(csvPath, 'utf8');
    passo('CSV do batch traz o hash e as linhas', /^# hash;[0-9a-f]{64}/m.test(csv) && /COMMISSION_ENTITLEMENT/.test(csv));

    // ajuste
    await page.getByRole('button', { name: 'Ajustar' }).first().click();
    await digitar(page, page.locator('#adjust-delta'), '-5');
    await digitar(page, page.locator('#adjust-reason'), `${marca} ajuste`);
    await page.getByRole('button', { name: 'Registrar ajuste' }).click();
    await page.getByText('Ajuste registrado').waitFor({ state: 'visible' });
    const ajusteVisivel = await page.getByRole('cell', { name: 'Ajuste', exact: true }).first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
    passo('ajuste cria linha nova e mantém a original', ajusteVisivel && (await page.getByRole('cell', { name: 'Original', exact: true }).count()) > 0);
    await shot(page, 'F28-exportacao-ajuste.png');

    // retorno certo
    await page.locator('#return-file').setInputFiles(csvPath);
    await page.getByRole('button', { name: 'Importar retorno' }).click();
    await page.getByText(/Retorno do contador importado|Retorno importado com divergências/).first().waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('button[class*="loading"]'), null, { timeout: 60000 });
    // O ajuste de -5 já foi feito depois do CSV baixado: o retorno sem ele diverge de propósito.
    passo('retorno com valor diferente é marcado como divergente', (await page.getByText('Divergente').count()) > 0);
    await shot(page, 'F29-retorno-divergente.png');

    // hash errado
    const ruim = path.join(os.tmpdir(), `${marca}-ruim.csv`);
    fs.writeFileSync(ruim, csv.replace(/^# hash;[0-9a-f]{64}/m, `# hash;${'a'.repeat(64)}`));
    await page.locator('#return-file').setInputFiles(ruim);
    await page.getByRole('button', { name: 'Importar retorno' }).click();
    await page.getByText(/não confere com o do batch/).first().waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('button[class*="loading"]'), null, { timeout: 60000 });
    passo('retorno com hash errado é recusado com mensagem clara', true);
    await shot(page, 'F30-retorno-hash-errado.png');
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: 'Reconciliações' }).click();
    passo('divergência do retorno aparece em Reconciliações', (await page.getByText('Retorno do contador × Exportação').count()) > 0);

    // ---------- Cancelar caso ----------
    await page.goto(`${BASE_URL}/painel/correspondente/${casoId}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Cancelar este caso' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Cancelar este caso' }).click();
    const botao = page.getByRole('dialog').getByRole('button', { name: 'Cancelar caso' });
    passo('cancelar sem motivo mantém o botão desabilitado', await botao.isDisabled());
    await digitar(page, page.locator('#cancel-reason'), `${marca} cliente desistiu`);
    await botao.click();
    await page.getByText('Caso cancelado').first().waitFor({ state: 'visible' });
    passo('caso cancelado mostra o aviso e o motivo', (await page.getByText(/Motivo: .*cliente desistiu/).count()) > 0);
    await shot(page, 'F31-caso-cancelado.png');
    passo('depois de cancelado não oferece mais resultado do banco', (await page.locator('#manual-status').count()) === 0);
  } catch (err) {
    passo('interrupção', false, String(err.message).slice(0, 500));
    await page.screenshot({ path: '/tmp/e2e-lacunas-falha.png', fullPage: false }).catch(() => {});
    console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2500));
  } finally {
    // devolve a divisão original e remove o que o teste criou
    try {
      await page.goto(`${BASE_URL}/painel/correspondente/parametros`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('tab', { name: 'Comissão' }).click();
      await page.locator('#co-broker-manual').waitFor({ state: 'visible' });
      await digitar(page, page.locator('#co-broker-manual'), parametrosOriginais.broker || '100');
      await digitar(page, page.locator('#co-reason'), `${marca} restaura a divisão original`);
      await page.getByRole('button', { name: 'Salvar comissão' }).click();
      await page.getByText('Comissão atualizada').waitFor({ state: 'visible' });
      passo('divisão original restaurada', true, parametrosOriginais.broker);
    } catch (err) {
      passo('divisão original restaurada', false, String(err.message).slice(0, 200));
    }
    await browser.close().catch(() => {});
    try {
      bancoApi(
        `
        const q = (sql, r) => models.sequelize.query(sql, { replacements: r, transaction: t });
        const start = args.start;
        const nfse = require('./src/features/correspondent/fiscal/nfse.service');
        const commissions = require('./src/features/correspondent/cases/commissionEntitlements.service');
        await q('DELETE FROM correspondent.accounting_return_imports WHERE imported_at >= :start', { start });
        await q("DELETE FROM correspondent.fiscal_reconciliations WHERE reconciliation_type = 'ACCOUNTING_RETURN_X_EXPORT' AND created_at >= :start", { start });
        await q('DELETE FROM correspondent.accounting_export_lines WHERE created_at >= :start', { start });
        await q('DELETE FROM correspondent.accounting_export_batches WHERE created_at >= :start', { start });
        await q('DELETE FROM correspondent.fiscal_obligations WHERE reference_year = :year OR (created_at >= :start)', { year: args.year, start });
        await q('DELETE FROM correspondent.dimob_records WHERE created_at >= :start', { start });
        await q('DELETE FROM correspondent.dimob_batches WHERE created_at >= :start', { start });
        // Comissões e notas dos casos de teste (produto Construção, só estes testes usam): cancela a nota e estorna a comissão.
        const cases = await models.FinancingCase.findAll({ where: { product: 'CONSTRUCAO', providerCode: 'manual' }, transaction: t });
        for (const c of cases) {
          const ents = await models.CommissionEntitlement.findAll({ where: { financingCaseId: c.id }, transaction: t });
          for (const e of ents) {
            if (e.status === 'ADJUSTED') continue;
            const invs = await models.InvoiceRequest.findAll({ where: { sourceType: 'COMMISSION_ENTITLEMENT', sourceId: e.id }, transaction: t });
            for (const inv of invs) {
              if (inv.status === 'AUTHORIZED') await nfse.cancelInvoice(inv.id, 'Limpeza do teste automatizado', tenant.userId, tenant.groupId, tenant.companyId, t);
            }
            await commissions.chargebackCommissionEntitlement(e.id, 'Limpeza do teste automatizado', tenant.userId, tenant.groupId, tenant.companyId, t);
            await q("DELETE FROM correspondent.fiscal_reconciliations WHERE reference_id = :id AND status = 'OPEN' AND reconciliation_type IN ('COMMISSION_X_FISCAL','FINANCE_X_NFSE')", { id: e.id });
          }
        }
        return true;`,
        { start: inicio.toISOString(), year: OBLIGATION_YEAR }
      );
      passo('dados de teste limpos (exportação, obrigação, DIMOB, comissões estornadas e notas canceladas)', true);
    } catch (err) {
      passo('limpeza dos dados de teste', false, String(err.message).slice(0, 300));
    }
  }

  const falhas = passos.filter((p) => !p.ok);
  console.log(`\n${passos.length - falhas.length}/${passos.length} passos ok.`);
  process.exitCode = falhas.length ? 1 : 0;
}

main();
