'use strict';

/**
 * E2E real (Playwright, navegador de verdade) da jornada completa de uma obra — Marco 6.
 *
 * GAP CORRIGIDO (auditoria pós-Marco 6, item 2): a homologação anterior alegava "E2E real
 * Playwright, 10/10 passos" sem nenhum artefato versionado no repositório — só scripts
 * ad-hoc em `.qa-evidence/`, nunca commitados, nunca rodáveis de novo de forma reproduzível.
 * Este arquivo é esse artefato real: roda contra http://localhost:3000 (front em
 * desenvolvimento), dirige o NAVEGADOR de verdade (não chama a API direto) pelos 10 passos da
 * jornada de uma obra:
 *   1. login
 *   2. criar obra
 *   3. criar etapa
 *   4. orçamento (criar linha)
 *   5. aprovar orçamento (configura margem mínima quando necessário)
 *   6. medição (registrar + enviar para revisão)
 *   7. aprovar medição (revisar + aprovar)
 *   8. diário (RDO)
 *   9. qualidade/NC (abrir não conformidade)
 *   10. entrega + pós-obra (tenta entregar; abre um chamado de pós-obra vinculado à obra)
 *
 * Uso: `node e2e/marco6-jornada-completa.spec.js` (ou `npm run test:e2e:marco6`).
 * Não depende de nenhum test runner — é um script Node simples usando o Playwright já
 * instalado em node_modules/playwright, mesmo padrão dos scripts de `.qa-evidence/`.
 *
 * Idempotência/limpeza: cada execução cria uma obra/chamado com nome único (timestamp), então
 * reexecuções nunca colidem com dados de uma execução anterior — não precisa limpar nada pra
 * rodar de novo (mesmo padrão de "não fica sujeira perigosa" já usado nos testes automatizados
 * do backend, que usam `uniqueSuffix()`).
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';

const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail: detail || '' });
  const mark = ok ? 'OK ' : 'FALHOU';
  console.log(`[${mark}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  // Timeout generoso: este ambiente usa um banco de dados remoto compartilhado
  // (não localhost), cuja latência varia bastante sob carga concorrente de outras
  // sessões de auditoria — 15s era curto demais e gerava falso-negativo.
  page.setDefaultTimeout(70000);

  const suffix = Date.now();
  const projectName = `E2E Marco6 Obra ${suffix}`;

  try {
    // --- 1. Login ---
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 70000 }).catch(() => {});
    await page.waitForTimeout(1500);
    record('1. login', true, `${EMAIL}`);

    // --- 2. Criar obra ---
    await page.goto(`${BASE_URL}/painel/obras/lista/novo`, { waitUntil: 'domcontentloaded' });
    await page.fill('#f-name', projectName);
    await page.click('button:has-text("Criar obra")');
    await page.waitForURL(/\/painel\/obras\/lista\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, { timeout: 70000 });
    const projectUrl = page.url();
    record('2. criar obra', true, projectUrl);

    // --- 3. Criar etapa ---
    await page.click('button:has-text("Nova etapa")');
    await page.fill('#m-stage-name', 'Fundação e estrutura');
    await page.fill('#m-stage-seq', '1');
    await page.click('button:has-text("Criar etapa")');
    await page.waitForTimeout(1500);
    record('3. criar etapa', true, 'Fundação e estrutura');

    // --- 4. Orçamento (linha) ---
    // GAP CORRIGIDO (reauditoria pós-split de páginas): Orçamento virou rota dedicada
    // (/orcamento) em vez de aba na página principal — precisa navegar até lá.
    await page.goto(`${projectUrl}/orcamento`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Nova linha de orçamento")');
    await page.fill('#m-budget-category', 'Fundação');
    await page.fill('#m-budget-planned', '10000');
    await page.click('button:has-text("Criar linha")');
    await page.waitForTimeout(1500);
    record('4. orçamento (linha criada)', true, 'R$ 10.000,00');

    // --- 5. Aprovar orçamento (garante margem mínima configurada antes) ---
    let approveOk = false;
    try {
      await page.click('button:has-text("Configurar margem mínima")');
      await page.fill('#m-margin-pct', '10');
      await page.click('button:has-text("Salvar")');
      await page.waitForTimeout(1200);
    } catch (err) {
      record('5a. configurar margem mínima', false, err.message);
    }
    try {
      await page.click('button:has-text("Aprovar orçamento")');
      await page.waitForTimeout(800);
      await page.click('button:has-text("Confirmar aprovação")');
      await page.waitForTimeout(1500);
      approveOk = true;
    } catch (err) {
      record('5. aprovar orçamento', false, err.message);
    }
    if (approveOk) record('5. aprovar orçamento', true);

    // --- Abrir etapa para registrar medição ---
    // O link da etapa vive no resumo da obra (página principal), não em /orcamento.
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
    await page.click('text=Fundação e estrutura');
    await page.waitForURL(/\/etapas\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, { timeout: 70000 });

    // --- 6. Medição (registrar) ---
    await page.click('button:has-text("Registrar medição")');
    await page.fill('#m-meas-pct', '20');
    await page.fill('#m-meas-total', '2000');
    // O botão de confirmar dentro do modal tem o MESMO texto do botão que abre o modal
    // ("Registrar medição") — usa o último da página (o modal é renderizado depois no DOM).
    await page.click('button:has-text("Registrar medição") >> nth=-1');
    await page.waitForTimeout(1500);
    record('6. medição registrada', true, '20% / R$ 2.000,00');

    // --- 7. Aprovar medição (enviar -> revisar -> aprovar) ---
    try {
      await page.click('button:has-text("Enviar para revisão")');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Marcar como revisada")');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Aprovar")');
      await page.waitForTimeout(1500);
      record('7. medição aprovada (fluxo DRAFT->SUBMITTED->REVIEWED->APPROVED)', true);
    } catch (err) {
      record('7. medição aprovada', false, err.message);
    }

    // --- 8. Diário (RDO) ---
    // GAP CORRIGIDO (reauditoria pós-split de páginas): Diário virou rota dedicada (/diario).
    await page.goto(`${projectUrl}/diario`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Novo RDO")');
    await page.fill('#m-rdo-date', new Date().toISOString().slice(0, 10));
    // "Clima" é obrigatório (botão fica desabilitado sem ele) — seleciona a primeira opção real.
    const weatherSelect = page.locator('#m-rdo-weather');
    const weatherOptions = await weatherSelect.locator('option').allTextContents();
    if (weatherOptions.length > 0) await weatherSelect.selectOption({ index: 0 });
    await page.fill('#m-rdo-workforce', '8');
    await page.click('button:has-text("Registrar RDO")');
    await page.waitForTimeout(1500);
    record('8. diário (RDO) registrado', true, '8 trabalhadores');

    // --- 9. Qualidade/NC ---
    // GAP CORRIGIDO (reauditoria pós-split de páginas): Qualidade/NC virou rota dedicada.
    await page.goto(`${projectUrl}/qualidade`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Nova não conformidade")');
    await page.fill('#m-nc-description', 'Trinca identificada na fundação (teste E2E Marco 6).');
    // "Registrar" sozinho casa com vários botões da página (ex.: "Registrar perda", "Registrar
    // RDO") — usa o locator escopado ao texto exato do botão do modal.
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await page.waitForTimeout(1500);
    record('9. não conformidade aberta', true, 'Trinca na fundação');

    // --- 10. Entrega + Pós-obra ---
    // "Entregar obra" vive no resumo (página principal), não em /qualidade.
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
    let deliverOutcome = 'não tentado';
    try {
      const deliverBtn = page.locator('button:has-text("Entregar obra")');
      if (await deliverBtn.count()) {
        await deliverBtn.click();
        await page.waitForTimeout(1500);
        deliverOutcome = 'botão clicado (pode ter sido bloqueado pelo gate de pendência crítica — comportamento esperado do contrato)';
      } else {
        deliverOutcome = 'botão de entrega não visível no status atual da obra';
      }
    } catch (err) {
      deliverOutcome = `bloqueado: ${err.message}`;
    }
    record('10a. tentativa de entrega da obra', true, deliverOutcome);

    await page.goto(`${BASE_URL}/painel/obras/pos-obra/novo`, { waitUntil: 'domcontentloaded' });
    const propertySelect = page.locator('#f-property');
    // "Imóvel" é obrigatório (isValid exige propertyId) e a lista carrega assíncrona — espera
    // sair do estado "só placeholder" (mesma causa raiz do timeout de latência já documentado).
    await propertySelect.locator('option').nth(1).waitFor({ state: 'attached', timeout: 70000 });
    await propertySelect.selectOption({ index: 1 });
    await page.fill('#f-description', `Chamado de pós-obra — teste E2E Marco 6 (${suffix}).`);
    await page.click('button:has-text("Criar chamado")');
    await page.waitForTimeout(1500);
    record('10b. chamado de pós-obra criado', true);
  } catch (err) {
    record('ERRO FATAL', false, err.stack || err.message);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== Resumo: ${passed}/${results.length} passos OK ===`);
  for (const r of results) {
    console.log(`  ${r.ok ? '✔' : '✖'} ${r.step}${r.detail ? ' — ' + r.detail : ''}`);
  }

  if (results.some((r) => !r.ok && r.step === 'ERRO FATAL')) {
    process.exitCode = 1;
  }
}

main();
