// Dados 100% mockados — alinhado ao schema confirmado do Caderno Técnico:
// people.persons / person_roles / person_contacts / person_documents / person_addresses.
// CPF/CNPJ vivem em persons.taxIdNormalized — nunca duplicados em person_documents.

export const PEOPLE = [
  {
    id: "person-1", personType: "PF", legalName: "Marina Costa", preferredName: "Nina",
    taxIdNormalized: "123.456.789-01", birthOrFoundationDate: "1988-04-12", status: "ACTIVE",
    createdAt: "2023-02-14T10:00:00Z",
    roles: ["PROPRIETARIO", "LOCATARIO"],
    contacts: [
      { type: "PHONE", value: "(11) 98211-4432", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "marina.costa@gmail.com", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [{ type: "RG", value: "34.221.998-5", verificationStatus: "VERIFIED" }],
    address: { zipCode: "04538-133", street: "Av. Brigadeiro Faria Lima", number: "1811", complement: "Apto 92", neighborhood: "Jardim Paulistano", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-2", personType: "PJ", legalName: "Construtora Vale Ltda.", preferredName: "",
    taxIdNormalized: "12.345.678/0001-90", birthOrFoundationDate: "2005-06-01", status: "ACTIVE",
    createdAt: "2022-08-01T10:00:00Z",
    roles: ["PROPRIETARIO"],
    contacts: [
      { type: "PHONE", value: "(11) 3256-7788", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "contato@construtoravale.com.br", primary: true, consentStatus: "PENDING" },
    ],
    documents: [],
    address: { zipCode: "01311-000", street: "Av. Paulista", number: "1578", complement: "Cj 121", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-3", personType: "PF", legalName: "Ricardo Alves", preferredName: "",
    taxIdNormalized: "234.567.890-12", birthOrFoundationDate: "1979-11-03", status: "ACTIVE",
    createdAt: "2024-01-22T10:00:00Z",
    roles: ["PROPRIETARIO"],
    contacts: [
      { type: "PHONE", value: "(15) 99711-2200", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "ricardo.alves@outlook.com", primary: false, consentStatus: "PENDING" },
    ],
    documents: [{ type: "CNH", value: "SP-88221144", verificationStatus: "PENDING" }],
    address: { zipCode: "18035-410", street: "Rua Coronel Aureliano de Camargo", number: "245", complement: "", neighborhood: "Vila Assis", city: "Sorocaba", state: "SP" },
  },
  {
    id: "person-4", personType: "PF", legalName: "Beatriz Nunes", preferredName: "Bia",
    taxIdNormalized: "345.678.901-23", birthOrFoundationDate: "1991-07-22", status: "ACTIVE",
    createdAt: "2023-11-05T10:00:00Z",
    roles: ["PROPRIETARIO", "FIADOR"],
    contacts: [
      { type: "PHONE", value: "(11) 98877-1122", primary: true, consentStatus: "CONSENTED" },
      { type: "WHATSAPP", value: "(11) 98877-1122", primary: false, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "bia.nunes@hotmail.com", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [{ type: "RG", value: "41.887.221-0", verificationStatus: "VERIFIED" }],
    address: { zipCode: "05407-002", street: "Rua Butantã", number: "312", complement: "", neighborhood: "Pinheiros", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-5", personType: "PF", legalName: "Fernando Lima", preferredName: "",
    taxIdNormalized: "456.789.012-34", birthOrFoundationDate: "1985-02-18", status: "ACTIVE",
    createdAt: "2024-05-19T10:00:00Z",
    roles: ["PROPRIETARIO", "COMPRADOR"],
    contacts: [
      { type: "PHONE", value: "(19) 99123-4455", primary: true, consentStatus: "PENDING" },
      { type: "EMAIL", value: "fernando.lima@gmail.com", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [{ type: "IR", value: "Exercício 2025", verificationStatus: "PENDING" }],
    address: { zipCode: "13070-172", street: "Av. Guilherme Campos", number: "500", complement: "Bloco B", neighborhood: "Jardim Santa Genebra", city: "Campinas", state: "SP" },
  },
  {
    id: "person-6", personType: "PF", legalName: "João Pereira", preferredName: "",
    taxIdNormalized: "567.890.123-45", birthOrFoundationDate: "1982-09-09", status: "ACTIVE",
    createdAt: "2021-09-30T10:00:00Z",
    roles: ["PROPRIETARIO", "CORRETOR"],
    contacts: [
      { type: "PHONE", value: "(11) 97744-8811", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "joao.pereira@nayaraimoveis.com.br", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [{ type: "CRECI", value: "SP-198877", verificationStatus: "VERIFIED" }],
    address: { zipCode: "04543-000", street: "Rua Funchal", number: "418", complement: "", neighborhood: "Vila Olímpia", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-7", personType: "PF", legalName: "Renata Souza", preferredName: "",
    taxIdNormalized: "678.901.234-56", birthOrFoundationDate: "1990-12-30", status: "ACTIVE",
    createdAt: "2021-03-11T10:00:00Z",
    roles: ["CORRETOR", "PROPRIETARIO"],
    contacts: [
      { type: "PHONE", value: "(11) 99001-2233", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "renata.souza@nayaraimoveis.com.br", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [{ type: "CRECI", value: "SP-177220", verificationStatus: "VERIFIED" }],
    address: { zipCode: "04543-000", street: "Rua Funchal", number: "500", complement: "Sala 12", neighborhood: "Vila Olímpia", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-8", personType: "PF", legalName: "Diego Martins", preferredName: "",
    taxIdNormalized: "789.012.345-67", birthOrFoundationDate: "1996-05-14", status: "ACTIVE",
    createdAt: "2025-04-02T10:00:00Z",
    roles: ["LOCATARIO"],
    contacts: [
      { type: "PHONE", value: "(11) 98456-9987", primary: true, consentStatus: "PENDING" },
      { type: "EMAIL", value: "diego.martins@yahoo.com.br", primary: true, consentStatus: "PENDING" },
    ],
    documents: [{ type: "HOLERITE", value: "Jul/2025", verificationStatus: "PENDING" }],
    address: { zipCode: "03310-000", street: "Rua Bresser", number: "1900", complement: "Apto 44", neighborhood: "Brás", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-9", personType: "PJ", legalName: "Grupo Habitar Empreendimentos S.A.", preferredName: "Grupo Habitar",
    taxIdNormalized: "23.456.789/0001-11", birthOrFoundationDate: "2010-03-15", status: "ACTIVE",
    createdAt: "2024-09-17T10:00:00Z",
    roles: ["COMPRADOR"],
    contacts: [
      { type: "PHONE", value: "(11) 3344-5566", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "juridico@grupohabitar.com.br", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [],
    address: { zipCode: "04578-000", street: "Av. Engenheiro Luís Carlos Berrini", number: "1748", complement: "18º andar", neighborhood: "Brooklin", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-10", personType: "PF", legalName: "Camila Rezende", preferredName: "",
    taxIdNormalized: "890.123.456-78", birthOrFoundationDate: "1993-01-27", status: "INACTIVE",
    createdAt: "2025-01-08T10:00:00Z",
    roles: ["FIADOR"],
    contacts: [
      { type: "PHONE", value: "(11) 99887-6655", primary: true, consentStatus: "PENDING" },
      { type: "EMAIL", value: "camila.rezende@gmail.com", primary: false, consentStatus: "PENDING" },
    ],
    documents: [{ type: "RG", value: "29.665.410-2", verificationStatus: "REJECTED" }],
    address: { zipCode: "05033-000", street: "Rua Turiassu", number: "1440", complement: "", neighborhood: "Perdizes", city: "São Paulo", state: "SP" },
  },
  {
    id: "person-11", personType: "PF", legalName: "Paulo Bittencourt", preferredName: "",
    taxIdNormalized: "901.234.567-89", birthOrFoundationDate: "1987-08-08", status: "ACTIVE",
    createdAt: "2025-07-25T10:00:00Z",
    roles: ["LOCATARIO", "COMPRADOR"],
    contacts: [
      { type: "PHONE", value: "(19) 98123-0099", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "paulo.bitt@gmail.com", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [{ type: "CIN", value: "12.345.678-90", verificationStatus: "VERIFIED" }],
    address: { zipCode: "13070-172", street: "Av. Guilherme Campos", number: "700", complement: "", neighborhood: "Jardim Santa Genebra", city: "Campinas", state: "SP" },
  },
  {
    id: "person-12", personType: "PJ", legalName: "Imobiliária Sul Comercial Ltda.", preferredName: "",
    taxIdNormalized: "34.567.890/0001-22", birthOrFoundationDate: "1998-10-10", status: "ACTIVE",
    createdAt: "2022-12-03T10:00:00Z",
    roles: ["PROPRIETARIO", "LOCATARIO"],
    contacts: [
      { type: "PHONE", value: "(11) 3011-2299", primary: true, consentStatus: "CONSENTED" },
      { type: "EMAIL", value: "contato@sulcomercial.com.br", primary: true, consentStatus: "CONSENTED" },
    ],
    documents: [],
    address: { zipCode: "04571-000", street: "Av. Santo Amaro", number: "2010", complement: "Loja 3", neighborhood: "Brooklin", city: "São Paulo", state: "SP" },
  },
  // Par de possíveis duplicatas (mesmo nome + telefone) — usado para demonstrar o fluxo de merge.
  {
    id: "person-13", personType: "PF", legalName: "Fernando Lima", preferredName: "",
    taxIdNormalized: "111.222.333-44", birthOrFoundationDate: "1985-02-18", status: "ACTIVE",
    createdAt: "2025-08-01T10:00:00Z",
    roles: ["LOCATARIO"],
    contacts: [
      { type: "PHONE", value: "(19) 99123-4455", primary: true, consentStatus: "PENDING" },
      { type: "EMAIL", value: "f.lima.contato@gmail.com", primary: true, consentStatus: "PENDING" },
    ],
    documents: [],
    address: { zipCode: "13070-172", street: "Av. Guilherme Campos", number: "500", complement: "Bloco B", neighborhood: "Jardim Santa Genebra", city: "Campinas", state: "SP" },
    possibleDuplicateOf: "person-5",
  },
];

// Pares estáticos de possíveis duplicatas exibidos na listagem (mockado).
export const DUPLICATE_PAIRS = [["person-5", "person-13"]];

export const ROLE_LABELS = {
  CLIENTE: "Cliente",
  PROPRIETARIO: "Proprietário",
  LOCATARIO: "Locatário",
  FORNECEDOR: "Fornecedor",
  CORRETOR: "Corretor",
  COMPRADOR: "Comprador",
  FIADOR: "Fiador",
};

export const ROLE_TONE = {
  CLIENTE: "info",
  PROPRIETARIO: "brand",
  LOCATARIO: "info",
  FORNECEDOR: "warning",
  CORRETOR: "neutral",
  COMPRADOR: "success",
  FIADOR: "warning",
};

export const STATUS_LABELS = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  BLOCKED: "Bloqueado",
  MERGED: "Mesclado",
};

export const STATUS_TONE = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  BLOCKED: "danger",
  MERGED: "neutral",
};

export const CONTACT_TYPE_LABELS = {
  PHONE: "Telefone",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
};

export const CONTACT_TYPE_ICON = {
  PHONE: "phone",
  WHATSAPP: "phone",
  EMAIL: "mail",
};

export const CONSENT_LABELS = {
  CONSENTED: "Consentido",
  PENDING: "Pendente",
};

export const DOCUMENT_TYPE_LABELS = {
  RG: "RG",
  CIN: "CIN",
  CNH: "CNH",
  IR: "Imposto de Renda",
  HOLERITE: "Holerite",
  CRECI: "CRECI",
};

export const VERIFICATION_LABELS = {
  PENDING: "Pendente",
  VERIFIED: "Verificado",
  REJECTED: "Rejeitado",
};

export const VERIFICATION_TONE = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};
