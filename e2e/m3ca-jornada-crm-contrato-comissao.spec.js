"use strict";

/**
 * E2E real (Playwright, clicando na tela) da jornada do CRM do Marco 3 — M3-25 do contrato: "Jornada E2E lead, Radar, visita,
 * proposta, contrato, recebimento e comissão". Pilha DESCARTÁVEL (API e Front em portas 35xxx, banco descartável): preparo em
 * _suite-m3ca/pilha-e2e.sh. Todo passo tem expect(). Pela API só o que não tem tela (cadastro do radar e o agendamento da visita
 * pela rota do livro) e a conferência final do vínculo gravado. O MFA da baixa é digitado na tela (TOTP do usuário fictício).
 *
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... E2E_TOTP_SECRET=... E2E_SCENARIO=<json do preparo> node e2e/m3ca-jornada-crm-contrato-comissao.spec.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const A = require("./_m3ca-apoio");
const { codigoAgora } = require("./_totp");

const { expect } = A;
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const plusDateTime = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 16);

/** Clica e espera o campo do modal aparecer; sob máquina carregada, o primeiro clique às vezes cai antes da hidratação: tenta de novo. */
async function openModal(page, trigger, field) {
  for (let i = 0; i < 3; i += 1) {
    await trigger.click();
    if (await page.locator(field).waitFor({ state: "attached", timeout: 20000 }).then(() => true).catch(() => false)) return;
  }
  throw new Error(`modal com ${field} não abriu`);
}

/** Espera o elemento; sob máquina carregada a primeira carga do quadro pode demorar: recarrega uma vez antes de desistir. */
async function visibleOrReload(page, locator) {
  if (await locator.first().waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false)) return locator.first();
  await page.reload({ waitUntil: "domcontentloaded" });
  await locator.first().waitFor({ state: "visible", timeout: 60000 });
  return locator.first();
}

async function confirmDialog(page, label) {
  const dialog = page.locator('[role="dialog"]').last();
  await dialog.getByRole("button", { name: label }).last().click();
  await dialog.waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
}

