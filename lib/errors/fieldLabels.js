// Mapa central de rótulos humanos (M9-D851 §3.5). Nome interno de campo da API (camelCase/snake_case) NUNCA aparece para a pessoa:
// aqui ele vira o rótulo que a tela mostra. Campo de sistema (grupo, empresa, usuário) não é digitado pela pessoa e tem texto próprio.
export const FIELD_LABELS = {
  legalName: "Nome ou razão social",
  preferredName: "Nome de uso",
  taxIdNormalized: "CPF ou CNPJ",
  personType: "Tipo de pessoa",
  birthOrFoundationDate: "Data de nascimento ou fundação",
  contactType: "Tipo do contato",
  valueNormalized: "Valor do contato",
  documentType: "Tipo do documento",
  fileId: "Arquivo do documento",
  roleCode: "Papel",
  roles: "Papéis",
  zipCode: "CEP",
  street: "Logradouro",
  number: "Número",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "UF",
  email: "E-mail",
  password: "Senha",
  name: "Nome",
  description: "Descrição",
  code: "Código",
  permissions: "Permissões",
  reason: "Motivo",
};

// Campos que o sistema preenche sozinho: se a API reclamar deles, o problema é de sessão, não de digitação.
export const SYSTEM_FIELDS = new Set(["groupId", "companyId", "userId", "tenantId", "actorUserId"]);
export const SYSTEM_FIELD_TEXT = "sua empresa";

// Campo da API -> id do campo na tela (cada formulário passa o seu mapa).
export function humanFieldLabel(name) {
  if (SYSTEM_FIELDS.has(name)) return SYSTEM_FIELD_TEXT;
  if (FIELD_LABELS[name]) return FIELD_LABELS[name];
  return null;
}
