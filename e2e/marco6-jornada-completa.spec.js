'use strict';

/**
 * E2E real (Playwright, navegador de verdade) da jornada completa de uma obra — Marco 6, refeito na verificação
 * independente (M6-51/M6-98): o spec anterior gravava "OK" incondicional em 8 dos 11 passos e não conferia nada. Agora
 * TODO passo termina num expect(): se a tela não mostrar o resultado esperado, o passo falha e o processo sai com 1.
 *
 * Jornada (Caderno §1 e Guia: obra → orçamento → material → diário → medição → pagamento → qualidade → entrega):
 *   1. login
 *   2. configuração: tipo de obra com checklist por etapa (Caderno §9) e evidência mínima da medição (Guia §6)
 *   3. obra do tipo, com responsável e prazo
 *   4. etapa com código e responsável (Caderno §2)
 *   5. orçamento: linha, margem mínima e aprovação (baseline congelada)
 *   6. material: requisição da etapa e recebimento do estoque
 *   7. obra em execução (Pronta → Em execução) e diário (RDO)
 *   8. medição com evidência: enviar, revisar, aprovar (a aprovação confere a evidência)
 *   9. conta a pagar criada pelo consumidor do Financeiro (measurement.approved), no valor da medição e com a obra;
 *      a baixa pede a aprovação de outra pessoa e MFA recente — o spec captura essas exigências (regra do projeto: o
 *      caminho feliz do MFA é do operador humano; a baixa parcial e a quitação estão provadas no teste de API
 *      test/construction.e2e.test.js)
 *  10. qualidade: checklist do tipo de obra gerado na etapa, itens aprovados
 *  11. inspeção final e entrega da obra (gate) → "Em garantia"
 *
 * Pré-condições criadas pela API (cadastro de apoio de outros módulos, não é a jornada de Obras): item de estoque com
 * saldo e local, e um imóvel. Sem senha no arquivo: E2E_EMAIL e E2E_PASSWORD vêm do ambiente (falha sem eles).
 * Uso: E2E_BASE_URL=http://localhost:44902 E2E_API_URL=http://localhost:44901/api/v1 E2E_EMAIL=... E2E_PASSWORD=... \
 *      node e2e/marco6-jornada-completa.spec.js     (só contra API em banco descartável)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect, step, report, apiClient, login, fixtureJpeg } = require('./_m6-expect');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário do banco descartável) — o spec não guarda senha.');
  const s = Date.now();
  const api = await apiClient(EMAIL, PASSWORD);
  const item = await api('POST', '/inventory/items', { sku: `E2E-M6-${s}`, name: `Cimento E2E ${s}`, unitOfMeasure: 'SC', itemType: 'CONSUMABLE' });
  const local = await api('POST', '/inventory/locations', { name: `Almoxarifado E2E ${s}`, locationType: 'WAREHOUSE' });
  await api('POST', '/inventory/movements', { inventoryItemId: item.id, movementType: 'IN', quantity: 100, destinationLocationId: local.id, unitCost: 30 });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);
  const tipo = `Casa E2E ${s}`;
  const obra = `E2E Marco6 Obra ${s}`;
  let projectUrl;
  try {
    await step('1. login', async () => {
      await login(page, BASE_URL, EMAIL, PASSWORD);
      expect(new URL(page.url()).pathname).not.toContain('/entrar');
    });

    await step('2. configuração: tipo de obra, checklist da etapa FUND e evidência mínima = 1', async () => {
      await page.goto(`${BASE_URL}/painel/obras/configuracoes`, { waitUntil: 'domcontentloaded' });
      await page.fill('#tipo-code', `CASA${s}`.slice(0, 40));
      await page.fill('#tipo-name', tipo);
      await page.click('button:has-text("Cadastrar tipo de obra")');
      await expect.visible(page.getByText('Tipo de obra cadastrado.'));
      await page.fill('#item-stage', 'FUND');
      await page.fill('#item-text', 'Prumo das sapatas');
      await page.selectOption('#item-severity', 'HIGH');
      await page.click('button:has-text("Incluir item no checklist")');
      await expect.visible(page.getByRole('cell', { name: 'Prumo das sapatas' }));
      await page.fill('#param-min-evidence', '1');
      await page.click('button:has-text("Salvar parâmetros")');
      await expect.visible(page.getByText('Parâmetros de Obras salvos e registrados na auditoria.'));
    });

    await step('3. obra do tipo, com responsável e prazo', async () => {
      await page.goto(`${BASE_URL}/painel/obras/lista/novo`, { waitUntil: 'domcontentloaded' });
      await page.fill('#f-name', obra);
      await page.locator('#f-project-type option', { hasText: tipo }).waitFor({ state: 'attached' });
      await page.selectOption('#f-project-type', { label: tipo });
      const resp = await page.locator('#f-responsible option').nth(1).getAttribute('value');
      await page.selectOption('#f-responsible', resp);
      await page.fill('#f-starts', '2026-11-01');
      await page.fill('#f-ends', '2027-06-30');
      await page.click('button:has-text("Criar obra")');
      await page.waitForURL(new RegExp(`/painel/obras/lista/${UUID}$`));
      projectUrl = page.url();
      await expect.visible(page.getByText(tipo, { exact: true }));
    });

    await step('4. etapa FUND com responsável (Caderno §2)', async () => {
      await page.click('button:has-text("Nova etapa")');
      await page.fill('#m-stage-name', 'Fundação');
      await page.fill('#m-stage-code', 'FUND');
      const resp = await page.locator('#m-stage-responsible option').nth(1).getAttribute('value');
      await page.selectOption('#m-stage-responsible', resp);
      await page.fill('#m-stage-cost', '10000');
      await page.fill('#m-stage-start', '2026-11-01');
      await page.fill('#m-stage-end', '2027-01-31');
      await page.click('button:has-text("Criar etapa")');
      await expect.visible(page.getByText(/1\. Fundação/));
      await expect.notVisible(page.getByText('Responsável: não definido'));
    });

    await step('5. orçamento: linha de R$ 10.000,00, margem mínima e aprovação (baseline congelada)', async () => {
      await page.goto(`${projectUrl}/orcamento`, { waitUntil: 'domcontentloaded' });
      await page.click('button:has-text("Nova linha de orçamento")');
      await page.fill('#m-budget-category', 'Fundação');
      await page.fill('#m-budget-planned', '10000');
      await page.click('button:has-text("Criar linha")');
      await expect.visible(page.getByText('Fundação').first());
      if (await page.locator('button:has-text("Configurar margem mínima")').count()) {
        await page.click('button:has-text("Configurar margem mínima")');
        await page.fill('#m-margin-pct', '10');
        await page.click('button:has-text("Salvar")');
      }
      await page.click('button:has-text("Aprovar orçamento")');
      await page.click('button:has-text("Confirmar aprovação")');
      await expect.visible(page.getByText(/Baseline congelada em R\$\s?10\.000,00/));
    });

    await step('6. material: requisição da etapa e recebimento do estoque', async () => {
      await page.goto(`${projectUrl}/materiais`, { waitUntil: 'domcontentloaded' });
      await page.click('button:has-text("Nova requisição")');
      await page.fill('#m-material-description', 'Cimento CP-II');
      await page.fill('#m-material-quantity', '10');
      await page.fill('#m-material-unit', 'saco');
      await page.selectOption('#m-material-stage', { label: 'Fundação' });
      await page.click('button:has-text("Criar requisição")');
      await page.click('button:has-text("Marcar como recebido")');
      await page.selectOption('#m-receive-item', item.id);
      await page.selectOption('#m-receive-location', local.id);
      await page.click('button:has-text("Confirmar recebimento")');
      await expect.visible(page.getByText('Recebido', { exact: true }).first());
    });

    await step('7. obra em execução e diário (RDO)', async () => {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
      await page.click('button:has-text("Pronta para iniciar")');
      await expect.visible(page.locator('button:has-text("Em execução")'));
      await page.click('button:has-text("Em execução")');
      await expect.visible(page.locator('button:has-text("Inspeção final")'));
      await page.goto(`${projectUrl}/diario`, { waitUntil: 'domcontentloaded' });
      await page.click('button:has-text("Novo RDO")');
      await page.fill('#m-rdo-date', '2026-11-10');
      await page.selectOption('#m-rdo-weather', { index: 1 }).catch(() => page.selectOption('#m-rdo-weather', { index: 0 }));
      await page.fill('#m-rdo-workforce', '8');
      await page.click('button:has-text("Registrar RDO")');
      await expect.visible(page.getByText('Efetivo: 8').first());
    });

    let medicaoUrl;
    await step('8. medição com evidência: registrar, enviar, revisar e aprovar', async () => {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
      await page.click('text=1. Fundação');
      await page.waitForURL(new RegExp(`/etapas/${UUID}$`));
      medicaoUrl = page.url();
      await page.click('button:has-text("Registrar medição")');
      await page.fill('#m-meas-pct', '100');
      await page.fill('#m-meas-total', '9500');
      await page.setInputFiles('#m-meas-evidence', fixtureJpeg(path.join(os.tmpdir(), `medicao-${s}.jpg`), s));
      await expect.visible(page.getByText(`medicao-${s}.jpg`));
      await page.click('button:has-text("Registrar medição") >> nth=-1');
      await expect.visible(page.getByText('1 evidência(s)').first());
      await page.click('button:has-text("Enviar para revisão")');
      await page.click('button:has-text("Marcar como revisada")');
      await page.click('button:has-text("Aprovar") >> nth=0');
      await page.getByRole('dialog').getByRole('button', { name: 'Aprovar' }).click();
      await expect.visible(page.getByText(/Aprovada por/));
    });

    await step('9. conta a pagar pelo consumidor do Financeiro; a baixa exige aprovação de outra pessoa e MFA', async () => {
      const projectId = projectUrl.split('/').pop();
      const health = await api('GET', `/construction/projects/${projectId}/health`);
      expect(health.kpis.payablePendingTotal).toBe(9500);
      const entries = await api('GET', '/finance/entries?nature=PAYABLE');
      const conta = (entries.data || entries).find((e) => e.constructionProjectId === projectId);
      expect(Boolean(conta && conta.sourceEventId)).toBe(true);
      expect(Number(conta.amount)).toBe(9500);
      await page.goto(`${BASE_URL}/painel/financeiro/lancamentos/${conta.id}`, { waitUntil: 'domcontentloaded' });
      await expect.visible(page.getByText(/9\.500,00/).first());
      await page.click('button:has-text("Solicitar aprovação")');
      await page.getByRole('dialog').getByRole('button', { name: 'Solicitar aprovação' }).click();
      await expect.visible(page.getByText(/Aprovação solicitada/));
    });

    await step('10. qualidade: checklist do tipo de obra gerado na etapa e aprovado', async () => {
      await page.goto(`${projectUrl}/qualidade`, { waitUntil: 'domcontentloaded' });
      await expect.visible(page.getByText('Prumo das sapatas'));
      await expect.visible(page.getByText(/do checklist do tipo de obra · etapa Fundação/));
      await page.getByRole('button', { name: 'OK', exact: true }).first().click();
      await expect.visible(page.getByText(/Verificado por/).first());
    });

    await step('11. inspeção final e entrega da obra (gate) → Em garantia', async () => {
      await page.goto(projectUrl, { waitUntil: 'domcontentloaded' });
      await page.click('button:has-text("Inspeção final")');
      await expect.visible(page.locator('button:has-text("Entregar obra")'));
      await page.click('button:has-text("Entregar obra")');
      await expect.visible(page.getByText('Em garantia', { exact: true }).first());
    });
  } catch (err) {
    const shot = process.env.E2E_SHOTS_DIR ? path.join(process.env.E2E_SHOTS_DIR, `m6-jornada-falha-${s}.png`) : null;
    if (shot) await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const alerts = await page.locator('[role=alert]').allInnerTexts().catch(() => []);
    if (alerts.length) console.log(`Alertas na tela: ${alerts.join(' | ')}`);
    throw err;
  } finally {
    await browser.close();
    fs.rmSync(path.join(os.tmpdir(), `medicao-${s}.jpg`), { force: true });
  }
  report();
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exitCode = 1;
});
