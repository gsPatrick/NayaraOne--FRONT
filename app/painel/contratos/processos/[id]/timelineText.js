// Texto de cada item da linha do tempo do processo (Caderno M5 §14) em português: o `summary` da API traz códigos de
// enum, identificadores e datas ISO crus; aqui o texto é montado a partir do tipo do item e dos dados já carregados
// (prazos, partes) e o que sobra da auditoria passa pelo tradutor de códigos — nenhum UUID ou enum chega à tela.
import { humanizeText, formatDateTime } from "@/lib/format";
import {
  DEADLINE_STATUS_LABELS,
  DEADLINE_CRITICALITY_LABELS,
  CASE_PARTY_ROLE_LABELS,
  CASE_DOCUMENT_PURPOSE_LABELS,
  CASE_PHASE_LABELS,
  CASE_RECEIVABLE_BASIS_LABELS,
} from "@/lib/labels/juridico";
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from "@/lib/mock/legal";

const DICT = {
  ...DEADLINE_CRITICALITY_LABELS,
  ...CASE_DOCUMENT_PURPOSE_LABELS,
  ...CASE_PHASE_LABELS,
  ...CASE_TYPE_LABELS,
  ...CASE_STATUS_LABELS,
  ...CASE_PARTY_ROLE_LABELS,
  ...DEADLINE_STATUS_LABELS,
  ...CASE_RECEIVABLE_BASIS_LABELS,
};

/** Troca códigos conhecidos pelo rótulo, tira hashes/identificadores e descarta o código que sobrar. */
export function sanitizeAuditText(text) {
  let s = String(text || "");
  s = s.replace(/\b[0-9a-f]{40,64}\b/gi, "");
  s = s.replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*\b/g, (code) => (DICT[code] ? DICT[code].toLowerCase() : code.length > 3 && /_|^[A-Z]{4,}$/.test(code) ? "" : code));
  s = s.replace(/\s*->\s*/g, " → ").replace(/\(\s*\)/g, "").replace(/,\s*SHA-256\s*\.?/gi, ".").replace(/hash\s*\./gi, "");
  return humanizeText(s);
}

const brasilia = (iso) => `${formatDateTime(iso)} (horário de Brasília)`;

export function timelineText(item, { deadlines = [], parties = [], personName = () => "pessoa" } = {}) {
  if (item.type === "CASE_OPENED") return "Processo aberto.";
  if (item.type === "PARTY") {
    const party = parties.find((p) => p.id === item.referenceId);
    return party ? `${CASE_PARTY_ROLE_LABELS[party.partyRole] || "Parte"} incluído(a): ${personName(party.personId)}.` : "Parte incluída no processo.";
  }
  if (item.type === "DEADLINE") {
    const d = deadlines.find((x) => x.id === item.referenceId);
    return d ? `Prazo cadastrado: ${d.description} (vence em ${brasilia(d.dueAt)}).` : "Prazo cadastrado.";
  }
  if (item.type === "EVIDENCE_PACKAGE") {
    const count = /com (\d+) item/.exec(item.summary || "");
    return `Dossiê de provas gerado${count ? ` com ${count[1]} item(ns)` : ""}.`;
  }
  if (item.type === "NOTICE") return "Notificação ligada ao processo.";
  const text = sanitizeAuditText(item.summary);
  return text || "Movimentação registrada.";
}
