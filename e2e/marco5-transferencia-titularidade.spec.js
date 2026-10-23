// Marco 5 — transferência de titularidade de água/energia pela tela (Locação > Obrigações).
// Cobre: criar obrigação exigindo transferência, solicitar transferência numa obrigação ativa,
// recusa de conclusão sem comprovante/novo titular (botão desabilitado) e conclusão com anexo real.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const PRINTS = path.join(__dirname, "prints-locacao");
const results = [];
function record(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? " — " + detail : ""}`);
}

async function aparece(locator, ms = 25000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: ms });
    return true;
  } catch {
    return false;
  }
}

async function pickPerson(page, scope, text) {
  const input = scope.locator('input[placeholder*="Buscar contato"]').first();
  await input.fill(text);
  const option = scope.locator("ul li").first();
  await option.waitFor({ timeout: 15000 });
  await option.click();
}

(async () => {
  const pdfPath = path.join(PRINTS, "comprovante-e2e.pdf");
  fs.writeFileSync(pdfPath, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  try {
    await page.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
    const teamTab = page.getByText("Sou da equipe", { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector("input[type=email]");
    await page.fill("input[type=email]", "admin@nayaraone.dev");
    await page.fill("input[type=password]", "DevAdmin#2026");
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.includes("/entrar"));
    record("1. login", true);

    await page.goto(`${BASE}/painel/contratos/locacao`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Obrigações/ }).or(page.getByText("Obrigações (água/luz)")).first().click();

    // Fluxo A: criar já exigindo transferência
    await page.getByRole("button", { name: "Nova obrigação" }).click();
    const modal = page.locator('[role="dialog"]').last();
    const contractSelect = modal.locator("select").first();
    const options = await contractSelect.locator("option").allInnerTexts();
    const alvo = options.findIndex((t) => t && !/Selecione/.test(t) && !/LOC-2026-0124/.test(t));
    await contractSelect.selectOption({ index: alvo });
    record("2. checkbox 'Exige transferência' visível no modal", await modal.getByText("Exige transferência de titularidade").count() > 0);
    await modal.getByText("Exige transferência de titularidade").click();
    await modal.getByRole("button", { name: "Criar" }).click();
    record("3. obrigação criada com status 'Transferência pendente'", await aparece(page.getByText("Transferência pendente")));
    await page.screenshot({ path: path.join(PRINTS, "01-pendente.png") });

    // Concluir sem dados: botão desabilitado
    await aparece(page.getByRole("button", { name: "Concluir transferência" }));
    await page.getByRole("button", { name: "Concluir transferência" }).first().click();
    const dlg = page.locator('[role="dialog"]').last();
    const concluir = dlg.getByRole("button", { name: "Concluir", exact: true });
    record("4. concluir sem comprovante e sem novo titular está bloqueado", await concluir.isDisabled());
    await pickPerson(page, dlg, "a");
    record("5. só com novo titular, ainda bloqueado (falta comprovante)", await concluir.isDisabled());
    await dlg.locator('input[type="file"]').setInputFiles(pdfPath);
    await page.waitForTimeout(2500);
    const erroUpload = await dlg.locator("text=/não está configurado|Erro/i").count();
    record("6. upload do comprovante aceito (sem erro de storage)", erroUpload === 0);
    await page.screenshot({ path: path.join(PRINTS, "02-modal-concluir.png") });
    record("7. com titular e comprovante o botão habilita", await concluir.isEnabled());
    await concluir.click();
    record("8. status vira 'Transferida' e comprovante 'Anexado'", (await aparece(page.getByText("Transferida", { exact: true }))) && (await aparece(page.getByText("Anexado", { exact: true }))));
    await page.screenshot({ path: path.join(PRINTS, "03-transferida.png") });

    // Fluxo B: obrigação ativa -> Solicitar transferência
    await page.getByRole("button", { name: "Nova obrigação" }).click();
    const modal2 = page.locator('[role="dialog"]').last();
    await modal2.locator("select").first().selectOption({ index: alvo });
    await modal2.getByRole("button", { name: "Criar" }).click();
    const solicitar = page.getByRole("button", { name: "Solicitar transferência" });
    record("9. obrigação ativa oferece 'Solicitar transferência'", await aparece(solicitar));
    await solicitar.first().click();
    const dlg2 = page.locator('[role="dialog"]').last();
    await pickPerson(page, dlg2, "a");
    await dlg2.getByRole("button", { name: "Solicitar", exact: true }).click();
    record("10. solicitação vira 'Transferência pendente' com ação de concluir", await aparece(page.getByRole("button", { name: "Concluir transferência" })));
    await page.screenshot({ path: path.join(PRINTS, "04-solicitada.png") });
  } catch (err) {
    record("exceção", false, err.message.split("\n")[0]);
    await page.screenshot({ path: path.join(PRINTS, "erro.png") }).catch(() => {});
  } finally {
    await browser.close();
  }
  const falhas = results.filter((r) => !r.ok).length;
  console.log(falhas === 0 ? "TODOS OK" : `${falhas} FALHA(S)`);
  process.exit(falhas === 0 ? 0 : 1);
})();
