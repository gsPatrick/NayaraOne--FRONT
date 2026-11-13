// Valor em vigor dos parâmetros do antifraude do Financeiro (DEC-007): GET /finance/antifraud/parameters, permissão settings:read.
// Cada linha traz a chave, o padrão, o valor gravado, o valor efetivo que a regra usa e a origem (STORED, DEFAULT ou INVALID_STORED).
import { apiFetch } from "@/lib/api/client";

export async function getAntifraudParameters() {
  return apiFetch("/finance/antifraud/parameters");
}
