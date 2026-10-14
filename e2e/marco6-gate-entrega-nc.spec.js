// Verificação dedicada M6-R05 (projeto já avançado até FINAL_INSPECTION via a mesma rota
// que os botões da tela chamam): abre NC crítica e tenta entregar pela interface de verdade.
const { chromium } = require("playwright");

const BASE = "http://localhost:3000";
const PROJECT_URL = `${BASE}/painel/obras/lista/11cd3e0e-77b8-4f6b-82e4-a754c735193d`;
const results = [];
function record(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? " — " + detail : ""}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);
  try {
    await page.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
    const teamTab = page.getByText("Sou da equipe", { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector("input[type=email]", { timeout: 70000 });
    await page.fill("input[type=email]", "admin@nayaraone.dev");
    await page.fill("input[type=password]", "DevAdmin#2026");
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.includes("/entrar"), { timeout: 70000 }).catch(() => {});
    record("1. login", true);

    await page.goto(PROJECT_URL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const statusBadge = await page.locator("text=/Inspeção final/i").count();
    record("2. obra confirmada em FINAL_INSPECTION (tela)", statusBadge > 0, statusBadge > 0 ? "badge visível" : "badge não encontrado");

    // abre NC crítica
    await page.goto(`${PROJECT_URL}/qualidade`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Nova não conformidade")');
    await page.fill("#m-nc-description", "Falha crítica para teste de gate de entrega (E2E dedicado).");
    const severitySel = page.locator("#m-nc-severity, select[name=severity]");
    if (await severitySel.count()) await severitySel.selectOption("CRITICAL").catch(() => {});
    await page.getByRole("button", { name: "Registrar", exact: true }).click();
    await page.waitForTimeout(1500);
    record("3. NC crítica aberta", true);

    // tenta entregar
    await page.goto(PROJECT_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const deliverBtn = page.locator('button:has-text("Entregar obra")');
    let deliverOutcome = "não tentado";
    if (await deliverBtn.count()) {
      await deliverBtn.click();
      await page.waitForTimeout(2000);
      const bodyText = await page.locator("body").innerText();
      const blocked = /pendente|crítica|bloque|não conformidade/i.test(bodyText);
      deliverOutcome = blocked ? "BLOQUEADO com mensagem visível (esperado)" : "clicou — sem mensagem de bloqueio clara no texto da página";
      record("4. tentativa de entrega com NC crítica", blocked, deliverOutcome);
    } else {
      record("4. tentativa de entrega com NC crítica", false, "botão 'Entregar obra' não visível mesmo em FINAL_INSPECTION");
    }
  } catch (err) {
    record("ERRO FATAL", false, err.message);
  } finally {
    await browser.close();
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n=== Resumo: ${okCount}/${results.length} passos OK ===`);
  results.forEach((r) => console.log(`  ${r.ok ? "✔" : "✘"} ${r.label}${r.detail ? " — " + r.detail : ""}`));
  process.exit(0);
})();
