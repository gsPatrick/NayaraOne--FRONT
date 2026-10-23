// Marco 6 — margem mínima configurável na página Obras > Configurações (sem publicar valor no banco compartilhado).
const { chromium } = require("playwright");
const path = require("path");
const BASE = "http://localhost:3000";
const results = [];
function record(label, ok, detail) {
  results.push({ label, ok });
  console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? " — " + detail : ""}`);
}
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
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
    await page.goto(`${BASE}/painel/obras/configuracoes`, { waitUntil: "networkidle" });
    await page.getByText("Margem mínima da obra").first().waitFor();
    record("1. card 'Margem mínima da obra' na página de configurações", true);
    const publicar = page.getByRole("button", { name: /Publicar margem mínima/ });
    const vazio = await page.locator("#margin-min").inputValue();
    if (vazio === "") record("2. sem valor, o botão publicar fica desabilitado", await publicar.isDisabled());
    else record("2. regra vigente já carregada no formulário", true, `valor ${vazio}`);
    await page.fill("#margin-min", "150");
    record("3. acima de 100% continua desabilitado", await publicar.isDisabled());
    await page.fill("#margin-min", "12,5");
    record("4. valor válido habilita o botão", await publicar.isEnabled());
    record("5. modo alertar/bloquear visível", (await page.getByText("Bloquear aprovação").count()) > 0);
    await page.screenshot({ path: path.join(__dirname, "prints-locacao", "05-config-margem.png"), fullPage: true });
  } catch (err) {
    record("exceção", false, err.message.split("\n")[0]);
  } finally {
    await browser.close();
  }
  const f = results.filter((r) => !r.ok).length;
  console.log(f ? `${f} FALHA(S)` : "TODOS OK");
  process.exit(f ? 1 : 0);
})();
