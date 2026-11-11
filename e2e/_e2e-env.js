'use strict';

// Senha do usuário de teste dos specs E2E: vem SEMPRE do ambiente (E2E_PASSWORD). Nenhum spec guarda senha em texto
// claro (verificação independente do Marco 6). Sem a variável o spec para com uma mensagem clara.
function requireE2ePassword() {
  const value = process.env.E2E_PASSWORD;
  if (!value) throw new Error('Defina E2E_PASSWORD (senha do usuário de teste do banco descartável) para rodar este spec.');
  return value;
}

module.exports = { requireE2ePassword };
