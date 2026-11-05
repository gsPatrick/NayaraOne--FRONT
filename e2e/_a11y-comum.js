'use strict';

/** Apoio dos specs de acessibilidade com navegador: navegador por variável (E2E_BROWSER=chromium|firefox|webkit), login e registro de achados. */
const playwright = require('playwright');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

function navegador() { return playwright[process.env.E2E_BROWSER || 'chromium']; }

async function abrir(viewport = { width: 1280, height: 800 }, extra = {}) {
  const browser = await navegador().launch();
  const context = await browser.newContext({ viewport, ...extra });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  return { browser, context, page };
}

async function entrar(page) {
  const email = process.env.E2E_EMAIL; const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Sou da equipe/i }).click();
  await page.waitForSelector('input[type=email]');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'));
}

function registro(prefixo) {
  const achados = []; const estado = { falhas: 0 };
  const reg = (ok, texto) => { if (!ok) estado.falhas += 1; achados.push(`${ok ? '[OK ]' : '[FALHA]'} ${texto}`); console.log(achados[achados.length - 1]); };
  return { reg, achados, estado, prefixo };
}

const API_URL = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';

/** Chamada direta à API da pilha DESCARTÁVEL como o admin de teste (login, MFA recente pelo segredo TOTP, JSON). Só para montar/limpar dados do teste. */
async function api() {
  const { codigoAgora } = require('./_totp');
  const post = async (caminho, corpo, token, metodo = 'POST') => {
    const r = await fetch(`${API_URL}${caminho}`, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };
  const login = await post('/auth/login', { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD });
  const token = login.json.data && login.json.data.accessToken;
  if (!token) throw new Error('login na API falhou');
  if (process.env.E2E_TOTP_SECRET) await post('/users/me/mfa/verify', { code: await codigoAgora(process.env.E2E_TOTP_SECRET) }, token);
  return { post: (c, b, m) => post(c, b, token, m), token };
}

// No Safari/WebKit o Tab só passa por campos de texto (preferência "Pressionar Tab para destacar cada item" desligada, que é o padrão); botões e links se alcançam com Option+Tab.
const webkit = (process.env.E2E_BROWSER || 'chromium') === 'webkit';
const TAB = webkit ? 'Alt+Tab' : 'Tab';
const STAB = webkit ? 'Alt+Shift+Tab' : 'Shift+Tab';

/** Intercepta chamadas à API (outra origem): responde a consulta OPTIONS (CORS) na hora e entrega o resto a fn(rota, cabecalhosCors). Necessário no WebKit. */
async function interceptarApi(page, regex, fn) {
  const cors = { 'access-control-allow-origin': BASE_URL, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
  await page.route(regex, async (r) => (r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: cors }) : fn(r, cors)));
}

module.exports = { interceptarApi, TAB, STAB, API_URL, api, BASE_URL, abrir, entrar, registro, navegador };
