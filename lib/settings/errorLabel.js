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
