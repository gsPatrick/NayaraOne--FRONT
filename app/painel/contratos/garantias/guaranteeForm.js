// Formulário da garantia por tipo (Caderno M5 §9 "Código | Tipo | Dados"), espelho de REQUIRED em
// wt/api-m5 src/features/legal/guaranteeTypeData.js. A tela calcula o que vai faltar antes de gravar; quem decide é a
// API (dado faltando = garantia Pendente; `missingForActivation` no GET).
import { toNumber } from "@/lib/format";

export const REQUIRED_BY_TYPE = {
  GUARANTOR: ["guarantorPersonId", "documentFileIds", "acceptanceFileId", "acceptedAt", "endsAt"],
  INSURANCE: ["providerName", "policyNumber", "policyFileId", "value", "endsAt", "premiumInstallments", "renewalDueAt"],
  SECURITY_DEPOSIT: ["value", "financeEntryId"],
  CAPITALIZATION: ["providerName", "certificateNumber", "certificateFileId", "value", "endsAt"],
  OTHER: ["homologatedFlowCode"],
};

// Campo do formulário que guarda o arquivo a enviar para cada campo de arquivo da API.
const FILE_FIELDS = { acceptanceFileId: "acceptanceFile", policyFileId: "policyFile", certificateFileId: "certificateFile" };

export function emptyGuaranteeForm() {
  return {
    guarantorPersonId: "", additionalGuarantorPersonIds: [], documentFiles: [], acceptanceFile: null, acceptedAt: "",
    providerName: "", policyNumber: "", policyFile: null, annualPremium: "", installments: [], renewalDueAt: "", autoRenew: false,
    financeEntryId: "", certificateNumber: "", certificateFile: null, redemptionAmount: "",
    homologatedFlowCode: "", flowData: {}, value: "", startsAt: "", endsAt: "", notes: "",
  };
}

const filled = (v) => !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0));

/** O formulário traz o campo `apiField` (arquivo novo, lista, texto)? */
function providedInForm(form, apiField) {
  if (FILE_FIELDS[apiField]) return Boolean(form[FILE_FIELDS[apiField]]);
  if (apiField === "documentFileIds") return form.documentFiles.length > 0;
  if (apiField === "premiumInstallments") return form.installments.length > 0;
  if (apiField === "value") return filled(form.value) && toNumber(form.value) > 0;
  return filled(form[apiField]);
}

/** Campos obrigatórios do tipo que continuarão faltando (considerando o que a garantia já tem gravado). */
export function missingForType(type, form, current = null) {
  return (REQUIRED_BY_TYPE[type] || []).filter((k) => !providedInForm(form, k) && !(current && filled(current[k])));
}

/** Parcelas do prêmio: número, vencimento e valor; a soma precisa bater com o prêmio anual (quando informado). */
export function installmentsProblem(form) {
  if (form.installments.length === 0) return "";
  const bad = form.installments.findIndex((p) => !/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate || "") || !(toNumber(p.amount) > 0));
  if (bad >= 0) return `Parcela ${bad + 1}: informe o vencimento e um valor maior que zero.`;
  if (filled(form.annualPremium)) {
    const sum = form.installments.reduce((acc, p) => acc + Math.round(toNumber(p.amount) * 100), 0);
    if (sum !== Math.round(toNumber(form.annualPremium) * 100)) return "A soma das parcelas precisa ser igual ao prêmio anual.";
  }
  return "";
}

/** Fluxo homologado sem os dados exigidos? */
export function flowProblem(type, form, flows) {
  if (type !== "OTHER") return "";
  const flow = flows.find((f) => f.code === form.homologatedFlowCode);
  if (!flow) return "Escolha o fluxo homologado da garantia.";
  const missing = (flow.requiredFields || []).filter((k) => !filled(form.flowData[k]));
  return missing.length ? `O fluxo "${flow.label || "homologado"}" exige: ${missing.join(", ")}.` : "";
}

/**
 * Monta o corpo da API só com os campos informados (envia os arquivos novos antes). `uploadFile` é o de lib/api/legal.
 * Datas vão como AAAA-MM-DD (o campo de data do navegador já entrega assim).
 */
export async function buildGuaranteePayload(type, form, uploadFile) {
  const body = {};
  const put = (k, v) => { if (filled(v)) body[k] = v; };
  if (type === "GUARANTOR") {
    put("guarantorPersonId", form.guarantorPersonId);
    if (form.additionalGuarantorPersonIds.length) body.additionalGuarantorPersonIds = form.additionalGuarantorPersonIds;
    if (form.documentFiles.length) body.documentFileIds = (await Promise.all(form.documentFiles.map((f) => uploadFile(f)))).map((u) => u.id);
    put("acceptedAt", form.acceptedAt);
  }
  if (type === "INSURANCE" || type === "CAPITALIZATION") put("providerName", form.providerName.trim());
  if (type === "INSURANCE") {
    put("policyNumber", form.policyNumber.trim());
    if (filled(form.annualPremium)) body.annualPremium = toNumber(form.annualPremium);
    if (form.installments.length) body.premiumInstallments = form.installments.map((p, i) => ({ number: i + 1, dueDate: p.dueDate, amount: toNumber(p.amount) }));
    put("renewalDueAt", form.renewalDueAt);
    if (form.autoRenew) body.autoRenew = true;
  }
  if (type === "SECURITY_DEPOSIT") put("financeEntryId", form.financeEntryId);
  if (type === "CAPITALIZATION") {
    put("certificateNumber", form.certificateNumber.trim());
    if (filled(form.redemptionAmount)) body.redemptionAmount = toNumber(form.redemptionAmount);
  }
  if (type === "OTHER") {
    put("homologatedFlowCode", form.homologatedFlowCode);
    body.flowData = form.flowData;
  }
  for (const [apiField, formField] of Object.entries(FILE_FIELDS)) {
    if (form[formField]) body[apiField] = (await uploadFile(form[formField])).id;
  }
  if (filled(form.value) && toNumber(form.value) > 0) body.value = toNumber(form.value);
  put("startsAt", form.startsAt);
  put("endsAt", form.endsAt);
  put("notes", form.notes.trim());
  return body;
}

/** Lançamentos do contrato que podem ser a origem da caução: recebimento de dinheiro de terceiros, não estornado. */
export function depositOriginCandidates(entries, contractId) {
  return (entries || []).filter(
    (e) => e.contractId === contractId && e.nature === "RECEIVABLE" && e.isThirdPartyFunds && !e.thirdPartyOriginEntryId && !e.parentEntryId && !["REVERSED", "CANCELLED"].includes(e.status)
  );
}

/** Fluxos homologados da configuração legal.guarantee_other_flows ([{ code, label, requiredFields }]). */
export function parseOtherFlows(setting) {
  const raw = setting && typeof setting === "object" && "value" in setting ? setting.value : setting;
  // Configuração ilegível = nenhum fluxo homologado (fail closed, igual à API em guaranteeTypeData.readOtherFlows).
  let list = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      list = undefined;
    }
  }
  return Array.isArray(list) ? list.filter((f) => f && typeof f.code === "string") : [];
}
