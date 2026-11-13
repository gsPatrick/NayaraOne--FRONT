import { humanFieldLabel, SYSTEM_FIELDS } from "@/lib/errors/fieldLabels";
import { plainMessageProblems } from "@/lib/a11y/plainMessage";
import { fieldErrorsOf } from "@/lib/asyncState/states";

// Erros da API em linguagem simples (M9-D851 §3.5): diz o que houve e o que fazer, aponta o campo certo e NUNCA mostra nome interno de campo.
// A API devolve só `message` (com nomes de campo entre aspas) e `code`; quando houver `details` por campo, usamos também.

// Código de erro conhecido -> campo da tela + texto. Tem prioridade sobre o texto cru da API.
const CODE_TEXT = {
  PERSON_DOCUMENT_INVALID_FORMAT: { field: "taxIdNormalized", message: "Confira o CPF ou CNPJ: o CPF tem 11 dígitos e o CNPJ tem 14." },
  PERSON_DUPLICATE: { field: null, message: "Já existe um cadastro com estes dados. Revise o cadastro existente antes de criar outro." },
  PERSON_DOCUMENT_DUPLICATE: { field: "taxIdNormalized", message: "Já existe um cadastro com este CPF ou CNPJ. Confira o número ou abra o cadastro existente." },
};

const QUOTED = /"([A-Za-z][A-Za-z0-9_.]*)"/g;

/** Nomes de campo citados entre aspas na mensagem da API, na ordem em que aparecem. */
export function quotedFieldNames(message) {
  const names = [];
  String(message || "").replace(QUOTED, (_, name) => { names.push(name); return ""; });
  return names;
}

function joinList(items) {
  if (items.length <= 1) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

/** Troca "nomeInterno" por rótulo humano; nome desconhecido some da frase. Não deixa aspas nem camelCase para a pessoa. */
export function humanizeMessage(message) {
  const text = String(message || "").trim();
  const names = quotedFieldNames(text);
  if (!names.length) return text;
  const system = names.filter((n) => SYSTEM_FIELDS.has(n));
  const user = names.filter((n) => !SYSTEM_FIELDS.has(n)).map(humanFieldLabel).filter(Boolean);
  const unique = [...new Set(user)];
  if (/obrigat[óo]rios?/i.test(text)) {
    if (unique.length) return `Preencha ${unique.length === 1 ? "o campo" : "os campos"} ${joinList(unique)}.`;
    if (system.length) return "Não foi possível identificar a sua empresa. Saia do sistema, entre de novo e tente outra vez.";
    return "Preencha os campos obrigatórios e tente de novo.";
  }
  if (unique.length) return `Confira ${unique.length === 1 ? "o campo" : "os campos"} ${joinList(unique)} e tente de novo.`;
  return text.replace(QUOTED, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim() || "Não foi possível concluir. Confira os dados e tente de novo.";
}

/** Troca cada "nomeInterno" da mensagem pelo rótulo humano (ou tira o nome, se não houver rótulo), sem deixar aspas nem espaço sobrando. */
export function withFieldLabels(message) {
  return String(message || "")
    .replace(QUOTED, (_, name) => humanFieldLabel(name) || "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:)])/g, "$1")
    .trim();
}

/**
 * Problemas por campo para o resumo de erros (AsyncState): a mensagem da API com o rótulo humano no lugar do nome interno, e o rótulo à parte. Campo
 * sem rótulo conhecido aparece só pela mensagem (nunca pelo nome interno nem por um índice de lista). Nunca devolve mensagem vazia.
 * @returns {{ field: string, label: string|null, message: string }[]}
 */
export function fieldProblemsForDisplay(error) {
  return fieldErrorsOf(error).map((item) => {
    const label = humanFieldLabel(item.field);
    const own = item.message ? withFieldLabels(item.message) : "";
    const clean = own && !quotedFieldNames(own).length && !plainMessageProblems(own).length ? own : "";
    return { field: item.field, label, message: clean || (label ? `Confira o campo ${label}.` : "Confira este campo.") };
  });
}

/**
 * Traduz um erro da API para a tela.
 * @param {Error} error erro do apiFetch (code, status, details, message)
 * @param {Record<string,string>} fieldIds nome de campo da API -> id do campo na tela
 * @returns {{ message: string, fields: Record<string,string>, systemProblem: boolean }}
 */
export function humanizeApiError(error, fieldIds = {}) {
  const code = error && error.code;
  const raw = (error && error.message) || "";
  const fields = {};
  let message = "";
  const known = CODE_TEXT[code];
  if (known) {
    message = known.message;
    if (known.field && fieldIds[known.field]) fields[fieldIds[known.field]] = known.message;
  } else {
    for (const item of fieldErrorsOf(error)) {
      const id = fieldIds[item.field];
      const label = humanFieldLabel(item.field);
      if (id) fields[id] = item.message && !quotedFieldNames(item.message).length && !plainMessageProblems(item.message).length && /\s/.test(item.message) ? item.message : `Confira ${label ? `o campo ${label}` : "este campo"}.`;
    }
    message = humanizeMessage(raw);
    if (!Object.keys(fields).length && /obrigat[óo]rios?/i.test(raw)) {
      for (const name of quotedFieldNames(raw)) {
        const id = fieldIds[name];
        if (id) fields[id] = `Preencha ${humanFieldLabel(name) ? `o campo ${humanFieldLabel(name)}` : "este campo"}.`;
      }
    }
  }
  const systemProblem = quotedFieldNames(raw).some((n) => SYSTEM_FIELDS.has(n)) && !Object.keys(fields).length;
  return { message, fields, systemProblem };
}

/**
 * Texto do erro ao salvar um formulário de edição (rodada 8 da verificação do Marco 9): a mensagem da API com o rótulo humano no lugar do nome interno
 * ("O campo Nome de uso deve ser um texto de até 150 caracteres."), que diz o limite; se ela ainda tiver termo técnico, o texto de humanizeApiError.
 * `fields`: id do campo na tela -> mensagem (para o FormField marcar o campo).
 */
export function saveErrorText(error, fieldIds = {}, fallback = "Não foi possível salvar as alterações.") {
  const human = humanizeApiError(error, fieldIds);
  const own = withFieldLabels((error && error.message) || "");
  const clean = own && !quotedFieldNames(own).length && !plainMessageProblems(own).length && !/\p{Ll}\p{Lu}/u.test(own) ? own : "";
  return { message: clean || human.message || fallback, fields: human.fields };
}
