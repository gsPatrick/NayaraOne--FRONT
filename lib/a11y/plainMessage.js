// Mensagens compreensíveis (M9-D851 §3.5): português simples, diz o que houve e o que fazer; sem código solto, sem "Erro 500" sozinho,
// sem inglês cru. Exemplo de erro de campo: "Informe o CPF com 11 dígitos".

const ENGLISH = /\b(failed to fetch|network error|unauthorized|forbidden|internal server error|something went wrong|undefined|null|NaN|object Object)\b/i;
const RAW_CODE = /\b[A-Z]{2,}(?:_[A-Z0-9]{2,})+\b/;
const BARE_STATUS = /^\s*(erro|error)\s*:?\s*\d{3}\s*[.!]?\s*$/i;

/** Problemas de uma mensagem para a pessoa: lista vazia = ok. */
export function plainMessageProblems(text) {
  const problems = [];
  const value = String(text == null ? "" : text).trim();
  if (value.length < 8) problems.push("curta demais para dizer o que houve");
  if (BARE_STATUS.test(value)) problems.push("erro só com o número do status");
  if (RAW_CODE.test(value)) problems.push("código técnico solto na mensagem");
  if (ENGLISH.test(value)) problems.push("texto em inglês ou valor interno");
  if (/at\s+\S+\s+\(.*:\d+:\d+\)/.test(value)) problems.push("rastro de pilha");
  return problems;
}

/** Mensagem de erro de campo: pede a ação ("Informe", "Use", "Escolha", "Selecione", "Digite", "Preencha", "Confira") ou diz o que está errado em português. */
export const FIELD_MESSAGE_START = /^(Informe|Use|Escolha|Selecione|Digite|Preencha|Confira|Envie|Anexe|Marque|O |A |Os |As |Já |Não )/;
