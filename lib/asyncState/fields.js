// Liga o erro de um campo ao próprio campo (M9-D850 §3.1 e M9-D851): id do aviso, aria-describedby e aria-invalid.
import { fieldErrorsOf } from "./states";

export const fieldErrorId = (field) => `error-${String(field).replace(/[^A-Za-z0-9_-]/g, "-")}`;

/** Propriedades para o campo `field` dado o erro da API: { id do aviso, mensagem, props do input }. */
export function fieldErrorProps(error, field) {
  const found = fieldErrorsOf(error).find((item) => item.field === field);
  if (!found) return { message: null, errorId: null, inputProps: {} };
  const errorId = fieldErrorId(field);
  return { message: found.message, errorId, inputProps: { "aria-invalid": true, "aria-describedby": errorId } };
}
