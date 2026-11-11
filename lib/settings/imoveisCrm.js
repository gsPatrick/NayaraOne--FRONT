// Parâmetros de Imóveis e CRM do Marco 3 (verificação de 11/11/2026), editados em Configurações > Imóveis e CRM. O livro não diz
// quais documentos nem quais campos o gate de publicação exige, nem o prazo do link do carrinho: são parâmetros da empresa
// (DI-M3IM-1, DI-M3IM-3, DI-M3IM-6). Padrões = comportamento anterior do código. A API valida (SETTINGS_SCHEMA).

export const KEYS = {
  documentTypes: "real_estate.publication.required_document_types",
  fields: "real_estate.publication.required_fields",
  cartDays: "crm.cart.link_expiration_days",
};

export const DEFAULTS = {
  documentTypes: ["REGISTRY", "IPTU"],
  fields: ["title", "internalCode", "propertyType", "address", "owner"],
  cartDays: 7,
};

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "REGISTRY", label: "Matrícula" },
  { value: "IPTU", label: "IPTU" },
  { value: "CONDO_FEE", label: "Condomínio" },
  { value: "REGULARIZATION_CERTIFICATE", label: "Certidão de regularização" },
];

export const FIELD_OPTIONS = [
  { value: "title", label: "Nome / referência do imóvel" },
  { value: "internalCode", label: "Código interno" },
  { value: "propertyType", label: "Tipo do imóvel" },
  { value: "address", label: "Endereço completo (CEP, logradouro, bairro, cidade e UF)" },
  { value: "owner", label: "Ao menos um proprietário" },
  { value: "description", label: "Descrição" },
  { value: "descriptionPublic", label: "Descrição pública (site e portais)" },
  { value: "areaTotalM2", label: "Área total (m²)" },
  { value: "bedrooms", label: "Quartos" },
  { value: "parkingSpots", label: "Vagas" },
  { value: "registryNumber", label: "Matrícula (número)" },
  { value: "coordinates", label: "Latitude e longitude" },
];

export const CART_DAYS_RANGE = { min: 1, max: 90 };

/** Lista gravada ("A,B") -> array, só com valores do catálogo; vazio ou inválido -> padrão. */
export function parseList(value, options, fallback) {
  const allowed = options.map((o) => o.value);
  const items = String(value || "").split(",").map((v) => v.trim()).filter((v) => allowed.includes(v));
  return items.length ? [...new Set(items)] : [...fallback];
}

/** Array -> valor da API, na ordem do catálogo (mesma lista = mesmo texto). */
export function serializeList(items, options) {
  return options.map((o) => o.value).filter((v) => items.includes(v)).join(",");
}

/** Erros do formulário antes de mandar à API. */
export function validate(values) {
  const errors = {};
  if (!values.documentTypes.length) errors.documentTypes = "Escolha ao menos um documento.";
  if (!values.fields.length) errors.fields = "Escolha ao menos um campo.";
  const days = Number(values.cartDays);
  if (!Number.isInteger(days) || days < CART_DAYS_RANGE.min || days > CART_DAYS_RANGE.max) {
    errors.cartDays = `Validade do link: número inteiro entre ${CART_DAYS_RANGE.min} e ${CART_DAYS_RANGE.max} dias.`;
  }
  return errors;
}
