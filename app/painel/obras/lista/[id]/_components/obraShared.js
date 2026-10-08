// Helpers compartilhados entre as subrotas da obra (visão geral, orçamento, change orders,
// diário, medições, materiais, qualidade) — extraídos do antigo monólito
// app/painel/obras/lista/[id]/page.js durante a divisão em subrotas dedicadas. Nenhuma regra de
// negócio foi alterada aqui, só movida para um módulo compartilhado.
import { toNumber } from "@/lib/format";

export const WEATHER_OPTIONS = ["Ensolarado", "Nublado", "Chuvoso", "Ventania"];

// BUG REAL CORRIGIDO (auditoria E2E ao vivo, Marco 6, Ciclo 1, 2026-10-06): o modal "Novo item
// de checklist" nunca tinha campo de categoria — o POST sempre ia sem "category", caindo no
// default "OUTROS" do backend (qualityChecklist.service.js). Como o gate de entrega só bloqueia
// com Nonconformity CRITICAL (gerada automaticamente só para categorias ESTRUTURA/HIDRAULICA/
// ELETRICA), NENHUMA reprovação de checklist real jamais bloqueava a entrega da obra — o fix de
// severidade do backend (rodada 60) nunca era alcançável pelo fluxo real da UI.
export const QUALITY_CATEGORIES = [
  { value: "ESTRUTURA", label: "Estrutura" },
  { value: "HIDRAULICA", label: "Hidráulica" },
  { value: "ELETRICA", label: "Elétrica" },
  { value: "ALVENARIA", label: "Alvenaria" },
  { value: "ACABAMENTO", label: "Acabamento" },
  { value: "PINTURA", label: "Pintura" },
  { value: "OUTROS", label: "Outros" },
];

// FIX (auditoria E2E de browser, ciclo 6, 02/10/2026): "NaN <= 0" e "NaN < 0" são ambos FALSE
// em JS — todo guard de validação deste arquivo que fazia `toNumber(x) <= 0` (ou `< 0`) sem
// checar Number.isNaN primeiro deixava passar entrada tipo "," (vírgula sozinha, sem dígito)
// como se fosse válida, mandando NaN pro backend (serializado como `null` pelo JSON.stringify)
// sem nenhum feedback ao usuário. isInvalidNumber centraliza o guard correto: trata vazio como
// inválido também, pra não precisar repetir `x === "" || ...` em cada call-site.
export function isInvalidNumber(value, { allowZero = false } = {}) {
  if (value === "" || value === null || value === undefined) return true;
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return true;
  return allowZero ? numeric < 0 : numeric <= 0;
}

export function isLossFullyReturned(lossRecord, allRecords) {
  return lossRemainingToReturn(lossRecord, allRecords) <= 0;
}

// GAP REAL CORRIGIDO (reauditoria externa Nayara, 2026-10-08): o backend sempre suportou
// devolução parcial (soma os RETURN já aprovados e valida contra o saldo restante), mas a
// tela só permitia devolver tudo de uma vez. Reaproveitado por isLossFullyReturned e pelo
// modal de devolução parcial.
export function lossRemainingToReturn(lossRecord, allRecords) {
  const alreadyReturned = allRecords
    .filter((r) => r.movementType === "RETURN" && r.status === "APPROVED" && r.relatedLossRecordId === lossRecord.id)
    .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  return Math.max(0, Number(lossRecord.quantity || 0) - alreadyReturned);
}
