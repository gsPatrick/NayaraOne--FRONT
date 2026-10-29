// Parâmetro governanca.ui.cache_fresco_s (aba Governança): até quantos segundos o último 200 conta como atual (padrão 60).
// Lido uma vez por sessão; sem permissão de leitura de configurações (403) ou sem rede, vale o padrão do livro.
import { DEFAULT_FRESH_SECONDS } from "./cache";

export const FRESH_SETTING_KEY = "governanca.ui.cache_fresco_s";
let pending = null;

export function parseFreshSeconds(value) {
  const number = Number(value && typeof value === "object" && "value" in value ? value.value : value);
  return Number.isInteger(number) && number >= 1 && number <= 86400 ? number : DEFAULT_FRESH_SECONDS;
}

export function loadFreshSeconds(readSetting) {
  if (!pending) {
    const read = readSetting || (() => import("@/lib/api/settings").then((module) => module.getSetting(FRESH_SETTING_KEY)));
    pending = Promise.resolve().then(read).then(parseFreshSeconds).catch(() => DEFAULT_FRESH_SECONDS);
  }
  return pending;
}

export const resetFreshSeconds = () => { pending = null; };
