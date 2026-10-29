// Minimização dos dados enviados a fornecedores (Marco 9, M9-D219). Padrão = teto do livro (Maturacao/demandas/parametros.csv);
// a API só aceita valor igual ou mais restritivo que o do livro. Entra na aba "Registro de integrações".
const OPCOES = [
  { value: "PUBLIC", label: "Público" },
  { value: "INTERNAL", label: "Interno" },
  { value: "CONFIDENTIAL", label: "Confidencial" },
  { value: "PERSONAL", label: "Dado pessoal" },
  { value: "SENSITIVE", label: "Dado sensível" },
];

// [família, rótulo, padrão do livro]
const FAMILIAS = [
  ["messaging", "WhatsApp e atendimento", "PERSONAL"],
  ["email", "E-mail", "PERSONAL"],
  ["site", "Site", "PUBLIC"],
  ["portal", "Portais imobiliários", "PUBLIC"],
  ["signature", "Assinatura digital", "PERSONAL"],
  ["bank", "Bancos, extratos e pagamentos", "PERSONAL"],
  ["insurance", "Seguradoras e garantias", "PERSONAL"],
  ["financing", "Financiamento e promotoras", "SENSITIVE"],
  ["fiscal", "NFS-e e fiscal", "PERSONAL"],
  ["social", "Redes sociais e publicação", "PUBLIC"],
  ["storage", "Armazenamento de objetos", "INTERNAL"],
  ["identity", "Identidade e autenticação", "PERSONAL"],
  ["ai", "Modelos de IA", "PUBLIC"],
  ["analytics", "Analytics e monitoramento", "PUBLIC"],
];

export const MINIMIZACAO_GROUP = {
  title: "Dados enviados aos fornecedores",
  subtitle:
    "Cada fornecedor recebe só o necessário para a tarefa dele. Aqui você define, por família, o nível mais sensível de dado que pode sair. O padrão é o limite do livro e você só consegue deixá-lo mais restritivo; campo acima do limite é removido (ou o envio é recusado se o campo for obrigatório).",
  fields: FAMILIAS.map(([familia, label, defaultValue]) => ({
    key: `integration.minimizacao.max_classificacao.${familia}`,
    label,
    type: "enum",
    defaultValue,
    options: OPCOES,
    helper: "Mais restritivo que o padrão vale; mais permissivo é ignorado pelo servidor.",
  })),
};
