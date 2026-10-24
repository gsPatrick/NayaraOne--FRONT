// Marco 6 — cadastra a margem mínima de 10% (configuração de homologação) na Empresa Dev, pela tela, conforme autorização
// da Nayara, e confere o histórico de versões. Rodar UMA vez: cada execução publica uma nova versão.
const { chromium } = require("playwright");
const path = require("path");
const BASE = "http://localhost:3000";
const PRINTS = path.join(__dirname, "prints-locacao");
const results = [];
function record(label, ok, detail) { results.push({ label, ok }); console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? " — " + detail : ""}`); }
async function aparece(l, ms = 30000) { try { await l.first().waitFor({ state: "visible", timeout: ms }); return true; } catch { return false; } }
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
  page.setDefaultTimeout(60000);
  try {
    await page.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
    const aba = page.getByText("Sou da equipe", { exact: false });
    if (await aba.count()) await aba.first().click();
    await page.waitForSelector("input[type=email]");
    await page.fill("input[type=email]", "admin@nayaraone.dev");
    await page.fill("input[type=password]", "DevAdmin#2026");
    await page.click("button[type=submit]");
    await page.waitForURL((u) => !u.pathname.includes("/entrar"));
    await page.goto(`${BASE}/painel/obras/configuracoes`, { waitUntil: "networkidle" });
    await page.getByText("Margem mínima da obra").first().waitFor();
    record("1. empresa está sem regra antes de publicar", await aparece(page.getByText("Margem mínima não configurada")));
    await page.fill("#margin-min", "10");
    await page.fill("#margin-label", "Configuração de homologação (não é a política definitiva da imobiliária)");
    await page.getByRole("button", { name: "Publicar margem mínima" }).click();
    record("2. publicada: regra vigente de 10%", await aparece(page.getByText(/Regra vigente: margem mínima de 10%/)));
    record("3. histórico mostra a v1 ativa com a identificação de homologação", (await aparece(page.getByText("Configuração de homologação (não é a política definitiva da imobiliária)"))) && (await aparece(page.getByText("Ativa", { exact: true }))));
    record("4. o botão 'Desativar margem mínima' aparece", await aparece(page.getByRole("button", { name: "Desativar margem mínima" })));
    await page.screenshot({ path: path.join(PRINTS, "margem-10-homologacao.png"), fullPage: true });
  } catch (e) {
    record("exceção", false, e.message.split("\n")[0]);
    await page.screenshot({ path: path.join(PRINTS, "margem-erro.png") }).catch(() => {});
  } finally { await browser.close(); }
  const f = results.filter((r) => !r.ok).length;
  console.log(f ? `${f} FALHA(S)` : "TODOS OK");
  process.exit(f ? 1 : 0);
})();
