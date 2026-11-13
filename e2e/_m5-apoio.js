// Apoio do E2E de fechamento do Marco 5: preparo de dados fictícios pela API (login normal), arquivos de teste,
// login na tela e registro dos passos. A senha dos usuários fictícios vem SÓ de variável de ambiente.
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const FRONT = process.env.E2E_FRONT_URL || "http://localhost:5537";
const API = process.env.E2E_API_URL || "http://localhost:5534/api/v1";
const PASSWORD = process.env.E2E_PASSWORD;
const EMAIL = process.env.E2E_EMAIL || "ci-a-gestor@ci.nayaraone.test";
const OUT = path.join(__dirname, "prints-m5-fechamento");

function guard() {
  if (!PASSWORD) throw new Error("Defina E2E_PASSWORD (senha dos usuários fictícios do seed de dois tenants).");
  // Pilha descartável local: portas 55xx, a faixa 29xxx (UAT do Marco 5, agente M5ES) ou a 32xxx (agente M5VP); nunca a homologação.
  for (const u of [FRONT, API]) if (!/^http:\/\/(localhost|127\.0\.0\.1):(55\d\d|29\d\d\d|32\d\d\d)\b/.test(u)) throw new Error(`RECUSADO: ${u} não é a pilha descartável local (portas 55xx, 29xxx ou 32xxx).`);
  fs.mkdirSync(OUT, { recursive: true });
}

const results = [];
function record(label, ok, detail) {
  results.push({ label, ok: Boolean(ok), detail: detail || "" });
  console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function apiLogin(email = EMAIL) {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  const body = await r.json();
  if (!body.success) throw new Error(`login ${email}: ${body.error && body.error.message}`);
  const token = body.data.accessToken;
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  return { token, claims };
}

async function api(token, method, route, body) {
  const r = await fetch(`${API}${route}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json || json.success === false) throw new Error(`${method} ${route}: ${r.status} ${json && json.error ? `${json.error.code} ${json.error.message}` : ""}`);
  return json.data;
}

/** Pessoas e imóvel fictícios do cenário (dados de cadastro; o fluxo do Marco 5 é todo feito na tela). */
async function seedScenario(token) {
  const sfx = String(Date.now()).slice(-6);
  const person = (name) => api(token, "POST", "/people", { personType: "PF", legalName: `${name} Fictício E2E ${sfx}` });
  const landlord = await person("Locador");
  const tenant = await person("Locatário");
  const guarantor = await person("Fiador");
  const property = await api(token, "POST", "/properties", { title: `Apartamento Fictício E2E ${sfx}`, internalCode: `E2E-${sfx}`, propertyType: "RESIDENTIAL" });
  return { sfx, landlord, tenant, guarantor, property };
}

/** Arquivos de teste (PDF mínimo e PNG 1x1). */
function testFiles() {
  const pdf = path.join(OUT, "documento-ficticio.pdf");
  fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const png = path.join(OUT, "foto-ficticia.png");
  fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  return { pdf, png };
}

async function uiLogin(page) {
  await page.goto(`${FRONT}/entrar`, { waitUntil: "domcontentloaded" });
  const email = page.locator("input[type=email]");
  for (let i = 0; i < 5 && !(await visible(email, 3000)); i += 1) {
    const teamTab = page.getByText("Sou da equipe", { exact: false });
    if (await visible(teamTab, 5000)) await teamTab.first().click();
  }
  await page.waitForSelector("input[type=email]");
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.includes("/entrar"), { timeout: 60000 });
}

async function visible(locator, ms = 20000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: ms });
    return true;
  } catch {
    return false;
  }
}

/** Assinaturas da vistoria pela camada de serviço (ver _m5-fixture-assinatura-vistoria.js). */
function signInspectionByService(inspectionId, claims) {
  const apiDir = process.env.E2E_API_DIR;
  const dbUrl = process.env.E2E_DATABASE_URL;
  if (!apiDir || !dbUrl) throw new Error("Defina E2E_API_DIR e E2E_DATABASE_URL (banco descartável) para o preparo das assinaturas da vistoria.");
  const res = spawnSync(process.execPath, [path.join(__dirname, "_m5-fixture-assinatura-vistoria.js"), inspectionId, claims.group_id, claims.company_id, claims.sub], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: dbUrl, E2E_DISPOSABLE_DB: "1", LOG_LEVEL: "error" },
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`preparo das assinaturas falhou: ${res.stderr || res.stdout}`);
}

/** Simula um contrato ANTIGO gravado como CANCELLED (antes do livro) — UPDATE direto no banco descartável. */
function markLegacyCancelled(contractId) {
  const adminUrl = process.env.E2E_DATABASE_ADMIN_URL;
  if (!adminUrl || !/@(127\.0\.0\.1|localhost)[:/]/.test(adminUrl)) return false;
  if (!/^[0-9a-f-]{36}$/.test(contractId)) throw new Error("id de contrato inválido");
  const res = spawnSync("psql", [adminUrl, "-v", "ON_ERROR_STOP=1", "-Atc", `UPDATE legal.contracts SET status = 'CANCELLED' WHERE id = '${contractId}'`], { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`preparo do contrato legado falhou: ${res.stderr}`);
  return true;
}

function summary() {
  const fail = results.filter((r) => !r.ok);
  const line = `${results.length - fail.length}/${results.length} passos OK (${new Date().toISOString()})`;
  console.log(`\n=== ${line}`);
  fs.writeFileSync(path.join(OUT, "resultado.json"), JSON.stringify({ when: new Date().toISOString(), results }, null, 2));
  return fail.length === 0;
}

module.exports = { FRONT, API, OUT, guard, record, apiLogin, api, seedScenario, testFiles, uiLogin, visible, signInspectionByService, markLegacyCancelled, summary };
