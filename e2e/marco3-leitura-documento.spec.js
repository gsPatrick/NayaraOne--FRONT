// Marco 3 — leitura automática de documento (antivírus ClamAV + pdftotext/Tesseract) pela ficha do contato.
// Requer a API local com ANTIVIRUS_PROVIDER=clamav e OCR_PROVIDER=local e o clamd rodando.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require("os");

const BASE = "http://localhost:3000";
const PRINTS = path.join(__dirname, "prints-locacao");
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
const results = [];
function record(label, ok, detail) {
  results.push({ label, ok });
  console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? " — " + detail : ""}`);
}
async function aparece(locator, ms = 30000) {
  try { await locator.first().waitFor({ state: "visible", timeout: ms }); return true; } catch { return false; }
}
function buildPdf(lines) {
  const content = `BT /F1 14 Tf 50 780 Td 18 TL ${lines.map((l) => `(${l}) Tj T*`).join(" ")} ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "m3-doc-"));
  const eicarPath = path.join(dir, "eicar-teste.pdf");
  const irPath = path.join(dir, "ir-ficticio.pdf");
  const blankPdf = path.join(dir, "vazio.pdf");
  fs.writeFileSync(eicarPath, EICAR);
  fs.writeFileSync(irPath, buildPdf(["Nome: MARIA FICTICIA DA SILVA", "CPF: 529.982.247-25", "Renda mensal: R$ 4.500,00", "Emissao: 10/01/2026"]));
  fs.writeFileSync(blankPdf, buildPdf([" "]));
  execFileSync("pdftoppm", ["-r", "100", "-png", "-singlefile", blankPdf, path.join(dir, "ilegivel")]);
  const blankPng = path.join(dir, "ilegivel.png");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
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

    await page.goto(`${BASE}/painel/pessoas`, { waitUntil: "networkidle" });
    await page.getByText("Proponente Webhook", { exact: false }).first().click();
    await page.getByRole("button", { name: /Ler documento automaticamente/ }).waitFor();
    record("1. botão 'Ler documento automaticamente' na ficha do contato", true);

    // arquivo com assinatura de teste de antivírus
    await page.getByRole("button", { name: /Ler documento automaticamente/ }).click();
    let dlg = page.locator('[role="dialog"]').last();
    await dlg.locator('input[type="file"]').setInputFiles(eicarPath);
    await dlg.getByRole("button", { name: "Enviar e ler" }).click();
    record("2. arquivo de teste de antivírus é recusado com mensagem clara", await aparece(dlg.getByText(/rejeitado pelo antivírus/i)));
    await page.screenshot({ path: path.join(PRINTS, "m3-01-antivirus.png") });
    await dlg.getByRole("button", { name: "Cancelar" }).click();

    // PDF legível
    await page.getByRole("button", { name: /Ler documento automaticamente/ }).click();
    dlg = page.locator('[role="dialog"]').last();
    await dlg.locator("select").selectOption("IR");
    await dlg.locator('input[type="file"]').setInputFiles(irPath);
    await dlg.getByRole("button", { name: "Enviar e ler" }).click();
    record("3. PDF legível mostra origem e confiança", await aparece(dlg.getByText(/texto do PDF/)) && await aparece(dlg.getByText(/confiança de \d+%/)));
    const nome = await dlg.locator("#doc-field-name").inputValue().catch(() => "");
    const cpf = await dlg.locator("#doc-field-taxId").inputValue().catch(() => "");
    const renda = await dlg.locator("#doc-field-income").inputValue().catch(() => "");
    record("4. campos extraídos corretos (nome, CPF mascarado, renda em R$)", nome === "MARIA FICTICIA DA SILVA" && cpf === "529.982.247-25" && renda === "4.500,00", `${nome} | ${cpf} | ${renda}`);
    await page.screenshot({ path: path.join(PRINTS, "m3-02-leitura.png") });
    await dlg.getByRole("button", { name: "Confirmar dados e validar" }).click();
    record("5. após confirmar, o documento fica Verificado na ficha", await aparece(page.getByText("Verificado")));

    // ilegível
    await page.getByRole("button", { name: /Ler documento automaticamente/ }).click();
    dlg = page.locator('[role="dialog"]').last();
    await dlg.locator('input[type="file"]').setInputFiles(blankPng);
    await dlg.getByRole("button", { name: "Enviar e ler" }).click();
    record("6. documento ilegível gera aviso e pendência, sem dado inventado", await aparece(dlg.getByText("Documento ilegível")) && (await dlg.locator('input[id^="doc-field-"]').count()) === 0);
    record("7. documento ilegível não pode ser validado", await dlg.getByRole("button", { name: "Confirmar dados e validar" }).isDisabled());
    await page.screenshot({ path: path.join(PRINTS, "m3-03-ilegivel.png") });
  } catch (err) {
    record("exceção", false, err.message.split("\n")[0]);
    await page.screenshot({ path: path.join(PRINTS, "m3-erro.png") }).catch(() => {});
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const f = results.filter((r) => !r.ok).length;
  console.log(f ? `${f} FALHA(S)` : "TODOS OK");
  process.exit(f ? 1 : 0);
})();
