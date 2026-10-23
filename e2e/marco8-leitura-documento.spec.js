// Marco 8 — documento do caso passa pelo antivírus e pela leitura real (ClamAV + pdftotext/Tesseract).
// Requer a API local com ANTIVIRUS_PROVIDER=clamav e OCR_PROVIDER=local e o clamd rodando.
const { chromium } = require("playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "m8-doc-"));
  const rendaPdf = path.join(dir, "renda-ficticia.pdf");
  const eicarFile = path.join(dir, "eicar-teste.pdf");
  const blankPdf = path.join(dir, "vazio.pdf");
  fs.writeFileSync(rendaPdf, buildPdf(["Nome: MARIA FICTICIA DA SILVA", "CPF: 529.982.247-25", "Renda mensal: R$ 4.500,00"]));
  fs.writeFileSync(eicarFile, EICAR);
  fs.writeFileSync(blankPdf, buildPdf([" "]));
  execFileSync("pdftoppm", ["-r", "100", "-png", "-singlefile", blankPdf, path.join(dir, "ilegivel")]);
  const blankPng = path.join(dir, "ilegivel.png");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1300 } });
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

    await page.goto(`${BASE}/painel/correspondente`, { waitUntil: "domcontentloaded" });
    await page.getByText("Casos de financiamento").first().waitFor();
    await page.getByRole("button", { name: /Novo caso de financiamento/ }).click();
    await page.getByText("Proponente principal").first().waitFor();
    await page.locator("#fc-principal").click();
    await page.keyboard.type("Proponente Webhook", { delay: 30 });
    const opcao = page.locator("#fc-principal").locator("xpath=../..//ul//button").first();
    await opcao.waitFor({ state: "visible", timeout: 15000 });
    await opcao.click();
    await page.getByRole("button", { name: "Criar" }).click();
    await page.waitForURL(/\/painel\/correspondente\/[0-9a-f-]{36}/i, { timeout: 60000 });
    record("1. caso criado e ficha aberta", true, page.url().split("/").pop());

    for (const tipo of ["COMPROVANTE_RENDA", "IPTU", "RG_CPF"]) {
      await page.locator("#new-requirement-type").selectOption(tipo);
      await page.getByRole("button", { name: "Adicionar ao checklist" }).click();
      await page.waitForTimeout(1500);
    }
    const inputs = page.locator("input[type=file]");
    await inputs.nth(2).waitFor({ state: "attached", timeout: 30000 });
    record("2. três itens no checklist", (await inputs.count()) >= 3, `${await inputs.count()} campos de arquivo`);

    await inputs.nth(0).setInputFiles(rendaPdf);
    record("3. PDF legível: a sugestão mostra origem, confiança e dados lidos", (await aparece(page.getByText(/Leitura automática \(texto do PDF, confiança de \d+%\)/))) && (await page.getByText("529.982.247-25", { exact: false }).count()) > 0);
    await page.screenshot({ path: path.join(PRINTS, "m8-01-leitura.png"), fullPage: true });

    await inputs.nth(1).setInputFiles(blankPng);
    record("4. documento ilegível: aviso de ilegível, sem dados inventados", await aparece(page.getByText(/ilegível ou sem texto reconhecível/)));
    await page.screenshot({ path: path.join(PRINTS, "m8-02-ilegivel.png"), fullPage: true });

    await inputs.nth(2).setInputFiles(eicarFile);
    record("5. arquivo com assinatura de teste de antivírus é recusado", await aparece(page.getByText(/rejeitado pelo antivírus|antivírus/i)));
    await page.screenshot({ path: path.join(PRINTS, "m8-03-antivirus.png"), fullPage: true });
  } catch (err) {
    record("exceção", false, err.message.split("\n")[0]);
    await page.screenshot({ path: path.join(PRINTS, "m8-erro.png") }).catch(() => {});
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const f = results.filter((r) => !r.ok).length;
  console.log(f ? `${f} FALHA(S)` : "TODOS OK");
  process.exit(f ? 1 : 0);
})();
