// Regras puras da confirmação de ação destrutiva (M9-D852 §3.1), sem React: o que a tela exige em cada nível e quando o botão de confirmar libera.
// Nível 1 simples (resumo), 2 com impacto ("Entendi o impacto"), 3 crítica (código do registro digitado + justificativa). Quem decide o nível e calcula o impacto é a API.

/** Estado do botão "Confirmar": { canConfirm, reasons[] (por que está desabilitado) }. `impact` é o corpo de GET/POST .../impact. */
export function confirmState({ impact, understood = false, typedCode = "", justification = "" }) {
  if (!impact) return { canConfirm: false, reasons: ["Carregando o impacto da ação."] };
  const reasons = [];
  const blockers = impact.blockers || [];
  if (blockers.length > 0) reasons.push(`Não é possível continuar: ${blockers.map((b) => String(b.message || "").replace(/[.\s]+$/, "")).join("; ")}.`);
  const level = impact.level || 1;
  if (level >= 2 && !understood) reasons.push("Marque \"Entendi o impacto\".");
  if (level >= 3) {
    const expected = String((impact.record && impact.record.code) || "").trim();
    if (!String(typedCode).trim() || String(typedCode).trim() !== expected) reasons.push(`Digite ${(impact.record && impact.record.codeLabel) || "o código do registro"} para confirmar.`);
    const min = (impact.confirm && impact.confirm.justificationMin) || 0;
    if (String(justification).trim().length < min) reasons.push(`Escreva a justificativa (mínimo ${min} caracteres).`);
  }
  return { canConfirm: reasons.length === 0, reasons };
}

/** Corpo `confirmation` que a API espera (M9-D852 §3.1), montado a partir do que a pessoa preencheu e do impactToken da simulação. */
export function buildConfirmation({ impact, understood, typedCode, justification }) {
  const level = impact.level || 1;
  const confirmation = { impactToken: impact.impactToken };
  if (level >= 2) confirmation.understood = understood === true;
  if (level >= 3) {
    confirmation.typedCode = String(typedCode || "").trim();
    confirmation.justification = String(justification || "").trim();
  }
  return confirmation;
}

/** Dinheiro em reais a partir de centavos (inteiro): "R$ 18.400,00". */
export function formatCents(cents) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Rótulos em português das contagens que a API devolve (um por chave de `counts`); chave desconhecida aparece como veio, sem inventar texto.
export const COUNT_LABELS = Object.freeze({
  openInstallments: "parcelas em aberto", parties: "partes do contrato", entries: "lançamentos", activeChildEntries: "lançamentos filhos ativos", paymentIntents: "pagamentos ligados",
  orders: "ordens de compra", goodsReceipts: "recebimentos", owners: "proprietários", offers: "ofertas", media: "arquivos de mídia", documents: "documentos", openContracts: "contratos em andamento",
  opportunities: "oportunidades", projects: "obras", users: "usuários", activeMemberships: "vínculos ativos com empresas", openSessions: "sessões abertas", stages: "etapas", budgets: "orçamentos",
  changeOrders: "aditivos de obra", materialRequests: "requisições de material", openPurchaseOrders: "ordens de compra abertas", links: "links", accessesSoFar: "acessos já feitos",
  credentials: "credenciais", scopes: "acessos (scopes)", routesUsedLast30Days: "rotas usadas nos últimos 30 dias", operations: "operações", attemptsSoFar: "tentativas já feitas",
  dangerous: "operações perigosas", connections: "integrações", pendingDispatches: "envios pendentes", openErrors: "erros abertos", versions: "versões", runsLast30Days: "execuções nos últimos 30 dias",
  enabledTools: "ferramentas ligadas", records: "registros", willChange: "registros que mudam", OPEN_BILLING: "cobranças em aberto", ACTIVE_GUARANTEE: "garantias ativas", OPEN_LEGAL_CASE: "processos abertos",
});

/** Linhas "12 parcelas em aberto" para a tela; ignora contagem zero e agrupamentos (objetos). */
export function impactLines(impact) {
  return Object.entries((impact && impact.counts) || {})
    .filter(([, value]) => typeof value === "number" && value > 0)
    .map(([key, value]) => `${value} ${COUNT_LABELS[key] || key}`);
}

/** Resumo em uma frase: "Serão afetados: 12 parcelas em aberto; R$ 18.400,00." */
export function impactSummary(impact) {
  const lines = impactLines(impact);
  const parts = [];
  if (lines.length) parts.push(lines.join("; "));
  if (impact && impact.totalAmountCents > 0) parts.push(formatCents(impact.totalAmountCents));
  return parts.length ? `Serão afetados: ${parts.join("; ")}.` : "Nenhum item dependente será afetado.";
}
