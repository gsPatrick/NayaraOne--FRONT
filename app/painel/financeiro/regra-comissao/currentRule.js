// Regra de comissão vigente na tela (Financeiro > Regra de comissão).
// - Empresa sem regra publicada: GET /finance/commission-rule responde 422 FINANCE_COMMISSION_RULE_NOT_CONFIGURED (o motor de regras não acha
//   versão vigente: RULE_NOT_FOUND, RULE_NO_ACTIVE_VERSION ou RULE_NO_MATCHING_SCOPE). Isso é "nenhuma regra publicada ainda" e o formulário fica
//   liberado para publicar a PRIMEIRA versão. Antes a tela só tratava 404 (que a API não manda nesse caso): mostrava o erro e deixava "Publicar
//   regra" desligado. Decide pelo CÓDIGO do erro, nunca pelo status genérico: outro 422, conflito de versões, erro do motor, falta de acesso ou de
//   conexão continuam aparecendo como erro.
// - Resumo da versão vigente sem chave técnica (padrão do projeto: nenhum código interno na tela; antes aparecia "regra REG-FIN-001").
import { formatDateTime, formatPercent } from "@/lib/format";
import { roundingLabel } from "./rounding";

export const NO_RULE_CODE = "FINANCE_COMMISSION_RULE_NOT_CONFIGURED";
const NO_RULE_REASONS = new Set(["RULE_NOT_FOUND", "RULE_NO_ACTIVE_VERSION", "RULE_NO_MATCHING_SCOPE"]);

export function isNoCommissionRule(err) {
  if (!err || err.code !== NO_RULE_CODE) return false;
  const reason = err.details && err.details.reason;
  return !reason || NO_RULE_REASONS.has(reason);
}

export function loadCurrentCommissionRule(fetchRule) {
  return fetchRule().then((current) => ({ current })).catch((err) => {
    if (isNoCommissionRule(err)) return { current: null };
    throw err;
  });
}

export function currentRuleSummary(rule, components) {
  const parts = [
    `Versão ${rule.versionNumber ?? "vigente"}${rule.effectiveFrom ? ` (publicada em ${formatDateTime(rule.effectiveFrom)})` : ""}`,
    "base: valor do recebimento",
    ...components.map(({ key, label }) => `${label.replace(" (%)", "")}: ${rule.components?.[key] != null ? formatPercent(rule.components[key]) : "não se aplica"}`),
  ];
  return `${parts.join(" · ")} · arredondamento: ${roundingLabel(rule.rounding)}`;
}
