'use strict';

/**
 * E2E (Playwright) das lacunas da revisão de 24/10/2026: revisão de duplicata, erros de integração,
 * resumo da NAY, prazo da NFS-e em Parâmetros e arquivo do DIMOB. Escrito para rodar com
 * `node e2e/marco8-lacunas-revisao.spec.js` (não executado na entrega). Os dados de preparo e a
 * limpeza são feitos pelo banco da API; tudo leva a marca QA-M8-REV.
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

const passos = [];
function passo(nome, ok, detalhe) {
  passos.push({ nome, ok: Boolean(ok) });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}

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
  await page.screenshot({ path: path.join(PRINTS, nome) });
}

async function digitar(page, locator, valor) {
  await locator.click();
  await locator.fill('');
  await page.keyboard.type(valor, { delay: 15 });
}

async function main() {
  const marca = `QA-M8-REV-${Date.now()}`;
  const browser = await chromium.launch({ headless: true, args: ['--lang=pt-BR'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true, locale: 'pt-BR' });
  page.setDefaultTimeout(60000);
  let preparo = null;

  try {
    // Preparo: um proponente com dois casos (o segundo vira possível duplicata) e um erro de integração aberto.
    preparo = bancoApi(`
      const { createFinancingCase } = require('./src/features/correspondent/cases/financingCases.service');
      const { recordIntegrationError } = require('./src/features/correspondent/integrationErrors.service');
      const p = await models.Person.create({ groupId: tenant.groupId, companyId: tenant.companyId, personType: 'PF', legalName: args.marca + ' Proponente', createdBy: tenant.userId, updatedBy: tenant.userId }, { transaction: t });
      const mk = () => createFinancingCase({ groupId: tenant.groupId, companyId: tenant.companyId, providerCode: 'manual', applicants: [{ personId: p.id, role: 'PRINCIPAL' }] }, tenant.userId, t);
      const primeiro = await mk();
      const segundo = await mk();
      const erro = await recordIntegrationError({ groupId: tenant.groupId, companyId: tenant.companyId, financingCaseId: primeiro.id, providerCode: 'sandbox', operation: 'submit', errorCode: 'QA_M8_REV', message: args.marca + ' falha simulada no envio' }, t);
      return { personId: p.id, primeiro: primeiro.id, segundo: segundo.id, erro: erro.id };
    `, { marca });

    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const equipe = page.getByText('Sou da equipe', { exact: false });
    if (await equipe.count()) await equipe.first().click();
    await page.waitForSelector('input[type=email]');
    await digitar(page, page.locator('input[type=email]'), EMAIL);
    await digitar(page, page.locator('input[type=password]'), PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 60000 });
    passo('login pela tela', true);

    // Duplicata: lista mostra o caso e a ficha permite decidir
    await page.goto(`${BASE_URL}/painel/correspondente`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Possíveis duplicatas para revisar').waitFor({ state: 'visible' });
    passo('lista mostra o card de possíveis duplicatas', (await page.getByText(marca).count()) > 0);
    await shot(page, 'F32-duplicatas-lista.png');
    await page.goto(`${BASE_URL}/painel/correspondente/${preparo.segundo}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Possível duplicata aguardando revisão').waitFor({ state: 'visible' });
    await shot(page, 'F33-duplicata-ficha.png');
    await page.getByRole('button', { name: 'Revisar' }).click();
    passo('registrar decisão sem observação fica desabilitado', await page.getByRole('button', { name: 'Registrar decisão' }).isDisabled());
    await page.locator('#dup-decision').selectOption('CONFIRM');
    await digitar(page, page.locator('#dup-note'), `${marca} mesma operação digitada duas vezes`);
    await page.getByRole('button', { name: 'Registrar decisão' }).click();
    await page.getByText('Caso cancelado').first().waitFor({ state: 'visible' });
    passo('confirmar duplicata cancela o caso novo com motivo', (await page.getByText(/Duplicata do caso/).count()) > 0);
    await shot(page, 'F34-duplicata-confirmada.png');

    // NAY: resumo no caso original
    await page.goto(`${BASE_URL}/painel/correspondente/${preparo.primeiro}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Gerar resumo' }).click();
    await page.getByText('Próximos passos sugeridos').waitFor({ state: 'visible' });
    const corpo = await page.locator('body').innerText();
    passo('resumo da NAY mostra situação, documentos e o aviso de que não decide', /Situação:/.test(corpo) && /Documentos:/.test(corpo) && /não aprova crédito/.test(corpo));
    await shot(page, 'F35-nay-resumo.png');

    // Erros de integração
    await page.goto(`${BASE_URL}/painel/correspondente`, { waitUntil: 'domcontentloaded' });
    const menu = page.locator('a[href="/painel/correspondente/erros"]').first();
    await menu.waitFor({ state: 'visible' });
    await menu.click();
    await page.waitForURL(/\/correspondente\/erros/);
    await page.getByText(`${marca} falha simulada`).waitFor({ state: 'visible' });
    passo('erro de integração aparece em aberto, com operação em português', (await page.getByText('Envio do caso').count()) > 0);
    await shot(page, 'F36-erros-integracao.png');
    await page.locator('tr', { hasText: marca }).getByRole('button', { name: 'Dar baixa' }).click();
    passo('dar baixa sem observação fica desabilitado', await page.getByRole('button', { name: 'Marcar como resolvido' }).isDisabled());
    await digitar(page, page.locator('#err-note'), `${marca} provider voltou`);
    await page.getByRole('button', { name: 'Marcar como resolvido' }).click();
    await page.getByText('Erro marcado como resolvido').waitFor({ state: 'visible' });
    await page.locator('#err-filter').selectOption('RESOLVED');
    await page.getByText(`${marca} provider voltou`).waitFor({ state: 'visible' });
    passo('erro resolvido aparece no filtro Resolvidos com a observação', true);

    // Parâmetros: prazo da NFS-e
    await page.goto(`${BASE_URL}/painel/correspondente/parametros`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Comissão' }).click();
    await page.locator('#co-grace').waitFor({ state: 'visible' });
    const original = await page.locator('#co-grace').inputValue();
    await digitar(page, page.locator('#co-grace'), '9');
    await digitar(page, page.locator('#co-reason'), `${marca} prazo da nota`);
    await page.getByRole('button', { name: 'Salvar comissão' }).click();
    await page.getByText('Comissão atualizada').waitFor({ state: 'visible' });
    passo('prazo da NFS-e salvo em Parâmetros', true, `era ${original}`);
    await shot(page, 'F37-parametros-prazo-nota.png');
    await page.getByRole('tab', { name: 'Comissão' }).click();
    await digitar(page, page.locator('#co-grace'), original || '5');
    await digitar(page, page.locator('#co-reason'), `${marca} restaura o prazo`);
    await page.getByRole('button', { name: 'Salvar comissão' }).click();
    await page.getByText('Comissão atualizada').waitFor({ state: 'visible' });
    passo('prazo original restaurado', true);

    // DIMOB: arquivo de conferência
    await page.goto(`${BASE_URL}/painel/correspondente/fiscal`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'DIMOB' }).click();
    await page.getByRole('button', { name: 'Gerar batch do ano' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gerar' }).click();
    await page.getByText('Batch DIMOB gerado').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Ver registros' }).first().click();
    await page.getByText('Total do batch').waitFor({ state: 'visible' });
    passo('registros do DIMOB mostram origem, cadastro e pendências', (await page.getByRole('columnheader', { name: 'Pendências' }).count()) > 0);
    await shot(page, 'F38-dimob-pendencias.png');
    await page.keyboard.press('Escape');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar arquivo' }).first().click()]);
    const destino = path.join(os.tmpdir(), `${marca}.csv`);
    await dl.saveAs(destino);
    const csv = fs.readFileSync(destino, 'utf8');
    passo('arquivo do DIMOB traz layout e hash', /^# layout;DIMOB-2026-v1/.test(csv) && /hash;[0-9a-f]{64}/.test(csv), dl.suggestedFilename());
  } catch (err) {
    passo('interrupção', false, String(err.message).slice(0, 500));
    await page.screenshot({ path: '/tmp/e2e-lacunas-revisao-falha.png' }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
    try {
      bancoApi(`
        const q = (sql, r) => models.sequelize.query(sql, { replacements: r, transaction: t });
        await q("DELETE FROM correspondent.integration_errors WHERE error_code = 'QA_M8_REV'", {});
        await q('DELETE FROM correspondent.dimob_records WHERE created_at >= :start', { start: args.start });
        await q('DELETE FROM correspondent.dimob_batches WHERE created_at >= :start', { start: args.start });
        await q('DELETE FROM correspondent.fiscal_obligations WHERE created_at >= :start', { start: args.start });
        return true;`, { start: new Date(Date.now() - 30 * 60 * 1000).toISOString() });
      passo('dados de teste removidos (erro, DIMOB e obrigação); os casos QA-M8-REV ficam cancelados/rascunho', true);
    } catch (err) {
      passo('limpeza dos dados de teste', false, String(err.message).slice(0, 300));
    }
  }

  const falhas = passos.filter((p) => !p.ok);
  console.log(`\n${passos.length - falhas.length}/${passos.length} passos ok.`);
  process.exitCode = falhas.length ? 1 : 0;
}

main();