async function crmSteps(page, s, token) {
  await page.goto(`${A.FRONT}/painel/crm`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Novo lead" }).or(page.getByText("Novo lead", { exact: true })), "1. quadro do funil do livro aberto").toBeVisible();
  await page.getByRole("button", { name: "Nova oportunidade" }).first().click();
  await page.fill("#o-person", s.buyer.legalName.slice(0, 18));
  await page.getByRole("button", { name: s.buyer.legalName }).first().click();
  await page.selectOption("#o-stage", "qualified");
  await page.selectOption("#o-property", s.property.id);
  await page.getByRole("button", { name: "Criar oportunidade" }).click();
  await expect(page.locator('[role="dialog"]').getByText("toda oportunidade precisa de um responsável", { exact: false }), "2. sem responsável a oportunidade não é criada (CRMX-006)").toBeVisible();
  await page.selectOption("#o-rep", s.userId);
  await page.fill("#o-next-action", "Apresentar imóveis do radar");
  await page.fill("#o-next-due", plusDateTime(1));
  await page.getByRole("button", { name: "Criar oportunidade" }).click();
  await expect(page.getByText(s.buyer.legalName, { exact: false }), "3. lead vira oportunidade no quadro").toBeVisible();
  const [opp] = await A.api(token, "GET", `/opportunities?personId=${s.buyer.id}`);
  await expect(opp && opp.ownerUserId, "3a. oportunidade gravada com o responsável escolhido").toBe(s.userId);

  const radar = await A.api(token, "POST", "/crm/radars", { personId: s.buyer.id, criteriaJson: { required: { offerType: "SALE", city: s.property.city, maxPrice: 700000 } } });
  await page.goto(`${A.FRONT}/painel/radar/${radar.id}`, { waitUntil: "domcontentloaded" });
  // next dev compila a tela na primeira visita: se a lista não carregou em 30 s, recarrega uma vez antes de conferir.
  const imovelNoRadar = page.getByText(s.property.title, { exact: false }).first();
  if (!(await imovelNoRadar.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false))) {
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await expect(page.getByText(s.property.title, { exact: false }), "4. Radar do cliente mostra o imóvel na tela").toBeVisible();

  const visit = await A.api(token, "POST", `/crm/opportunities/${opp.id}/visits`, { propertyId: s.property.id, scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  await page.goto(`${A.FRONT}/painel/crm`, { waitUntil: "domcontentloaded" });
  await (await visibleOrReload(page, page.getByText(s.buyer.legalName, { exact: false }))).click();
  await expect(page.locator('[role="dialog"]').getByText("Histórico de visitas"), "5. visita da oportunidade aparece no detalhe").toBeVisible();
  await expect(visit.opportunityId, "5a. visita ligada à oportunidade").toBe(opp.id);
  await page.keyboard.press("Escape");

  await page.goto(`${A.FRONT}/painel/crm/propostas`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Nova proposta" }).first().click();
  await page.selectOption("#p-opportunity", opp.id);
  await expect(page.locator("#p-property"), "6. imóvel da proposta vem da oportunidade").toBeVisible();
  await expect(await page.locator("#p-property").inputValue(), "6a. imóvel selecionado é o de interesse").toBe(s.property.id);
  await page.locator("#p-value").click();
  await page.keyboard.type("620000,00");
  const created = page.waitForResponse((r) => r.url().endsWith("/crm/proposals") && r.request().method() === "POST", { timeout: 30000 });
  await page.getByRole("button", { name: "Criar proposta" }).click();
  await expect((await created).status(), "6b. POST /crm/proposals pela tela com o imóvel").toBe(201);
  const row = page.locator("tr", { hasText: s.buyer.legalName });
  await expect(row.getByRole("button", { name: "Mudar status" }), "7. proposta criada na lista").toBeVisible();
  for (const status of ["SENT", "ACCEPTED"]) {
    await row.getByRole("button", { name: "Mudar status" }).first().click();
    await page.selectOption("#p-status", status);
    await confirmDialog(page, "Confirmar");
  }
  await expect(row.getByText("Aceita", { exact: true }), "8. proposta aceita").toBeVisible();

  await page.goto(`${A.FRONT}/painel/crm`, { waitUntil: "domcontentloaded" });
  const card = await visibleOrReload(page, page.getByText(s.buyer.legalName, { exact: false }));
  // Arrastar o cartão para a coluna "Fechado (Ganho)" (eventos de arrastar do HTML5, como o navegador dispara).
  const target = page.getByText("Fechado (Ganho)", { exact: true }).first();
  const dt = await page.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent("dragstart", { dataTransfer: dt });
  await target.dispatchEvent("dragover", { dataTransfer: dt });
  await target.dispatchEvent("drop", { dataTransfer: dt });
  await card.dispatchEvent("dragend", { dataTransfer: dt });
  await expect(page.locator("#reason-select"), "9. mover para Ganho pede o motivo (lista da empresa)").toBeVisible();
  await page.selectOption("#reason-select", "PRICE_ACCEPTED");
  await confirmDialog(page, "Confirmar");
  await A.sleep(1500);
  const won = await A.api(token, "GET", `/opportunities/${opp.id}`);
  await expect(won.stage, "10. oportunidade gravada como WON (código do livro)").toBe("WON");
  return opp;
}

async function contractSteps(page, s, opp, pdf) {
  await page.goto(`${A.FRONT}/painel/crm`, { waitUntil: "domcontentloaded" });
  await (await visibleOrReload(page, page.getByText(s.buyer.legalName, { exact: false }))).click();
  await page.getByTestId("crm-criar-contrato").click();
  await expect(page.getByText("Contrato da oportunidade do CRM", { exact: false }), "11. novo contrato aberto pela oportunidade, com o vínculo").toBeVisible();
  await page.selectOption("#f-type", "SALE_CASH");
  await expect(await page.locator("#f-property").inputValue(), "11a. imóvel do contrato é o da oportunidade").toBe(s.property.id);
  await page.locator("#f-value").click();
  await page.keyboard.type("620000,00");
  await page.fill("#f-starts", plusDays(0));
  await page.fill("#f-ends", plusDays(30));
  for (const [person, role] of [[s.seller, "SELLER"], [s.buyer, "BUYER"]]) {
    await page.selectOption("#f-party-person", person.id);
    await page.selectOption("#f-party-role", role);
    await page.getByTestId("contract-add-party").click();
  }
  await page.getByRole("button", { name: "Criar contrato" }).click();
  await page.waitForURL(/\/painel\/contratos\/lista\/[0-9a-f-]{36}$/, { timeout: 60000 });
  const contractId = page.url().split("/").pop();
  await expect(page.getByText("Rascunho").first(), "12. contrato de venda criado em rascunho").toBeVisible();
  await page.getByRole("button", { name: "Enviar para documentos" }).first().click();
  await confirmDialog(page, "Enviar para documentos");
  await expect(page.getByTestId("requirement-row"), "13. checklist de documentos gerado").toBeVisible();
  let guard = 0;
  while ((await page.getByTestId("requirement-attach").count()) > 0 && guard < 12) {
    guard += 1;
    await openModal(page, page.getByTestId("requirement-attach").first(), "#f-req-file");
    await page.setInputFiles("#f-req-file", pdf);
    await page.getByTestId("requirement-confirm").click();
    await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
    await A.sleep(800);
  }
  await expect(page.getByTestId("requirement-attach"), "14. documentos do checklist anexados").toBeHidden();
  await openModal(page, page.getByTestId("contract-new-version"), "#f-ver-file");
  await page.setInputFiles("#f-ver-file", pdf);
  await page.getByTestId("contract-new-version-confirm").click();
  await expect(page.getByTestId("contract-version-1"), "15. versão do contrato com o documento").toBeVisible();
  await page.getByRole("button", { name: "Enviar para revisão jurídica" }).first().click();
  await confirmDialog(page, "Enviar para revisão jurídica");
  await page.getByTestId("contract-approve-version").click();
  await confirmDialog(page, "Aprovar versão");
  await expect(page.getByTestId("contract-send-signature"), "16. versão aprovada").toBeVisible();
  await page.getByTestId("contract-send-signature").click();
  await page.getByTestId("contract-send-signature-confirm").click();
  for (const person of [s.seller, s.buyer]) {
    await openModal(page, page.getByTestId(`manual-signature-${person.id}`), "#f-manual-sig-file");
    await page.setInputFiles("#f-manual-sig-file", pdf);
    await page.getByTestId("manual-signature-confirm").click();
    await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
    await A.sleep(800);
  }
  if (!(await page.getByRole("button", { name: "Ativar contrato" }).first().isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Marcar como assinado" }).first().click();
    await confirmDialog(page, "Marcar como assinado");
  }
  await expect(page.getByRole("button", { name: "Ativar contrato" }), "17. vendedor e comprador assinaram").toBeVisible();
  await page.getByRole("button", { name: "Ativar contrato" }).first().click();
  await confirmDialog(page, "Ativar contrato");
  await expect(page.getByText("Contrato agora está em \"Em vigor\"", { exact: false }), "18. contrato ativo (Em vigor)").toBeVisible();
  return contractId;
}

async function financeSteps(page, s, contractId, token) {
  await page.getByTestId("contrato-lancar-recebivel").click();
  await expect(page.getByText("Recebível do contrato:", { exact: false }), "19. novo recebível aberto pelo contrato, com o vínculo").toBeVisible();
  const desc = `Recebimento da venda ${s.sfx}`;
  await page.fill("#f-desc", desc);
  await page.locator("#f-amount").click();
  await page.keyboard.type("620000,00");
  await page.fill("#f-due", plusDays(1));
  await page.selectOption("#f-rc", s.resultCenterId);
  await page.getByRole("button", { name: "Criar lançamento" }).click();
  await page.waitForURL(/\/painel\/financeiro\/lancamentos$/, { timeout: 60000 });
  await expect(page.getByText(desc), "19a. recebível criado na lista de lançamentos").toBeVisible();
  const entries = await A.api(token, "GET", "/finance/entries?nature=RECEIVABLE");
  const entry = (Array.isArray(entries) ? entries : entries.items || entries.rows || []).find((e) => e.description === desc);
  const entryId = entry.id;
  await page.goto(`${A.FRONT}/painel/financeiro/lancamentos/${entryId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Liquidar" }).first().click();
  await confirmDialog(page, "Liquidar");
  await page.locator("#mfa-modal-codigo").waitFor({ timeout: 30000 });
  await page.fill("#mfa-modal-codigo", await codigoAgora(A.TOTP_SECRET));
  await page.locator('[role="dialog"]').last().getByRole("button", { name: /Confirmar|Verificar/ }).last().click();
  await expect(page.getByText("Liquidado", { exact: false }), "20. recebimento baixado com o MFA digitado na tela").toBeVisible(60000);

  await page.goto(`${A.FRONT}/painel/financeiro/comissoes-repasses`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Nova comissão" }).first().click();
  await page.selectOption("#nc-user", s.userId);
  await page.selectOption("#nc-source", entryId);
  await page.selectOption("#nc-component", "BROKER");
  await page.getByRole("button", { name: "Criar comissão" }).click();
  await expect(page.getByText("Comissão criada", { exact: false }), "21. comissão do corretor criada sobre o recebimento").toBeVisible();
  return entryId;
}

async function main() {
  A.guard();
  const s = JSON.parse(fs.readFileSync(process.env.E2E_SCENARIO, "utf8"));
  const pdf = A.testPdf();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(60000);
  page.on("console", (m) => { if (m.type() === "error") console.log(`[console] ${m.text().slice(0, 200)}`); });
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log(`[nav] ${f.url()}`); });
  try {
    await A.login(page);
    const token = await A.apiToken();
    await expect(page.url(), "0. login na tela").toMatch(/\/painel/);
    const opp = await crmSteps(page, s, token);
    const contractId = await contractSteps(page, s, opp, A.testPdf());
    const entryId = await financeSteps(page, s, contractId, token);
    const contract = await A.api(token, "GET", `/legal/contracts/${contractId}`);
    await expect(contract.opportunityId, "22. contrato gravado ligado à oportunidade").toBe(opp.id);
    const entry = await A.api(token, "GET", `/finance/entries/${entryId}`);
    await expect(entry.contractId, "23. recebível gravado ligado ao contrato").toBe(contractId);
    const commissions = await A.api(token, "GET", "/finance/commissions");
    const mine = (Array.isArray(commissions) ? commissions : commissions.items || []).find((c) => c.sourceEntryId === entryId);
    await expect(Boolean(mine) && mine.contractId === contractId && Number(mine.totalAmount) === 31000, "24. comissão de 5% (R$ 31.000,00) ligada ao recebimento e ao contrato").toBe(true);
    await page.screenshot({ path: path.join(A.OUT, "fim-comissao.png"), fullPage: true });
  } catch (err) {
    console.error(err.stack || err.message);
    await expect(false, `erro fora de um expect: ${String(err.message).split("\n")[0]}`).toBe(true).catch(() => {});
    await page.screenshot({ path: path.join(A.OUT, "falha.png"), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
  if (!A.summary()) process.exitCode = 1;
  fs.writeFileSync(path.join(A.OUT, "ultimo-cenario.json"), JSON.stringify({ sfx: s.sfx }, null, 2));
}

main();
