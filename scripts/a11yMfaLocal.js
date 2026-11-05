#!/usr/bin/env node
'use strict';

/**
 * MFA TOTP do admin de teste na pilha LOCAL DESCARTÁVEL, para os testes de acessibilidade de criar/excluir papel (a11y-mfa-excluir-papel.spec.js e roteiro de
 * VoiceOver). Recusa qualquer API que não seja localhost. O segredo fica em ~/.nayara-a11y-totp (fora do repositório, modo 600) e nunca é impresso.
 *
 *   E2E_EMAIL=admin@nayaraone.dev E2E_PASSWORD=... node scripts/a11yMfaLocal.js ligar     (cadastra o MFA e guarda o segredo)
 *   node scripts/a11yMfaLocal.js codigo                                                    (imprime o código de 6 dígitos de agora, para digitar no navegador)
 *   E2E_EMAIL=... E2E_PASSWORD=... node scripts/a11yMfaLocal.js desligar                   (desliga o MFA e apaga o segredo: pilha como era)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { codigoAgora } = require('../e2e/_totp');
const API = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';
const ARQ = path.join(os.homedir(), '.nayara-a11y-totp');

async function chamar(caminho, corpo, token) {
  const r = await fetch(`${API}${caminho}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo || {}) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
async function entrar() {
  const l = await chamar('/auth/login', { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD });
  if (!l.json.data || !l.json.data.accessToken) throw new Error('login falhou (E2E_EMAIL e E2E_PASSWORD da pilha local)');
  return l.json.data.accessToken;
}

async function main() {
  const [, , acao] = process.argv;
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(`${API}/`)) throw new Error(`recusado: a API ${API} não é local`);
  if (acao === 'codigo') { console.log(await codigoAgora(fs.readFileSync(ARQ, 'utf8').trim())); return; }
  const token = await entrar();
  if (acao === 'ligar') {
    const s = await chamar('/users/me/mfa/setup', {}, token);
    if (s.status !== 200) throw new Error(`setup: ${s.status} ${JSON.stringify(s.json.error || {})}`);
    const segredo = new URL(s.json.data.otpauthUri).searchParams.get('secret');
    fs.writeFileSync(ARQ, segredo, { mode: 0o600 });
    const c = await chamar('/users/me/mfa/confirm', { code: await codigoAgora(segredo) }, token);
    if (c.status !== 200) throw new Error(`confirm: ${c.status} ${JSON.stringify(c.json.error || {})}`);
    console.log('MFA ligado; segredo guardado em ~/.nayara-a11y-totp. Para o código de agora: node scripts/a11yMfaLocal.js codigo');
  } else if (acao === 'desligar') {
    const segredo = fs.readFileSync(ARQ, 'utf8').trim();
    const d = await chamar('/users/me/mfa/disable', { code: await codigoAgora(segredo) }, token);
    if (d.status !== 200) throw new Error(`disable: ${d.status} ${JSON.stringify(d.json.error || {})}`);
    fs.unlinkSync(ARQ);
    console.log('MFA desligado e segredo apagado.');
  } else throw new Error('Uso: ligar | codigo | desligar');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
