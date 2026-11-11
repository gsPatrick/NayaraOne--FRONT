// Texto de cada item da linha do tempo do processo (Caderno M5 §14). Desde a 3ª rodada da API o `summary` já vem em
// português (códigos ficam em details); a tela só passa o texto pelo humanizeText, que tira identificador e data ISO
// que porventura sobrem. O contorno antigo (montar o texto na tela a partir das listas) foi removido.
import { humanizeText } from "@/lib/format";

export function timelineText(item) {
  return humanizeText(item && item.summary) || "Movimentação registrada.";
}
