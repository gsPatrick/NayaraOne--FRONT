// Mensagens de erro de parâmetros sem a chave técnica (M9-D200, reabertura F03).
// A API monta frases como 'O valor de "integration.registry.secret_scan_min_length" deve ser >= 24.'; a tela troca a chave pelo rótulo do campo.
const CHAVE_TECNICA = /[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+/g;

export function buildLabelMap(fields = []) {
  const map = {};
  for (const field of fields) if (field && field.key && field.label) map[field.key] = field.label;
  return map;
}

export function labelSettingMessage(message, labels = {}) {
  if (typeof message !== "string" || !message) return message;
  let out = message;
  for (const key of Object.keys(labels).sort((a, b) => b.length - a.length)) {
    out = out.split(`"${key}"`).join(`"${labels[key]}"`).split(key).join(`"${labels[key]}"`);
  }
  // Chave que a tela não conhece: nunca mostra o identificador técnico.
  return out.replace(/"?(governanca|integration|marketing|ia|analytics|bi|core)\.[a-z0-9_.]+"?/g, "este parâmetro").replace(/""/g, '"');
}

export function labelSettingError(err, labels, fallback) {
  const message = err?.message ? labelSettingMessage(err.message, labels) : "";
  return message || fallback;
}

// Parâmetro sensível (API: requiresMfa no dicionário, exige MFA recente de quem altera). O 403 desses códigos NÃO é falta de permissão: a verificação em
// duas etapas é pedida pelo <MfaStepUpHost/> (lib/api/client.js) e, se a pessoa cancelar ou não tiver MFA ativo, a aba mostra a frase abaixo em vez de
// "Sem permissão" (que travava a aba inteira).
const MFA_CODES = new Set(["MFA_STEP_UP_REQUIRED", "MFA_STEP_UP_CANCELLED", "MFA_REQUIRED_NOT_ENABLED"]);

export function isMfaSettingError(err) {
  return err?.status === 403 && MFA_CODES.has(err?.code);
}

/** 403 de permissão de verdade (perfil sem a permissão), nunca o pedido de MFA recente. */
export function isSettingForbidden(err) {
  return err?.status === 403 && !isMfaSettingError(err);
}

export function mfaSettingMessage(err) {
  if (err?.code === "MFA_REQUIRED_NOT_ENABLED") return "Este parâmetro só pode ser alterado com a verificação em duas etapas ativa. Ative o MFA no seu perfil e tente de novo.";
  if (err?.code === "MFA_STEP_UP_CANCELLED") return "Nada foi salvo: este parâmetro exige a confirmação do código da verificação em duas etapas, que não foi concluída.";
  return "Este parâmetro exige a confirmação recente do código da verificação em duas etapas. Confirme o código e salve de novo.";
}
