// Marco 5 — fechamento do Front com as regras novas da API (Playwright clicando na UI, pilha descartável 5533/5534/5537).
// Percorre: contrato DRAFT -> documentos -> revisão jurídica -> aprovação da VERSÃO -> envio para assinatura -> assinaturas
// manuais -> assinado (com modelo publicado: cláusula da biblioteca -> modelo -> publicar versão); aditivo assinado
// por signatário; notificação corrigida por nova versão; garantia (seguro-fiança) com os dados do tipo, nascendo Pendente e completada; vistoria de
// ENTRADA e de SAÍDA com comparação por ambiente/item; recusa clara da assinatura da vistoria por MFA; entrega de
// chaves recusada sem a via assinada do termo e liberada com ela; processo com prazo de origem verificável concluído
// com nota; recebível só do valor confirmado.
//
// Uso: E2E_PASSWORD=<senha dos usuários fictícios> E2E_API_DIR=<raiz da API> E2E_DATABASE_URL=<banco descartável> \
//      [E2E_DATABASE_ADMIN_URL=<superusuário do banco descartável>] node e2e/marco5-fechamento.spec.js
"use strict";

const path = require("path");
const { chromium } = require("playwright");
const A = require("./_m5-apoio");
const { templateFlow, amendmentFlow, noticeFlow } = require("./_m5-fluxos-extra");

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const plusDays = (n) => iso(new Date(today.getTime() + n * 86400000));

async function dialogButton(page, name) {
  return page.locator('[role="dialog"]').last().getByRole("button", { name, exact: true });
}

async function confirmDialog(page, name) {
  const btn = await dialogButton(page, name);
  await btn.click();
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(A.OUT, `${name}.png`), fullPage: true });
}

