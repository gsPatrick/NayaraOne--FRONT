// Traduz o before_json/after_json (bruto, em inglês/camelCase, do jeito que a API grava) pra
// uma lista de "Campo: valor" em português — a tela de Atividades é usada por gente leiga
// (a cliente, corretores etc.), então nada de JSON cru, chave em camelCase ou enum em inglês
// aparece na tela.

import { formatBRL, formatDate, formatDateTime } from "@/lib/format";

// Campos técnicos/internos que não dizem nada pra um usuário leigo — nunca aparecem na tela.
const IGNORED_FIELD_PATTERN = /^(id|.*Id|.*_id|groupId|companyId|createdBy|updatedBy|deletedBy|lockVersion|sessionId|ipAddress|correlationId|ruleVersionId|created_at|updated_at|deleted_at|taxIdNormalizedHash|externalSignatureId|contentHash|idempotencyKey|attributesJson)$/i;

// Rótulo em português por nome de campo. Cobre os campos mais comuns entre os módulos
// (financeiro, contratos, obras, pessoas, imóveis). Campo fora da lista cai no fallback
// (camelCase -> "Palavras Separadas").
const FIELD_LABELS = {
  amount: "Valor",
  totalValue: "Valor total",
  askingPrice: "Preço",
  confidentialMinPrice: "Preço mínimo confidencial",
  budgetAmount: "Orçamento",
  baseAmount: "Valor base",
  percentage: "Percentual",
  ownershipPercent: "Percentual de propriedade",
  condoFee: "Valor do condomínio",
  dueAt: "Vencimento",
  settledAt: "Liquidado em",
  startsAt: "Início",
  endsAt: "Fim",
  endsAtPlanned: "Previsão de término",
  startFrom: "Vigência início",
  validFrom: "Vigência início",
  validUntil: "Vigência fim",
  occurredAt: "Ocorrido em",
  signedAt: "Assinado em",
  issuedAt: "Emitido em",
  expiresAt: "Expira em",
  matchedAt: "Conciliado em",
  birthOrFoundationDate: "Nascimento/Fundação",
  description: "Descrição",
  reason: "Motivo",
  notes: "Observações",
  status: "Status",
  nature: "Natureza",
  entryType: "Tipo de lançamento",
  contractType: "Tipo de contrato",
  propertyType: "Tipo de imóvel",
  offerType: "Tipo de oferta",
  documentType: "Tipo de documento",
  contactType: "Tipo de contato",
  occurrenceType: "Tipo de ocorrência",
  mediaType: "Tipo de mídia",
  publicationStatus: "Status de publicação",
  availabilityStatus: "Disponibilidade",
  verificationStatus: "Status de verificação",
  regularizationStatus: "Situação de regularização",
  name: "Nome",
  title: "Título",
  legalName: "Nome / Razão social",
  preferredName: "Nome de uso",
  personType: "Tipo de pessoa",
  roleCode: "Papel",
  partyRole: "Papel no contrato",
  email: "E-mail",
  phone: "Telefone",
  valueNormalized: "Valor de contato",
  isPrimary: "Contato principal",
  taxIdNormalized: "CPF/CNPJ",
  registryNumber: "Matrícula",
  registryOffice: "Cartório",
  internalCode: "Código interno",
  bedrooms: "Dormitórios",
  parkingSpots: "Vagas",
  areaTotalM2: "Área total (m²)",
  city: "Cidade",
  state: "UF",
  zipCode: "CEP",
  street: "Logradouro",
  number: "Número",
  complement: "Complemento",
  neighborhood: "Bairro",
  acceptsFinancing: "Aceita financiamento",
  acceptsTrade: "Aceita permuta",
  agency: "Agência",
  accountNumber: "Número da conta",
  bankCode: "Banco",
  pixKey: "Chave PIX",
  versionNumber: "Versão",
  versionNo: "Versão",
  quantity: "Quantidade",
  unitPrice: "Preço unitário",
  code: "Código",
  temperature: "Temperatura",
  expectedValue: "Valor esperado",
  nextAction: "Próxima ação",
  nextActionDueAt: "Prazo da próxima ação",
  lostReason: "Motivo de perda",
  criteriaJson: "Critérios de busca",
};

