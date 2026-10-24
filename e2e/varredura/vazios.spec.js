// Varredura de telas: procura texto vazio ou de preenchimento ("—", "Não informado", "undefined", "null", "NaN",
// célula vazia) em todas as telas do painel e em algumas fichas de detalhe. Sai com código 1 se achar algo.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const ROTAS = fs.readFileSync(path.join(__dirname, "..", "..", "app", "painel", "_nav.js"), "utf8")
  .match(/href:\s*"(\/painel[^"]*)"/g).map((x) => x.match(/"(.+)"/)[1]).filter((v, i, a) => a.indexOf(v) === i && !/\[/.test(v));
const achados = [];

async function varrer(page, rota) {
  const r = await page.evaluate(() => {
    const out = [];
    const ruim = /^(—|–|-|--|n\/a|null|undefined|nan)$/i;
    const texto = /não informad|nao informad|undefined|\[object|\bNaN\b|\bnull\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}|\d{4}-\d{2}-\d{2}T\d{2}:/i;
    document.querySelectorAll("td").forEach((td) => {
      const t = td.innerText.trim();
      const idx = [...td.parentElement.children].indexOf(td);
      const tabela = td.closest("table");
      const cab = ([...(tabela ? tabela.querySelectorAll("thead th") : [])][idx]?.innerText || "").trim().toLowerCase();
      const temControle = td.querySelector("button, a, input, select, svg, img") || [...td.querySelectorAll("*")].some((e) => { const c = getComputedStyle(e, "::after").content; return c && c !== "none" && c !== "normal" && c !== '""'; });
      if ((t === "" && !temControle && true) || ruim.test(t)) out.push(`célula "${t || "(vazia)"}" na coluna "${cab || "?"}": ${td.parentElement.innerText.replace(/\s+/g, " ").slice(0, 110)}`);
    });
    document.querySelectorAll("dd, p, span, div").forEach((el) => {
      if (el.children.length) return;
      const t = el.innerText.trim();
      if (ruim.test(t)) out.push(`texto "${t}" em <${el.tagName.toLowerCase()} class="${(el.className || "").toString().slice(0, 40)}"> perto de: ${(el.parentElement?.innerText || "").replace(/\s+/g, " ").slice(0, 90)}`);
    });
    const corpo = document.body.innerText;
    corpo.split("\n").forEach((l) => { const m = l.match(texto); if (m) out.push(`texto técnico/genérico "${m[0]}" em: ${l.trim().slice(Math.max(0, m.index - 50), m.index + 70)}`); });
    return out;
  });
  r.forEach((m) => achados.push(`${rota} → ${m}`));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  await page.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
  const aba = page.getByText("Sou da equipe", { exact: false });
  if (await aba.count()) await aba.first().click();
  await page.waitForSelector("input[type=email]");
  await page.fill("input[type=email]", "admin@nayaraone.dev");
  await page.fill("input[type=password]", "DevAdmin#2026");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.includes("/entrar"));
  const detalhes = new Set();
  for (const rota of ROTAS) {
    try {
      await page.goto(BASE + rota, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1800);
      await varrer(page, rota);
      const links = await page.evaluate((r) => [...document.querySelectorAll("a[href^='/painel/']")].map((a) => a.getAttribute("href")).filter((h) => h.startsWith(r + "/") && !h.endsWith("/novo") && h.split("/").length === r.split("/").length + 1).slice(0, 2), rota);
      links.forEach((l) => detalhes.add(l));
    } catch (e) { achados.push(`${rota} → erro ao abrir: ${e.message.split("\n")[0]}`); }
  }
  for (const rota of detalhes) {
    try {
      await page.goto(BASE + rota, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1800);
      await varrer(page, rota);
    } catch (e) { achados.push(`${rota} → erro ao abrir: ${e.message.split("\n")[0]}`); }
  }
  await browser.close();
  console.log(`${ROTAS.length} telas e ${detalhes.size} fichas varridas`);
  const unicos = [...new Set(achados)];
  unicos.forEach((a) => console.log("ACHADO: " + a));
  console.log(unicos.length ? `${unicos.length} ACHADO(S)` : "NENHUM ACHADO");
  process.exit(unicos.length ? 1 : 0);
})();
