'use strict';

const { requireE2ePassword } = require('./_e2e-env');

/**
 * E2E real (Playwright) — campo "Valor previsto (R$)" no formulário de etapa (Marco 6, M6-R03).
 *
 * CONFIRMAÇÃO (análise formal pós-manifestação da auditora, 13/10/2026): a auditora pediu
 * confirmação expressa se `plannedCost` está no formulário de CRIAÇÃO/edição de etapa (não
 * só numa tela comparativa). Já estava (commit `3ce8d7b`) — este script prova criando uma
 * etapa de verdade com o campo preenchido e confirmando que persiste e é exibido depois.
 *
 * Atualizado em 17/11/2026: a obra é criada pelo spec, aberta pelo botão "Ver detalhes" da lista (a lista não tem link desde 31/10), o login
 * espera a hidratação e a persistência é conferida reabrindo a etapa depois de recarregar a página.
 *
 * Uso: `node e2e/marco6-valor-previsto-etapa.spec.js`.
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = requireE2ePassword();

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail: detail || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);

  try {
    // Sob o `next dev` o primeiro clique em "Sou da equipe" pode cair antes da hidratação e não trocar a aba: tenta de novo até o campo
    // aparecer (mesma correção do marco3-merge-pessoa-correta).
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
    for (let i = 0; i < 20 && !(await page.locator('input[type=email]').count()); i += 1) {
      const teamTab = page.getByText('Sou da equipe', { exact: false });
      if (await teamTab.count()) await teamTab.first().click().catch(() => {});
      await page.waitForTimeout(1000);
    }
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL(/\/painel/, { timeout: 70000 });
    record('Login', true);

    // A obra é criada pelo próprio spec (o banco descartável não traz obra; antes o spec abria "a primeira" do banco de dev).
    const suffix = Date.now();
    const obra = `Obra E2E valor previsto ${suffix}`;
    await page.goto(`${BASE_URL}/painel/obras/lista/novo`, { waitUntil: 'domcontentloaded' });
    await page.fill('#f-name', obra);
    await page.fill('#f-starts', '2026-11-01');
    await page.fill('#f-ends', '2027-12-31');
    await page.getByRole('button', { name: 'Criar obra' }).click();
    await page.waitForURL(/\/painel\/obras\/lista\/[0-9a-f-]{36}$/, { timeout: 70000 });
    const projectUrl = page.url();
    record('Obra criada pela tela', true, obra);

    // A lista de Obras abre a obra pelos botões de ação da linha (router.push, desde 31/10), não por link: busca pelo nome e clica em "Ver detalhes".
    await page.goto(`${BASE_URL}/painel/obras/lista`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Buscar por nome ou imóvel...').fill(obra);
    const row = page.getByRole('row', { name: new RegExp(obra) });
    await row.getByRole('button', { name: 'Ver detalhes' }).click();
    await page.waitForURL(projectUrl, { timeout: 70000 });
    record('Abriu a obra pela lista de Obras', page.url() === projectUrl, page.url());

    const newStageBtn = page.getByRole('button', { name: /nova etapa/i });
    await newStageBtn.first().waitFor({ timeout: 70000 }).catch(() => {});
    if (!(await newStageBtn.count())) {
      record('Botão "Nova etapa" encontrado', false, 'não encontrado — verificar navegação/aba de etapas');
      throw new Error('botão nova etapa ausente');
    }
    await newStageBtn.first().click();
    await page.waitForSelector('#m-stage-cost', { timeout: 20000 });
    record('Campo "Valor previsto (R$)" presente no formulário de criação de etapa', true);

    const etapa = `Etapa E2E ${suffix}`;
    await page.fill('#m-stage-name', etapa);
    await page.fill('#m-stage-cost', '15000');
    const saveBtn = page.getByRole('button', { name: /criar etapa|salvar altera/i });
    // Segunda leva de 16/11/2026 (DI-BI2-3, M6:16 "Etapas possuem ... prazo"): sem o término previsto não dá para criar.
    const blockedWithoutEnd = await saveBtn.first().isDisabled();
    record('Sem o término previsto o botão "Criar etapa" fica desabilitado', blockedWithoutEnd);
    await page.fill('#m-stage-end', '2027-12-31');
    const enabledWithEnd = await saveBtn.first().isEnabled();
    record('Com o término previsto o botão habilita (custo, código e responsável seguem opcionais na criação)', enabledWithEnd);
    await saveBtn.first().click();
    await page.getByText(new RegExp(`\\d+\\. ${etapa}`)).first().waitFor({ timeout: 70000 });
    record('Etapa criada e listada na obra', true, etapa);

    // Persistência de verdade: recarrega a obra e reabre a etapa; o valor previsto volta do banco no formulário de edição.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: `Editar etapa ${etapa}` }).click();
    await page.waitForSelector('#m-stage-cost', { timeout: 20000 });
    const saved = (await page.inputValue('#m-stage-cost')).replace(/\s/g, '');
    const hasValue = /^15\.?000(,0{1,2})?$/.test(saved);
    record('Valor previsto gravado e exibido de novo ao reabrir a etapa', hasValue, hasValue ? saved : `campo veio "${saved}" em vez de 15000`);
  } catch (err) {
    record('Fluxo completo sem exceção', false, err.message);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos OK.`);
  if (failed.length) {
    console.log('FALHAS:', JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

main();