// Tradução por palavra pra valores em ENUM_COM_UNDERSCORE — cobre os termos mais recorrentes
// entre os módulos. Palavra fora da lista aparece em minúscula (melhor que gritado em inglês).
const WORD_LABELS = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
  DRAFT: "Rascunho",
  READY: "Pronto",
  PUBLISHED: "Publicado",
  SETTLED: "Liquidado",
  REVERSED: "Estornado",
  OPEN: "Aberto",
  CLOSED: "Fechado",
  RESOLVED: "Resolvido",
  IN: "Em",
  PROGRESS: "Andamento",
  PAYABLE: "A pagar",
  RECEIVABLE: "A receber",
  TRANSFER: "Transferência",
  ADJUSTMENT: "Ajuste",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  SIGNED: "Assinado",
  SIGNING: "Em assinatura",
  SALE: "Venda",
  RENT: "Locação",
  RESIDENTIAL: "Residencial",
  COMMERCIAL: "Comercial",
  LAND: "Terreno",
  RURAL: "Rural",
  AVAILABLE: "Disponível",
  SOLD: "Vendido",
  RENTED: "Alugado",
  WITHDRAWN: "Retirado",
  OK: "Aprovado",
  BLOCKED: "Bloqueado",
  SUSPENDED: "Suspenso",
  SCHEDULED: "Agendado",
  DONE: "Concluído",
  WON: "Ganho",
  LOST: "Perdido",
};

function humanizeEnumValue(value) {
  const words = String(value).split(/[_\s]+/).filter(Boolean);
  const translated = words.map((w) => WORD_LABELS[w.toUpperCase()] || w.toLowerCase());
  const joined = translated.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

// camelCase -> "Camel Case" — fallback pra campo sem tradução dedicada em FIELD_LABELS.
function humanizeFieldName(key) {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function fieldLabel(key) {
  return FIELD_LABELS[key] || humanizeFieldName(key);
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function formatValue(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.length === 0 ? "Nenhum" : `${value.length} item(ns)`;
  if (typeof value === "object") return null; // objeto aninhado (ex.: endereço) — tratado à parte, nunca como JSON cru

  const lowerKey = key.toLowerCase();
  const numeric = typeof value === "number" || (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value));

  if (numeric && /(amount|price|value|fee)$/i.test(key)) return formatBRL(value);
  if (numeric && /percent/i.test(key)) return `${value}%`;
  if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
    return /at$/i.test(key) && !lowerKey.includes("date") ? formatDateTime(value) : formatDate(value);
  }
  if (typeof value === "string" && /^[A-Z0-9_]+$/.test(value) && value.length > 1) return humanizeEnumValue(value);
  return String(value);
}

// Resume before_json/after_json numa lista de { label, before, after, isNew } já em pt-BR,
// pronta pra renderizar como texto simples — nunca como bloco de código.
export function summarizeChanges(beforeJson, afterJson) {
  const before = beforeJson || {};
  const after = afterJson || {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) => !IGNORED_FIELD_PATTERN.test(k)
  );

  const rows = [];
  for (const key of keys) {
    const beforeValue = formatValue(key, before[key]);
    const afterValue = formatValue(key, after[key]);
    if (beforeValue === null && afterValue === null) continue; // objeto aninhado sem tratamento dedicado — omitido, não vira JSON
    if (!beforeJson) {
      // criação: só existe "depois" — campo vazio/nulo não ajuda quem tá lendo, não mostra.
      if (after[key] === undefined || afterValue === "—" || afterValue === null) continue;
      rows.push({ label: fieldLabel(key), after: afterValue, isNew: true });
      continue;
    }
    if (beforeValue === afterValue) continue; // campo sem mudança não polui a tela
    rows.push({ label: fieldLabel(key), before: beforeValue, after: afterValue, isNew: false });
  }
  return rows;
}
