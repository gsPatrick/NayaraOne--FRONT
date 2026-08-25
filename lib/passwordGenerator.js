// Gerador de senha forte no client, via Web Crypto (crypto.getRandomValues) — nunca Math.random
// pra segredo. Garante pelo menos 1 caractere de cada classe (a API exige mínimo 8 caracteres,
// ver USER_WEAK_PASSWORD em NayaraOne--API/src/features/users/users.service.js).

const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function randomChar(pool) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return pool[bytes[0] % pool.length];
}

function shuffle(chars) {
  const arr = [...chars];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function generateStrongPassword(length = 14) {
  const required = [randomChar(LOWER), randomChar(UPPER), randomChar(DIGITS), randomChar(SYMBOLS)];
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => randomChar(ALL));
  return shuffle([...required, ...rest]);
}
