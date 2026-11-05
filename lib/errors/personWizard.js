// Validação no cliente do assistente "Novo contato" (M9-D851 §3.5): campos marcados com * em cada etapa, mensagem por campo em português
// simples (o que houve e o que fazer). Chave = id do campo na tela. A API continua validando; isto evita o vai-e-volta e a mensagem técnica.

const digits = (value) => String(value || "").replace(/\D/g, "");
const empty = (value) => !String(value == null ? "" : value).trim();

export const PERSON_FIELD_IDS = {
  legalName: "p-name",
  taxIdNormalized: "p-doc",
  birthOrFoundationDate: "p-birth",
  valueNormalized: "p-contact-value-0",
  zipCode: "p-zip",
  street: "p-street",
  neighborhood: "p-neighborhood",
  city: "p-city",
  state: "p-state",
};

// Etapa em que cada campo aparece (para levar a pessoa à etapa certa quando a API recusa).
export const PERSON_FIELD_STEP = {
  "p-name": "basico", "p-doc": "basico", "p-birth": "basico", "p-contact-value-0": "contatos",
  "p-zip": "endereco", "p-street": "endereco", "p-neighborhood": "endereco", "p-city": "endereco", "p-state": "endereco",
};

export function validatePersonStep(stepId, { basic, contacts, address }) {
  const errors = {};
  if (stepId === "basico") {
    if (empty(basic.legalName)) errors["p-name"] = basic.personType === "PJ" ? "Informe a razão social da empresa." : "Informe o nome completo da pessoa.";
    const size = basic.personType === "PJ" ? 14 : 11;
    const label = basic.personType === "PJ" ? "CNPJ" : "CPF";
    if (empty(basic.taxIdNormalized)) errors["p-doc"] = `Informe o ${label}, só com números.`;
    else if (digits(basic.taxIdNormalized).length !== size) errors["p-doc"] = `Informe o ${label} com ${size} dígitos.`;
  }
  if (stepId === "contatos" && !contacts.some((c) => !empty(c.value))) {
    errors["p-contact-value-0"] = "Informe pelo menos um telefone ou e-mail de contato.";
  }
  if (stepId === "endereco") {
    if (empty(address.zipCode)) errors["p-zip"] = "Informe o CEP com 8 dígitos.";
    else if (digits(address.zipCode).length !== 8) errors["p-zip"] = "Informe o CEP com 8 dígitos.";
    if (empty(address.street)) errors["p-street"] = "Informe o logradouro (rua, avenida...).";
    if (empty(address.neighborhood)) errors["p-neighborhood"] = "Informe o bairro.";
    if (empty(address.city)) errors["p-city"] = "Informe a cidade.";
    if (empty(address.state)) errors["p-state"] = "Informe a UF com 2 letras, por exemplo SP.";
    else if (String(address.state).trim().length !== 2) errors["p-state"] = "Informe a UF com 2 letras, por exemplo SP.";
  }
  return errors;
}
