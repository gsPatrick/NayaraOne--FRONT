// Auxiliares do Financeiro (conferência Marco 4, 20/10/2026) que não existiam em lib/api/finance.js
// nem em lib/format.js. Ficam num arquivo próprio para não mexer nos módulos compartilhados.

import { apiFetch } from "@/lib/api/client";

// --- Texto técnico nunca vai para a tela ---------------------------------------------------

// A API devolve algumas mensagens citando o nome do campo entre parênteses ("contractId").
// Na tela o usuário vê o termo em português.
const TECHNICAL_TERMS = [
  [/\s*\("?contractId"?\)/g, ""],
  [/\s*\("?thirdPartyHolderPersonId"?\)/g, ""],
  [/\s*\("?thirdPartyOriginEntryId"?\)/g, ""],
  [/\s*\("?thirdPartyReleaseType"?\)/g, ""],
  [/\s*\("?thirdPartyCompensatedEntryId"?\)/g, ""],
  [/\s*\("?competenceMonth"?\)/g, ""],
  [/"?thirdPartyHolderPersonId"?/g, "titular"],
  [/"?thirdPartyOriginEntryId"?/g, "recebimento de origem"],
  [/"?thirdPartyReleaseType"?/g, "tipo de saída"],
  [/"?thirdPartyCompensatedEntryId"?/g, "dívida a compensar"],
  [/"?contractId"?/g, "contrato"],
  [/"?competenceMonth"?/g, "competência"],
  [/"?chartOfAccountId"?/g, "conta contábil"],
  [/"?idempotencyKey"?/g, "chave de repetição"],
  [/\bFinancialEntry\b/g, "Lançamento"],
];

export function plainFinanceText(text) {
  let out = String(text || "");
  for (const [re, to] of TECHNICAL_TERMS) out = out.replace(re, to);
  return out.replace(/\s{2,}/g, " ").trim();
}

// Mensagens por código de erro, no lugar do texto técnico da API, quando a ação é guiada.
const CODE_MESSAGES = {
  FINANCE_THIRD_PARTY_ORIGIN_REQUIRED: "Esta devolução ou compensação precisa indicar a caução recebida de origem — é ela que liga a saída ao contrato e ao titular corretos.",
  FINANCE_THIRD_PARTY_ORIGIN_NOT_FOUND: "A caução de origem não foi encontrada nesta empresa.",
  FINANCE_THIRD_PARTY_ORIGIN_NOT_RECEIVED: "A caução de origem ainda não foi recebida (liquidada), então não pode ser devolvida.",
  FINANCE_THIRD_PARTY_ORIGIN_UNTRACEABLE: "A caução de origem não tem contrato e titular registrados, então não pode ser devolvida.",
  FINANCE_THIRD_PARTY_CONTRACT_MISMATCH: "O contrato informado é diferente do contrato da caução recebida.",
  FINANCE_THIRD_PARTY_HOLDER_MISMATCH: "O titular informado é diferente do titular da caução recebida.",
  FINANCE_THIRD_PARTY_RELEASE_EXCEEDS_BALANCE: "O valor passa do saldo que ainda resta da caução recebida.",
  FINANCE_THIRD_PARTY_HOLDER_NOT_CONTRACT_PARTY: "O titular precisa ser uma das partes do contrato.",
  FINANCE_THIRD_PARTY_HOLDER_ROLE_INVALID: "O titular da caução precisa ser locatário, comprador ou fiador do contrato.",
  FINANCE_THIRD_PARTY_COMPENSATED_DEBT_REQUIRED: "Para compensar, escolha a dívida do titular que será abatida.",
  FINANCE_CHART_ACCOUNT_SYNTHETIC: "Esta conta contábil é sintética (agrupadora) e não recebe lançamentos. Escolha uma conta analítica, uma das subcontas.",
};

export function friendlyFinanceError(err, fallback = "Não foi possível concluir a ação.") {
  if (!err) return fallback;
  const byCode = err.code && CODE_MESSAGES[err.code];
  if (byCode) return byCode;
  const raw = plainFinanceText(err.message || "");
  return raw || fallback;
}

// --- Datas de calendário (sem deslocar por fuso) ---------------------------------------------

// Linha de extrato, vencimento e similares guardam o DIA. Alguns campos chegam como instante
// "2026-10-20T00:00:00.000Z"; converter isso para o fuso de São Paulo mostra 19/10. Aqui o dia
// vale o que está escrito: pega AAAA-MM-DD e formata sem passar por fuso.
export function formatCalendarDay(value) {
  if (!value) return "Sem data";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) return "Sem data";
  const year = Number(m[1]);
  if (year < 1900 || year > 2100) return "Data inválida";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// A exportação do Financeiro saiu daqui: agora é feita pelo POST /exports (M9-D822), em lib/api/dlpExports.js.

// --- NAY financeira (somente leitura) ----------------------------------------------------------

export async function getFinanceNayInsights() {
  return apiFetch("/finance/nay/insights");
}
