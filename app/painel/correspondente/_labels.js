// Rótulos e utilitários únicos do módulo Correspondente. Todas as telas importam daqui
// para não divergir (provider, produto, finalidade, status, fato gerador, etapas).

export const STATUS_LABELS = {
  DRAFT: "Rascunho",
  DOCUMENTS_PENDING: "Aguardando documentos",
  READY_TO_SUBMIT: "Pronto para enviar",
  SUBMITTED: "Enviado ao provider",
  UNDER_ANALYSIS: "Em análise",
  PENDING_CUSTOMER: "Aguardando documentos do cliente",
  PENDING_PROPERTY: "Aguardando dados do imóvel",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CONTRACTING: "Em contratação",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
};

export const STATUS_TONE = {
  DRAFT: "neutral",
  DOCUMENTS_PENDING: "warning",
  READY_TO_SUBMIT: "info",
  SUBMITTED: "info",
  UNDER_ANALYSIS: "info",
  PENDING_CUSTOMER: "warning",
  PENDING_PROPERTY: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CONTRACTING: "info",
  COMPLETED: "success",
  CANCELED: "danger",
};

// Etapas finais: o caso fica somente leitura.
export const FINAL_CASE_STATUSES = ["CANCELED", "COMPLETED"];

export const PROVIDER_LABELS = {
  sandbox: "Sandbox (simulação)",
  manual: "Manual (sem banco real integrado)",
};

export const PURPOSE_LABELS = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
};

export const PRODUCT_LABELS = {
  FINANCIAMENTO_IMOBILIARIO: "Financiamento imobiliário",
  REFINANCIAMENTO: "Refinanciamento",
  CREDITO_COM_GARANTIA: "Crédito com garantia de imóvel",
  CONSTRUCAO: "Financiamento de construção",
};

export const TRIGGER_EVENT_LABELS = {
  CONTRATO_ASSINADO: "Contrato assinado",
  RECURSO_LIBERADO: "Recurso liberado pelo banco",
  REGISTRO_MANUAL: "Registro manual",
};

export const OPPORTUNITY_STAGE_LABELS = {
  NEW: "Nova",
  QUALIFIED: "Qualificada",
  PROPOSAL: "Proposta",
  NEGOTIATION: "Negociação",
  WON: "Ganha",
  LOST: "Perdida",
};

export const DOCUMENT_STATUS_LABELS = {
  PENDING: "Pendente",
  SUBMITTED: "Enviado, aguardando validação",
  VALIDATED: "Validado",
  REJECTED: "Recusado",
  EXPIRED: "Vencido",
  DISPENSED: "Dispensado",
};
export const DOCUMENT_STATUS_TONE = { PENDING: "warning", SUBMITTED: "info", VALIDATED: "success", REJECTED: "danger", EXPIRED: "neutral", DISPENSED: "neutral" };

export const DOCUMENT_TYPE_LABELS = {
  RG_CPF: "RG/CPF",
  COMPROVANTE_RENDA: "Comprovante de renda",
  COMPROVANTE_RESIDENCIA: "Comprovante de residência",
  MATRICULA_IMOVEL: "Matrícula do imóvel",
  CERTIDAO_ESTADO_CIVIL: "Certidão de estado civil",
  IPTU: "IPTU",
  EXTRATO_BANCARIO: "Extrato bancário",
  OUTRO: "Outro",
};

export const SUBMISSION_STATUS_LABELS = { PENDING: "Enviando…", SUBMITTED: "Enviado", UNKNOWN: "Status indeterminado", FAILED: "Falhou", CANCELED: "Cancelado" };
export const SUBMISSION_STATUS_TONE = { PENDING: "neutral", SUBMITTED: "success", UNKNOWN: "warning", FAILED: "danger", CANCELED: "neutral" };

export const COMMISSION_STATUS_LABELS = {
  EXPECTED: "Prevista",
  CONFIRMED: "Confirmada",
  RECEIVABLE: "A receber (lançamento criado)",
  RECEIVED: "Recebida",
  ADJUSTED: "Estornada/ajustada",
};
export const COMMISSION_STATUS_TONE = { EXPECTED: "neutral", CONFIRMED: "info", RECEIVABLE: "info", RECEIVED: "success", ADJUSTED: "danger" };

export const providerShortLabel = (code) => label({ sandbox: "Sandbox", manual: "Manual" }, code, "Padrão da empresa");

export const SOURCE_LABELS = {
  webhook: "Aviso do provider",
  poll: "Consulta ao provider",
  manual: "Registro manual",
  submission: "Envio do caso",
  system: "Sistema",
};

export const SOURCE_TYPE_LABEL = {
  COMMISSION_ENTITLEMENT: "Comissão",
  FINANCIAL_ENTRY: "Lançamento financeiro",
  LANCAMENTO_MANUAL: "Lançamento manual",
  SERVICE_ORDER: "Ordem de serviço",
  INVOICE_REQUEST: "NFS-e",
};

// Etapas do caso que o administrador pode bloquear para comissão (CANCELED e REJECTED ficam fixas).
export const BLOCKABLE_CASE_STATUSES = [
  "DRAFT",
  "DOCUMENTS_PENDING",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "UNDER_ANALYSIS",
  "PENDING_CUSTOMER",
  "PENDING_PROPERTY",
  "APPROVED",
  "CONTRACTING",
  "COMPLETED",
];

export function label(map, value, fallback = "Não identificado") {
  if (value === null || value === undefined || value === "") return fallback;
  return map[value] || String(value).replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export const providerLabel = (code) => label(PROVIDER_LABELS, code, "Padrão da empresa");
export const productLabel = (code) => label(PRODUCT_LABELS, code, "Produto não informado");
export const purposeLabel = (code) => label(PURPOSE_LABELS, code, "Finalidade não informada");
export const statusLabel = (code) => label(STATUS_LABELS, code, "Status não reconhecido");
export const triggerLabel = (code) => label(TRIGGER_EVENT_LABELS, code, "Fato gerador não informado");
export const stageLabel = (code) => label(OPPORTUNITY_STAGE_LABELS, code, "sem etapa");

export function financingStatusLabel(row) {
  if (row?.providerCode === "manual" && row?.status === "SUBMITTED") return "Aguardando ação manual no banco";
  return statusLabel(row?.status);
}

export function isFinalCase(status) {
  return FINAL_CASE_STATUSES.includes(status);
}

// Valor monetário curto para rótulos.
export function brl(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Espelho da máquina de estados do backend (statusMachine.js), só para filtrar as opções da tela.
// A API continua sendo a fonte de verdade e recusa qualquer salto inválido.
const STATUS_RANK = {
  DRAFT: 0, DOCUMENTS_PENDING: 1, READY_TO_SUBMIT: 2, SUBMITTED: 3,
  UNDER_ANALYSIS: 4, PENDING_CUSTOMER: 4, PENDING_PROPERTY: 4,
  APPROVED: 5, REJECTED: 5, CONTRACTING: 6, COMPLETED: 7, CANCELED: 7,
};

export function canMoveManually(current, candidate) {
  if (current === candidate) return false;
  if ((current === "APPROVED" && candidate === "REJECTED") || (current === "REJECTED" && candidate === "APPROVED")) return false;
  if (current === "REJECTED" && candidate !== "CANCELED") return false;
  if (["COMPLETED", "CANCELED"].includes(current)) return false;
  if (["CONTRACTING", "COMPLETED"].includes(candidate) && !["APPROVED", "CONTRACTING"].includes(current)) return false;
  return (STATUS_RANK[candidate] ?? -1) >= (STATUS_RANK[current] ?? 99);
}
