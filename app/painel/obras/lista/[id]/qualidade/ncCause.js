// Causa da não conformidade (DI-BI2-8): opcional na abertura e no fechamento. O livro não exige a causa (M6:23, M6:138-140), mas o indicador de recorrência
// por causa (M9:794) só tem dado quando ela é informada. Mesma normalização da API (nonconformityCause.js): texto aparado, até 64 caracteres, em maiúsculas.
export const NC_CAUSE_MAX = 64;

export const NC_CAUSE_HELPER =
  "Opcional. Código curto da causa, por exemplo INFILTRACAO. Alimenta o indicador de recorrência por causa; sem ela, a ocorrência conta como causa não informada.";
export const NC_CAUSE_CLOSE_HELPER = "Opcional. Informe ou corrija a causa apurada. Em branco, fica a causa informada na abertura.";

/** Causa normalizada, ou "" quando vazia. */
export function normalizeCause(text) {
  return String(text ?? "").trim().slice(0, NC_CAUSE_MAX).toUpperCase();
}

/** Trecho do corpo da requisição: { causeCode } só quando há causa (vazio não apaga a causa já gravada). */
export function causePayload(text) {
  const cause = normalizeCause(text);
  return cause ? { causeCode: cause } : {};
}

/** Texto da causa na lista de não conformidades. */
export function causeLabel(nc) {
  return nc && nc.causeCode ? `Causa: ${nc.causeCode}` : "Causa não informada";
}
