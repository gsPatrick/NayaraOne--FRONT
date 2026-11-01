// Textos e formatos do painel Integrações > Saúde (M9-D224). Nenhum valor some: o que falta aparece com o motivo.

export const SAUDE_LABEL = { HEALTHY: "Saudável", DEGRADED: "Degradada", DOWN: "Fora do ar", UNKNOWN: "Sem dados" };
export const SAUDE_TONE = { HEALTHY: "success", DEGRADED: "warning", DOWN: "danger", UNKNOWN: "neutral" };
export const CIRCUITO_LABEL = { CLOSED: "Fechado", OPEN: "Aberto", HALF_OPEN: "Em teste" };
export const CIRCUITO_TONE = { CLOSED: "success", OPEN: "danger", HALF_OPEN: "warning" };
export const AMBIENTE_LABEL = { SANDBOX: "Laboratório", HOMOLOG: "Homologação", PRODUCTION: "Produção" };
export const CRITICIDADE_LABEL = { CRITICAL: "Crítica", HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
export const ALERTA_LABEL = {
  PROVIDER_DOWN: "Fora do ar",
  ERROR_RATE_UP: "Aumento de erros",
  AUTH_FAILURE: "Credencial recusada",
  SECRET_EXPIRING: "Credencial vencendo",
  SYNC_STALLED: "Sync parado",
  QUOTA_LOW: "Cota baixa",
};
export const ALERTA_TONE = { LOW: "info", MEDIUM: "warning", HIGH: "danger", CRITICAL: "critical" };

const numero = new Intl.NumberFormat("pt-BR");

export function formatPercent(v) {
  return v === null || v === undefined ? "Sem chamadas na última hora" : `${numero.format(v)}%`;
}

export function formatMs(v) {
  return v === null || v === undefined ? "Sem chamadas" : `${numero.format(v)} ms`;
}

// p95 e p99 numa célula só: sem chamadas nas duas, o aviso aparece uma vez (antes saía "Sem chamadas / Sem chamadas").
export function formatLatency(p95, p99) {
  const vazio = (v) => v === null || v === undefined;
  if (vazio(p95) && vazio(p99)) return "Sem chamadas";
  return `${formatMs(p95)} / ${formatMs(p99)}`;
}

export const COTA_NAO_INFORMADA = "Não informada pelo fornecedor; nada a fazer";
export const SEM_SINCRONIZACAO = "Ainda sem sincronização; rode o fluxo da integração";

export function formatCount(v) {
  return v === null || v === undefined ? "Não informado" : numero.format(v);
}

export function formatDateTime(v, vazio) {
  if (!v) return vazio;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? vazio : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatDays(v) {
  if (v === null || v === undefined) return "Sem vencimento";
  if (v < 0) return `Vencida há ${Math.abs(Math.floor(v))} dia(s)`;
  return `${Math.floor(v)} dia(s)`;
}
