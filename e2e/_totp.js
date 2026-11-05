'use strict';
/** TOTP (RFC 6238, SHA-1, 6 dígitos, passo de 30 s) calculado na hora a partir do segredo da pilha DESCARTÁVEL (E2E_TOTP_SECRET). Sem dependência externa. */
const crypto = require('crypto');
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(texto) {
  let bits = ''; for (const c of texto.replace(/=+$/, '').toUpperCase()) bits += ALFABETO.indexOf(c).toString(2).padStart(5, '0');
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totp(segredo, agora = Date.now(), deslocamento = 0) {
  const contador = Math.floor(agora / 30000) + deslocamento;
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(contador));
  const h = crypto.createHmac('sha1', base32(segredo)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, '0');
}
/** Código válido agora; se faltarem menos de 4 s para virar o passo, espera o próximo (evita a janela de borda). */
async function codigoAgora(segredo) {
  const resto = 30000 - (Date.now() % 30000);
  if (resto < 4000) await new Promise((r) => setTimeout(r, resto + 300));
  return totp(segredo);
}
module.exports = { totp, codigoAgora, base32 };