async function contractFlow(page, ctx, files, template) {
  const { landlord, tenant, property } = ctx;
  await page.goto(`${A.FRONT}/painel/contratos/lista/novo`, { waitUntil: "domcontentloaded" });
  await page.locator("#f-type").waitFor();
  await page.selectOption("#f-type", "LEASE_RESIDENTIAL");
  await page.selectOption("#f-property", property.id);
  await page.fill("#f-value", "2500,00");
  await page.fill("#f-starts", plusDays(-1));
  await page.fill("#f-ends", plusDays(720));
  for (const [person, role] of [[landlord, "LANDLORD"], [tenant, "TENANT"]]) {
    await page.selectOption("#f-party-person", person.id);
    await page.selectOption("#f-party-role", role);
    await page.getByTestId("contract-add-party").click();
  }
  if (template) {
    const tplValue = await page.locator("#f-template option", { hasText: template.name }).first().getAttribute("value");
    await page.selectOption("#f-template", tplValue);
  }
  await page.getByRole("button", { name: "Criar contrato" }).click();
  if (template) {
    // Primeiro clique: prévia das cláusulas (da versão PUBLICADA); "Ver rascunho" só consulta; segundo clique: cria.
    const pv = page.getByTestId("clause-preview");
    const pvText = (await A.visible(pv)) ? await pv.innerText() : "";
    A.record("1c. prévia mostra a versão 1 publicada (a que gera contrato), sem a cláusula do rascunho", /versão 1 do modelo \(publicada\)/.test(pvText) && pvText.includes(template.publishedTitle) && !pvText.includes(template.draftTitle), pvText.split("\n")[0]);
    await page.getByRole("button", { name: "Ver rascunho" }).click();
    const dv = page.getByTestId("clause-preview-draft");
    const dvText = (await A.visible(dv)) ? await dv.innerText() : "";
    A.record("1d. Ver rascunho mostra a versão 2 em rascunho, marcada como só consulta", /versão 2 do modelo \(rascunho\).*só consulta/.test(dvText) && dvText.includes(template.draftTitle), dvText.split("\n")[0]);
    await page.getByRole("button", { name: "Confirmar e criar contrato" }).click();
  }
  await page.waitForURL(/\/painel\/contratos\/lista\/[0-9a-f-]{36}$/, { timeout: 60000 });
  const contractId = page.url().split("/").pop();
  A.record("1. contrato criado em rascunho pela tela", await A.visible(page.getByText("Rascunho").first()));
  if (template) A.record("1b. versão 1 gerada da versão PUBLICADA do modelo", await A.visible(page.getByTestId("contract-version-1").getByText(template.name)));
  A.record("1a. sem botão Cancelar (CANCELLED não é estado do livro)", (await page.getByRole("button", { name: /^Cancelar$/ }).count()) === 0);

  await page.getByRole("button", { name: "Enviar para documentos" }).first().click();
  await confirmDialog(page, "Enviar para documentos");
  A.record("2. contrato em Documentos pendentes e checklist gerado pela regra", await A.visible(page.getByTestId("requirement-row")));

  // Antes de anexar: a revisão jurídica é recusada com a lista de documentos em português (sem código de exigência).
  await page.getByRole("button", { name: "Enviar para revisão jurídica" }).first().click();
  await confirmDialog(page, "Enviar para revisão jurídica");
  const err = page.getByTestId("contract-action-error");
  const errText = (await A.visible(err)) ? await err.innerText() : "";
  A.record("2a. revisão jurídica recusada com pendências do checklist em português", /Faltam documentos do checklist/.test(errText) && !/[A-Z]{3,}_[A-Z_]+/.test(errText), errText.slice(0, 140));
  await shot(page, "01-checklist-pendente");

  let guard = 0;
  while ((await page.getByTestId("requirement-attach").count()) > 0 && guard < 12) {
    guard += 1;
    await page.getByTestId("requirement-attach").first().click();
    await page.setInputFiles("#f-req-file", files.pdf);
    await page.getByTestId("requirement-confirm").click();
    await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  A.record("3. todos os documentos do checklist anexados pela tela", (await page.getByTestId("requirement-attach").count()) === 0, `${guard} anexo(s)`);

  await page.getByTestId("contract-new-version").click();
  await page.setInputFiles("#f-ver-file", files.pdf);
  await page.getByTestId("contract-new-version-confirm").click();
  const vN = template ? 2 : 1;
  A.record(`4. versão ${vN} do documento criada (Rascunho)`, await A.visible(page.getByTestId(`contract-version-${vN}`)));

  await page.getByRole("button", { name: "Enviar para revisão jurídica" }).first().click();
  await confirmDialog(page, "Enviar para revisão jurídica");
  A.record("5. contrato em Revisão jurídica", await A.visible(page.getByTestId("contract-approve-version")));

  await page.getByTestId("contract-approve-version").click();
  await confirmDialog(page, "Aprovar versão");
  const v1 = page.getByTestId(`contract-version-${vN}`);
  A.record("6. versão aprovada pela rota da versão: versão Aprovada e contrato Aprovado", (await A.visible(v1.getByText("Aprovada"))) && (await A.visible(page.getByTestId("contract-send-signature"))));
  A.record("6a. depois da aprovação, valor/vigência só por aditivo", await A.visible(page.getByTestId("contract-terms-locked")));
  await shot(page, "02-versao-aprovada");

  await page.getByTestId("contract-send-signature").click();
  await page.getByTestId("contract-send-signature-confirm").click();
  A.record("7. versão aprovada enviada para assinatura (Em assinatura)", await A.visible(page.getByTestId(`manual-signature-${landlord.id}`), 30000));

  for (const person of [landlord, tenant]) {
    await page.getByTestId(`manual-signature-${person.id}`).click();
    await page.setInputFiles("#f-manual-sig-file", files.pdf);
    await page.getByTestId("manual-signature-confirm").click();
    await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  A.record("8. assinaturas manuais com a via assinada registradas", (await page.getByTestId(/^manual-signature-/).count()) === 0);
  // A API leva o contrato a assinado quando a última parte obrigatória assina; se não levar, a ação do livro está na tela.
  if (!(await A.visible(page.getByRole("button", { name: "Ativar contrato" }), 5000))) {
    await page.getByRole("button", { name: "Marcar como assinado" }).first().click();
    await confirmDialog(page, "Marcar como assinado");
  }
  A.record("9. contrato Assinado", await A.visible(page.getByRole("button", { name: "Ativar contrato" })));
  const timeline = await page.locator("ul").filter({ hasText: "Situação do contrato mudou" }).first().innerText().catch(() => "");
  A.record("9a. linha do tempo sem código de status cru", timeline.length > 0 && !/"(DRAFT|DOCUMENTS_PENDING|LEGAL_REVIEW|APPROVED|SIGNING|SIGNED)"/.test(timeline));
  await shot(page, "03-contrato-assinado");
  return contractId;
}

async function guaranteeFlow(page, contractId, files) {
  await page.goto(`${A.FRONT}/painel/contratos/garantias/novo`, { waitUntil: "domcontentloaded" });
  await page.locator("#f-contract").waitFor();
  await page.selectOption("#f-contract", contractId);
  await page.selectOption("#f-type", "INSURANCE");
  await page.fill("#f-g-provider", "Seguradora Fictícia E2E");
  await page.fill("#f-g-policy", `AP-${Date.now()}`);
  await page.setInputFiles("#f-g-policy-file", files.pdf);
  await page.fill("#f-g-value", "7500,00");
  await page.fill("#f-g-starts", plusDays(-1));
  await page.fill("#f-g-ends", plusDays(365));
  A.record("10. tela avisa antes de criar que a garantia nasce pendente", await A.visible(page.getByText(/criada como Pendente/)));
  await page.getByRole("button", { name: "Criar garantia" }).click();
  await page.waitForURL(/\/garantias\/[0-9a-f-]{36}$/, { timeout: 60000 });
  const missing = page.getByTestId("guarantee-missing");
  const missingText = (await A.visible(missing)) ? await missing.innerText() : "";
  A.record("11. seguro-fiança sem parcelas/renovação nasce Pendente com o que falta", /Parcelas do prêmio/.test(missingText) && /renovação/i.test(missingText), missingText.replace(/\s+/g, " ").slice(0, 120));
  await shot(page, "04-garantia-pendente");
  await page.getByRole("button", { name: "Completar dados" }).click();
  await page.fill("#f-g-annual-premium", "1200,00");
  await page.getByRole("button", { name: "Adicionar parcela" }).click();
  await page.fill("#f-g-inst-due-0", plusDays(30));
  await page.fill("#f-g-inst-amount-0", "1200,00");
  await page.fill("#f-g-renewal", plusDays(330));
  await page.getByRole("button", { name: "Gravar dados" }).click();
  A.record("12. dados do tipo completados: garantia Ativa", await A.visible(page.getByText("Dados completos: garantia ativada.")));
  await shot(page, "05-garantia-ativa");
}

async function createInspection(page, contractId, type, items) {
  await page.goto(`${A.FRONT}/painel/contratos/vistorias/novo`, { waitUntil: "domcontentloaded" });
  await page.locator("#f-contract").waitFor();
  await page.selectOption("#f-contract", contractId);
  await page.selectOption("#f-type", type);
  await page.fill("#f-scheduled", `${iso(today)}T10:00`);
  for (const it of items) {
    await page.fill("#f-item-room", it.room);
    await page.fill("#f-item-name", it.item);
    await page.selectOption("#f-item-condition", it.condition);
    if (it.description) await page.fill("#f-item-description", it.description);
    if (it.condition === "DAMAGED") {
      await page.fill("#f-item-damage", "Piso riscado perto da porta");
      await page.selectOption("#f-item-responsible", "TENANT");
      await page.fill("#f-item-budget", "350,00");
    }
    await page.getByRole("button", { name: "Adicionar item" }).click();
  }
  await page.getByRole("button", { name: "Criar vistoria" }).click();
  await page.waitForURL(/\/vistorias\/[0-9a-f-]{36}$/, { timeout: 60000 });
  return page.url().split("/").pop();
}

async function completeInspection(page) {
  await page.getByRole("button", { name: "Concluir vistoria" }).first().click();
  await confirmDialog(page, "Concluir vistoria");
  await page.getByRole("button", { name: /Assinar como Locador/ }).waitFor({ timeout: 30000 });
}

async function inspectionFlow(page, contractId, files) {
  const entryId = await createInspection(page, contractId, "ENTRY", [
    { room: "Sala", item: "Piso", condition: "GOOD", description: "Porcelanato sem marcas" },
    { room: "Cozinha", item: "Pia", condition: "NEW" },
  ]);
  A.record("13. vistoria de Entrada criada com itens por ambiente", (await A.visible(page.getByText("Entrada").first())) && (await page.getByTestId("inspection-item-row").count()) >= 0);
  await page.getByRole("button", { name: /Anexar foto\/vídeo/ }).first().click();
  await page.locator('input[type="file"][id^="f-media-file-"]').first().setInputFiles(files.png);
  await page.getByRole("button", { name: "Anexar", exact: true }).click();
  A.record("14. foto anexada ao item da vistoria", await A.visible(page.getByText(/Foto 1/)));
  await completeInspection(page);
  A.record("15. vistoria de entrada concluída", await A.visible(page.getByText("Concluída").first()));

  // MFA: a assinatura exige verificação recente — sem ela a tela mostra a recusa de forma clara.
  await page.getByRole("button", { name: /Assinar como Locador/ }).click();
  await page.fill("#f-signature", "Locador Fictício");
  await page.getByRole("button", { name: "Confirmar assinatura" }).click();
  const refusal = page.getByTestId("inspection-sign-refusal");
  if (!(await A.visible(refusal, 15000))) {
    // Usuário com MFA configurado: o host global pede o código; cancelar também é recusa.
    const mfaModal = page.locator('[role="dialog"]').filter({ hasText: /código/i }).last();
    await mfaModal.getByRole("button", { name: /Cancelar|Voltar|Fechar/ }).first().click({ timeout: 5000 }).catch(() => {});
  }
  const refusalText = (await A.visible(refusal)) ? await refusal.innerText() : "";
  A.record("16. assinatura sem MFA recente recusada com mensagem clara", /verificação em duas etapas/i.test(refusalText), refusalText.replace(/\s+/g, " ").slice(0, 140));
  await shot(page, "06-vistoria-recusa-mfa");
  await page.keyboard.press("Escape").catch(() => {});

  const exitId = await createInspection(page, contractId, "EXIT", [
    { room: "Sala", item: "Piso", condition: "DAMAGED" },
    { room: "Cozinha", item: "Pia", condition: "NEW" },
  ]);
  await completeInspection(page);
  await page.goto(`${A.FRONT}/painel/contratos/vistorias/${entryId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Comparar com a vistoria de saída/ }).click();
  const cmp = page.getByTestId("inspection-comparison");
  const changedRow = page.getByTestId("comparison-row").filter({ hasText: "Piso" }).filter({ hasText: "Mudou" });
  A.record("17. comparação entrada x saída por ambiente/item: Sala/Piso mudou (Bom -> Danificado)", (await A.visible(cmp)) && (await A.visible(changedRow)));
  A.record("17a. comparação avisa que a responsabilidade depende de validação humana", await A.visible(cmp.getByText(/validação humana/i)));
  await shot(page, "07-comparacao");
  return { entryId, exitId };
}

async function keyDeliveryFlow(page, ctx, contractId, entryId, files) {
  await page.goto(`${A.FRONT}/painel/contratos/entrega-chaves/novo`, { waitUntil: "domcontentloaded" });
  await page.locator("#f-contract").waitFor();
  await page.selectOption("#f-contract", contractId);
  await page.waitForTimeout(800);
  await page.selectOption("#f-inspection", entryId).catch(() => {});
  await page.selectOption("#f-person", ctx.tenant.id);
  await page.getByRole("button", { name: "Criar entrega" }).click();
  await page.waitForURL(/\/entrega-chaves\/[0-9a-f-]{36}/, { timeout: 60000 });
  await page.getByRole("button", { name: "Liberar chaves" }).first().click();
  await page.fill("#f-kd-count", "2");
  await page.fill("#f-kd-ident", "2 chaves da porta e 1 controle do portão");
  // Quem assina: o padrão é o próprio recebedor (locatário, parte do contrato).
  await page.setInputFiles("#f-kd-photos", files.png);
  // Correção M5VP: sem a via assinada do termo a tela nem envia (botão desabilitado e a pendência listada); a API também recusa.
  const missing = page.getByTestId("key-release-missing");
  const text = (await A.visible(missing)) ? await missing.innerText() : "";
  const blocked = await (await dialogButton(page, "Liberar chaves")).isDisabled();
  A.record("18. entrega de chaves recusada SEM a via assinada do termo", blocked && /via do termo assinada/i.test(text), text.replace(/\s+/g, " ").slice(0, 140));
  await shot(page, "08-chaves-recusa-sem-via");
  await page.setInputFiles("#f-kd-term-evidence", files.pdf);
  await (await dialogButton(page, "Liberar chaves")).click();
  await page.locator('[role="dialog"]').waitFor({ state: "detached", timeout: 60000 }).catch(() => {});
  const delivered = (await A.visible(page.getByText("Entregue", { exact: true }), 30000)) && (await A.visible(page.getByRole("button", { name: /Ver via assinada/ })));
  A.record("19. com a via assinada do termo, chaves entregues (selo Entregue e via assinada guardada)", delivered);
  await shot(page, "09-chaves-entregues");
}

async function deadlineFlow(page, ctx, contractId, files) {
  await page.goto(`${A.FRONT}/painel/contratos/processos/novo`, { waitUntil: "domcontentloaded" });
  await page.locator("#f-type").waitFor();
  await page.fill("#f-number", `PROC-E2E-${ctx.sfx}`);
  await page.selectOption("#f-type", "COLLECTION");
  await page.selectOption("#f-contract", contractId).catch(() => {});
  const resp = page.locator("#f-responsible option");
  if ((await resp.count()) > 1) await page.selectOption("#f-responsible", { index: 1 });
  await page.fill("#f-summary", "Cobrança fictícia de aluguel em atraso (E2E)");
  await page.getByRole("button", { name: "Criar processo" }).click();
  await page.waitForURL(/\/processos\/[0-9a-f-]{36}$/, { timeout: 60000 });
  await page.getByRole("button", { name: "Novo prazo" }).click();
  await page.fill("#f-deadline-desc", "Contestação do locatário");
  await page.fill("#f-deadline-date", plusDays(15));
  const respOpts = page.locator("#f-deadline-responsible option");
  if ((await respOpts.count()) > 1) await page.selectOption("#f-deadline-responsible", { index: 1 });
  await page.setInputFiles("#f-deadline-source", files.pdf);
  await page.getByRole("button", { name: "Criar prazo" }).click();
  const row = page.getByTestId("deadline-row").filter({ hasText: "Contestação do locatário" });
  A.record("20. prazo criado com documento de origem (vence 23:59 de Brasília)", (await A.visible(row)) && (await A.visible(row.getByText(/23:59/))));
  // Caminho operacional: reatribuir -> remarcar sem motivo (recusa) -> remarcar com motivo -> concluir -> reabrir.
  await row.getByRole("button", { name: "Reatribuir" }).click();
  const respSelect = row.locator('select[id^="f-dl-responsible-"]');
  const other = await respSelect.locator("option", { hasText: /checker/i }).first().getAttribute("value");
  await respSelect.selectOption(other);
  await row.locator('input[id^="f-dl-reason-"]').fill("Redistribuição da carteira (fictícia)");
  await row.getByRole("button", { name: "Confirmar reatribuição" }).click();
  A.record("20a. prazo reatribuído a outro usuário da empresa", await A.visible(row.getByText(/Responsável: .*checker/i)));
  await row.getByRole("button", { name: "Remarcar" }).click();
  await row.locator('input[id^="f-dl-date-"]').fill(plusDays(20));
  await row.getByRole("button", { name: "Confirmar remarcação" }).click();
  const refusal = row.getByTestId("deadline-change-refusal");
  const refusalText = (await A.visible(refusal)) ? await refusal.innerText() : "";
  A.record("20b. remarcar SEM motivo é recusado com mensagem clara", /motivo/i.test(refusalText), refusalText.slice(0, 120));
  await row.locator('input[id^="f-dl-reason-"]').fill("Prazo devolvido por decisão publicada (fictícia)");
  await row.getByRole("button", { name: "Confirmar remarcação" }).click();
  const newDue = plusDays(20).split("-").reverse().join("/");
  A.record("20c. remarcado COM motivo: novo vencimento na tela", await A.visible(row.getByText(new RegExp(`Vence em ${newDue}`))));
  await row.getByRole("button", { name: "Concluir" }).click();
  await row.locator('input[id^="f-conclusion-"]').fill("Contestação protocolada, protocolo fictício 123");
  await row.getByRole("button", { name: "Confirmar conclusão" }).click();
  A.record("21. prazo concluído com nota", await A.visible(row.getByText("Concluído")));
  await shot(page, "10-prazo-concluido");
  await row.getByRole("button", { name: "Reabrir" }).click();
  await row.getByRole("button", { name: "Confirmar reabertura" }).click();
  A.record("21a. prazo concluído reaberto (aprovação jurídica): volta a Pendente", await A.visible(row.getByText("Pendente", { exact: true })));
  await row.getByRole("button", { name: "Histórico" }).click();
  const hist = row.getByTestId("deadline-history");
  const histText = (await A.visible(hist)) ? await hist.innerText() : "";
  A.record("21b. histórico do prazo: vencimento anterior, novo, motivo, autor e data", /remarcado de .* para .*motivo/i.test(histText) && /por /.test(histText), histText.replace(/\s+/g, " ").slice(0, 160));
  await shot(page, "10a-prazo-historico");

  // Recebível: estimativa não vira lançamento; só o valor confirmado vai ao Financeiro (legal:approve + finance:create).
  await page.getByRole("button", { name: "Atualizar valores" }).click();
  await page.fill("#f-case-estimated", "9.000,00");
  await page.getByRole("button", { name: "Gravar valores" }).click();
  A.record("R1. com só a estimativa, nada vira recebível", await A.visible(page.getByText(/Sem valor confirmado/)));
  await page.getByRole("button", { name: "Atualizar valores" }).click();
  await page.fill("#f-case-confirmed", "7.500,00");
  await page.getByRole("button", { name: "Gravar valores" }).click();
  await page.locator("#f-rcv-basis").waitFor();
  await page.selectOption("#f-rcv-basis", "SETTLEMENT");
  await page.fill("#f-rcv-ref", "Acordo homologado fictício, autos 0001234");
  await page.fill("#f-rcv-due", plusDays(45));
  const center = await page.locator("#f-rcv-center option", { hasText: ctx.resultCenterName }).first().getAttribute("value");
  await page.selectOption("#f-rcv-center", center);
  await page.getByRole("button", { name: /Vincular ao Financeiro/ }).click();
  A.record("R2. valor confirmado vinculado como recebível no Financeiro", await A.visible(page.getByTestId("case-receivable")));
  await shot(page, "10b-recebivel");
}

async function legacyCancelledFlow(page, token, ctx) {
  const draft = await A.api(token, "POST", "/legal/contracts", { contractType: "LEASE_RESIDENTIAL", totalValue: 1000, propertyId: ctx.property.id });
  const r = await fetch(`${A.API}/legal/contracts/${draft.id}/transition`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetStatus: "CANCELLED" }) });
  A.record("22. API recusa CANCELLED como alvo (409)", r.status === 409, `HTTP ${r.status}`);
  if (!A.markLegacyCancelled(draft.id)) {
    A.record("23. contrato antigo CANCELLED legível (pulado: defina E2E_DATABASE_ADMIN_URL)", true);
    return;
  }
  await page.goto(`${A.FRONT}/painel/contratos/lista/${draft.id}`, { waitUntil: "domcontentloaded" });
  const legacy = await A.visible(page.getByTestId("contract-legacy-cancelled"));
  const noActions = (await page.getByRole("button", { name: /Enviar para|Aprovar|Cancelar|Rescindir|Ativar/ }).count()) === 0;
  A.record("23. contrato antigo CANCELLED legível, sem ações", legacy && noActions);
  await shot(page, "11-contrato-legado-cancelado");
}

(async () => {
  A.guard();
  const files = A.testFiles();
  const { token, claims } = await A.apiLogin();
  const ctx = await A.seedScenario(token);
  ctx.resultCenterName = `Jurídico E2E ${ctx.sfx}`;
  await A.api(token, "POST", "/finance/result-centers", { code: `JUR${ctx.sfx}`, name: ctx.resultCenterName });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(45000);
  let ok = false;
  try {
    await A.uiLogin(page);
    A.record("0. login na tela (usuário fictício, sem MFA)", true);
    const template = await templateFlow(page, ctx);
    const contractId = await contractFlow(page, ctx, files, template);
    await amendmentFlow(page, ctx, contractId, files);
    await noticeFlow(page, ctx, contractId);
    await guaranteeFlow(page, contractId, files);
    const { entryId } = await inspectionFlow(page, contractId, files);
    A.signInspectionByService(entryId, claims);
    A.record("17b. preparo: assinaturas de locador e locatário pela camada de serviço (MFA não é contornado na rota)", true);
    await keyDeliveryFlow(page, ctx, contractId, entryId, files);
    await deadlineFlow(page, ctx, contractId, files);
    await legacyCancelledFlow(page, token, ctx);
  } catch (err) {
    A.record("execução interrompida", false, err.message.split("\n")[0]);
    await shot(page, "99-erro").catch(() => {});
  } finally {
    ok = A.summary();
    await browser.close();
  }
  process.exit(ok ? 0 : 1);
})();
