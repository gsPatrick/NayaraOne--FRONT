// Fluxos do E2E de fechamento do Marco 5 que cobrem modelos/publicação, aditivo e notificação versionada
// (separados de marco5-fechamento.spec.js para cada arquivo ficar com até 400 linhas).
"use strict";

const path = require("path");
const A = require("./_m5-apoio");

const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
async function confirmDialog(page, name) {
  await page.locator('[role="dialog"]').last().getByRole("button", { name, exact: true }).click();
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(A.OUT, `${name}.png`), fullPage: true });
}

async function createClause(page, code, title, body) {
  await page.getByRole("button", { name: /Nova cláusula/ }).click();
  await page.fill("#f-code", code);
  await page.fill("#f-title", title);
  await page.fill("#f-body", body);
  await confirmDialog(page, "Criar");
  await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
}

async function addClause(page, title) {
  await page.locator("#f-tpl-add-clause").waitFor();
  const optValue = await page.locator("#f-tpl-add-clause option", { hasText: title }).first().getAttribute("value");
  await page.selectOption("#f-tpl-add-clause", optValue);
  await page.getByRole("button", { name: "Adicionar cláusula" }).click();
}

async function templateFlow(page, ctx) {
  const title = `Cláusula de vigência E2E ${ctx.sfx}`;
  const title2 = `Cláusula de multa E2E ${ctx.sfx}`;
  await page.goto(`${A.FRONT}/painel/contratos/clausulas`, { waitUntil: "domcontentloaded" });
  await createClause(page, `E2E_VIGENCIA_${ctx.sfx}`, title, "O prazo de locação é o definido no quadro-resumo deste contrato (texto fictício de teste).");
  await createClause(page, `E2E_MULTA_${ctx.sfx}`, title2, "Multa fictícia de três aluguéis em caso de rescisão antecipada (texto de teste).");
  const clauseRow = page.getByText(title).first();
  A.record("T1. cláusula criada na biblioteca com responsável jurídico", (await A.visible(clauseRow)) && (await A.visible(page.getByText(/responsável jurídico: /).first())));

  const name = `Modelo locação E2E ${ctx.sfx}`;
  await page.goto(`${A.FRONT}/painel/contratos/modelos`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Novo modelo/ }).click();
  await page.fill("#f-tpl-name", name);
  await page.selectOption("#f-tpl-type", "LEASE_RESIDENTIAL");
  await confirmDialog(page, "Criar modelo");
  await page.getByRole("button", { name: new RegExp(name) }).first().click();
  A.record("T2. modelo criado sem versão publicada (ainda não gera contrato)", await A.visible(page.getByText(/sem versão publicada: ainda não gera contrato/)));
  await addClause(page, title);
  A.record("T3. cláusula incluída na versão 1 em rascunho do modelo", await A.visible(page.getByTestId("template-clause").filter({ hasText: title })));
  await page.getByRole("button", { name: /Publicar versão 1/ }).click();
  await confirmDialog(page, "Publicar versão");
  const v1 = page.getByTestId("template-version").filter({ hasText: "Versão 1" });
  A.record("T4. versão 1 do modelo publicada (alçada jurídica), com quem publicou", (await A.visible(v1.getByText("Publicada"))) && (await A.visible(v1.getByText(/publicada em .* por /))));
  await shot(page, "00-modelo-publicado");
  // Mexer no modelo publicado cria a versão 2 em rascunho (a publicada não muda).
  await addClause(page, title2);
  const v2 = page.getByTestId("template-version").filter({ hasText: "Versão 2" });
  A.record("T5. incluir cláusula no modelo publicado cria a versão 2 em rascunho", await A.visible(v2.getByText("Rascunho")));
  return { name, publishedTitle: title, draftTitle: title2 };
}

async function amendmentFlow(page, ctx, contractId, files) {
  await page.goto(`${A.FRONT}/painel/contratos/lista/${contractId}`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("amendment-new").click();
  await page.fill("#f-am-reason", "Reajuste de valor por acordo entre as partes (fictício)");
  await page.fill("#f-am-from", plusDays(30));
  await page.fill("#f-am-until", plusDays(720));
  await page.selectOption("#f-am-field-0", "totalValue");
  await page.fill("#f-am-old-0", "2.500,00");
  await page.fill("#f-am-new-0", "2.650,00");
  await page.getByTestId("amendment-create").click();
  A.record("A1. aditivo criado em rascunho com versão base e vigência", await A.visible(page.getByTestId(`amendment-sign-${ctx.landlord.id}`)));
  for (const person of [ctx.landlord, ctx.tenant]) {
    await page.getByTestId(`amendment-sign-${person.id}`).click();
    await page.setInputFiles("#f-am-sign-file", files.pdf);
    await page.getByTestId("amendment-sign-confirm").click();
    await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  A.record("A2. aditivo assinado por cada signatário (fica Assinado)", (await page.getByTestId(/^amendment-sign-/).count()) === 0 && (await A.visible(page.getByText("Assinado", { exact: true }).last())));
  await shot(page, "03b-aditivo-assinado");
}

async function noticeFlow(page, ctx, contractId) {
  await page.goto(`${A.FRONT}/painel/contratos/notificacoes`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Nova notificação/ }).click();
  await page.selectOption("#f-contract", contractId);
  const recipient = `Locatário fictício E2E ${ctx.sfx}`;
  await page.fill("#f-recipient", recipient);
  await page.fill("#f-content", `Notificação de cobrança fictícia E2E ${ctx.sfx}: valor em aberto de R$ 2.500,00.`);
  await confirmDialog(page, "Criar como rascunho");
  const row = page.locator("div").filter({ hasText: recipient }).filter({ has: page.getByRole("button", { name: "Corrigir (nova versão)" }) }).last();
  await row.getByRole("button", { name: "Corrigir (nova versão)" }).click();
  await page.fill("#f-version-reason", "Valor do débito corrigido");
  await page.fill("#f-version-content", `Notificação de cobrança fictícia E2E ${ctx.sfx}: valor em aberto corrigido para R$ 2.650,00.`);
  await confirmDialog(page, "Criar nova versão");
  await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  await row.getByRole("button", { name: "Ver versões" }).click();
  const versions = page.getByTestId("notice-versions");
  const text = (await A.visible(versions)) ? await versions.innerText() : "";
  A.record("N1. correção da notificação cria a versão 2 e preserva a versão 1 (com o motivo)", /Versão 1/.test(text) && /Versão 2/.test(text) && /Valor do débito corrigido/.test(text), text.replace(/\s+/g, " ").slice(0, 120));
  await shot(page, "09b-notificacao-versoes");
  await page.keyboard.press("Escape");
  await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
}

module.exports = { templateFlow, amendmentFlow, noticeFlow };
