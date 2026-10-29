const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (v) => BRL.format(v);
export const brlCompact = (v) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(2).replace(".", ",")} mi` : `R$ ${Math.round(v / 1e3)} mil`;

export function relTime(min) {
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.floor(min / 60)} h`;
  const d = Math.floor(min / 1440);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}
