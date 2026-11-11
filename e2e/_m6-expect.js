'use strict';

// Apoio dos specs de Obras (verificação independente do Marco 6): expect() que falha de verdade (o passo só é "OK" se a
// conferência passar), registro dos passos, cliente da API (login pelo ambiente, sem senha no arquivo) e login na tela.
const fs = require('fs');

const results = [];

class ExpectError extends Error {}

function expect(actual) {
  const fail = (msg) => { throw new ExpectError(msg); };
  const api = {
    toBe: (expected) => { if (actual !== expected) fail(`esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`); },
    toContain: (part) => { if (!String(actual).includes(part)) fail(`esperado conter ${JSON.stringify(part)} em ${JSON.stringify(actual)}`); },
  };
  api.not = {
    toBe: (expected) => { if (actual === expected) fail(`não devia ser ${JSON.stringify(expected)}`); },
    toContain: (part) => { if (String(actual).includes(part)) fail(`não devia conter ${JSON.stringify(part)} em ${JSON.stringify(actual)}`); },
  };
  return api;
}
expect.visible = async (locator, timeout = 30000) => {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
  } catch (err) {
    throw new ExpectError(`elemento não apareceu na tela: ${locator}`);
  }
};
expect.notVisible = async (locator, timeout = 5000) => {
  try {
    await locator.first().waitFor({ state: 'hidden', timeout });
  } catch (err) {
    throw new ExpectError(`elemento continuou na tela: ${locator}`);
  }
};

async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`[OK] ${name}`);
  } catch (err) {
    results.push({ name, ok: false, detail: err.message });
    console.log(`[FALHOU] ${name} — ${err.message}`);
    throw err;
  }
}

function report() {
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== Resumo: ${ok}/${results.length} passos conferidos ===`);
  for (const r of results) console.log(`  ${r.ok ? '✔' : '✖'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  if (results.some((r) => !r.ok) || !results.length) process.exitCode = 1;
}

async function apiClient(email, password) {
  const base = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';
  const call = async (token, method, path, body) => {
    const r = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${j && j.error ? j.error.code : ''}`);
    return j.data;
  };
  const { accessToken } = await call(null, 'POST', '/auth/login', { email, password });
  return (method, path, body) => call(accessToken, method, path, body);
}

async function login(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/entrar`, { waitUntil: 'domcontentloaded' });
  const teamTab = page.getByText('Sou da equipe', { exact: false });
  await teamTab.first().waitFor({ timeout: 70000 }).catch(() => {});
  for (let i = 0; i < 40 && !(await page.locator('input[type=email]').count()); i += 1) {
    if (await teamTab.count()) await teamTab.first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 70000 });
}

/** JPEG pequeno de conteúdo único (o antivírus examina e o hash não repete). */
function fixtureJpeg(file, seed) {
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(`evidencia ${seed} ${Math.random()}`)]));
  return file;
}

module.exports = { expect, step, report, apiClient, login, fixtureJpeg };
