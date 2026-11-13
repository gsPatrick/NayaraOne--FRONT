// Apoio do E2E da jornada do CRM do Marco 3 (M3-25): pilha DESCARTÁVEL local (portas 35xxx), `expect()` com espera para a tela,
// login na tela e chamadas à API só para o que não tem tela (agendar visita pela rota do livro) e para conferir o vínculo gravado.
// Senha e segredo do MFA do usuário fictício vêm SÓ de variável de ambiente (gerados pelo preparo da pilha).
"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const FRONT = process.env.E2E_FRONT_URL || "http://127.0.0.1:35701";
const API = process.env.E2E_API_URL || "http://127.0.0.1:35700/api/v1";
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const TOTP_SECRET = process.env.E2E_TOTP_SECRET;
const OUT = path.join(__dirname, "prints-m3ca-jornada");

function guard() {
  if (!EMAIL || !PASSWORD || !TOTP_SECRET) throw new Error("Defina E2E_EMAIL, E2E_PASSWORD e E2E_TOTP_SECRET (usuário fictício da pilha descartável).");
  for (const u of [FRONT, API]) if (!/^http:\/\/(localhost|127\.0\.0\.1):35\d\d\d\b/.test(u)) throw new Error(`RECUSADO: ${u} não é a pilha descartável local (portas 35xxx).`);
  fs.mkdirSync(OUT, { recursive: true });
}

const steps = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** expect(locator) com espera (tela) e expect(valor) imediato; cada passo fica registrado no resumo. */
function expect(target, label) {
  const isLocator = target && typeof target.waitFor === "function";
  const done = (ok, detail) => {
    steps.push({ label, ok, detail: detail || "" });
    console.log(`[${ok ? "OK " : "FAIL"}] ${label}${detail ? ` — ${detail}` : ""}`);
  };
  const run = async (fn, detail) => {
    try {
      await fn();
      done(true, detail);
    } catch (err) {
      done(false, err.message.split("\n")[0]);
      throw err;
    }
  };
  return {
    toBeVisible: (timeout = 45000) => run(() => target.first().waitFor({ state: "visible", timeout })),
    toBeHidden: (timeout = 45000) => run(() => target.first().waitFor({ state: "hidden", timeout })),
    toContainText: (text, timeout = 45000) => run(async () => {
      const limit = Date.now() + timeout;
      let last = "";
      while (Date.now() < limit) {
        last = (await target.first().innerText().catch(() => "")) || "";
        if (last.includes(text)) return;
        await sleep(500);
      }
      throw new Error(`esperava "${text}", veio "${last.slice(0, 120)}"`);
    }, text),
    toBe: (expected) => run(async () => assert.deepEqual(isLocator ? await target.first().innerText() : target, expected), JSON.stringify(expected)),
    toMatch: (re) => run(async () => assert.match(String(isLocator ? await target.first().innerText() : target), re), String(re)),
    toBeTruthy: () => run(async () => assert.ok(target), String(target).slice(0, 80)),
  };
}

async function login(page) {
  await page.goto(`${FRONT}/entrar`, { waitUntil: "networkidle" });
  const email = page.locator("input[type=email]");
  for (let i = 0; i < 5 && !(await email.isVisible().catch(() => false)); i += 1) {
    await page.getByText("Sou da equipe", { exact: false }).first().click().catch(() => {});
    await email.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  }
  await page.fill("input[type=email]", EMAIL);
  await page.fill("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.includes("/entrar"), { timeout: 90000 });
}

async function apiToken() {
  const r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const body = await r.json();
  if (!body.success) throw new Error(`login API: ${body.error && body.error.message}`);
  return body.data.accessToken;
}

async function api(token, method, route, body) {
  const r = await fetch(`${API}${route}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const json = await r.json().catch(() => null);
  if (!r.ok || !json || json.success === false) throw new Error(`${method} ${route}: ${r.status} ${json && json.error ? `${json.error.code} ${json.error.message}` : ""}`);
  return json.data;
}

function testPdf() {
  const pdf = path.join(OUT, "documento-ficticio.pdf");
  fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  return pdf;
}

function summary() {
  const ok = steps.filter((s) => s.ok).length;
  console.log(`\n=== Resumo: ${ok}/${steps.length} passos OK ===`);
  fs.writeFileSync(path.join(OUT, "resultado.json"), JSON.stringify({ when: new Date().toISOString(), steps }, null, 2));
  return ok === steps.length && steps.length > 0;
}

module.exports = { FRONT, API, OUT, TOTP_SECRET, guard, expect, login, apiToken, api, testPdf, summary, sleep };
