// M9-D643/D654/D662 (reabertura F08) — textos dos cartões do painel de BI que não são número: a dica (tooltip) e a explicação do "Dado incompleto".
// Só descreve o que a API já devolveu (`quality`, `freshness`, `refreshedAt`); nenhum indicador é calculado aqui. O código da métrica aparece só na dica.
import { formatDateTime } from "@/lib/format";
import { metricTitle } from "@/lib/analytics/ptLabels";

/** Dica do cartão: o rótulo em português do painel, o código técnico entre parênteses e a versão (ou "sem versão publicada"). */
export function metricTooltip(widget, metric) {
  const code = metric.metricCode || widget.metricCode;
  const version = metric.version ? `versão ${metric.version}` : "sem versão publicada";
  return `${metricTitle(code, widget.title)} (${code}), ${version}`;
}

/** Por que o cartão mostra "Dado incompleto" e quando o dado foi atualizado pela última vez. Texto corrido, sem código de métrica, de verificação ou de tabela. */
export function incompleteReason(metric) {
  if (!metric || !metric.incomplete) return null;
  const failed = (metric.quality && metric.quality.checks ? metric.quality.checks.length : 0);
  const inherited = (metric.quality && metric.quality.inheritedFrom ? metric.quality.inheritedFrom.length : 0);
  const unread = metric.freshness && metric.freshness.state === "UNKNOWN";
  let why;
  if (failed) why = `${failed === 1 ? "Uma verificação de qualidade reprovou" : `${failed} verificações de qualidade reprovaram`} este número.`;
  else if (inherited) why = "Um dos indicadores que compõem este número não está confiável.";
  else if (unread) why = "O cálculo deste indicador ainda não foi gravado para a data do painel (fonte sem atualização).";
  else why = "A fonte deste indicador não trouxe dados suficientes para a data do painel.";
  const when = metric.refreshedAt ? formatDateTime(metric.refreshedAt) : null;
  return `${why} ${when ? `Última atualização: ${when}.` : "Última atualização: nenhuma até agora."}`;
}
