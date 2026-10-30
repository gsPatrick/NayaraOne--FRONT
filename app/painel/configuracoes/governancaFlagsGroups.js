// Registro de flags e configurações na aba Governança (Marco 9, M9-D870). Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_FLAGS_GROUPS = [
  {
    title: "Flags e configurações: registro com responsável",
    subtitle:
      "Cada flag ou configuração tem responsável, escopo, risco, versão, validade e auditoria. O livro registra o risco mas não fixa os níveis de cada chave; aqui você define o risco inicial de uma chave nova, o das configurações da empresa que passam a constar no registro e o dos cinco interruptores de degradação por custo.",
    fields: [
      { key: "governanca.flags.risco_padrao", label: "Risco de uma chave nova quando não informado", type: "text", defaultValue: "MEDIUM", helper: "LOW, MEDIUM, HIGH ou CRITICAL." },
      { key: "governanca.flags.risco_config_absorvida", label: "Risco das configurações da empresa absorvidas pelo registro", type: "text", defaultValue: "LOW", helper: "LOW, MEDIUM, HIGH ou CRITICAL." },
      { key: "governanca.flags.risco_interruptores_degradacao", label: "Risco dos cinco interruptores de degradação por custo", type: "text", defaultValue: "MEDIUM", helper: "LOW, MEDIUM, HIGH ou CRITICAL." },
      { key: "governanca.flags.valor_max_caracteres", label: "Tamanho máximo do valor de texto ou JSON de uma chave (caracteres)", type: "integer", defaultValue: 2000, min: 100, max: 100000 },
    ],
  },
];
