// Aplicação do registro de classificação em tela, API, exportação e IA na aba Governança (Marco 9, M9-D915). Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_ACESSO_CAMPO_GROUPS = [
  {
    title: "Dado sensível na tela, na exportação e na IA",
    subtitle:
      "O registro de classificação decide o que cada pessoa vê de um campo: máscara na tela e na API, exportabilidade por coluna e uso pela IA (ai_allowed). Os parâmetros abaixo ajustam o texto da máscara total, quais agentes de IA recebem campo de baixo risco em claro e de qual tabela do registro vem cada tipo de recurso da tela.",
    fields: [
      { key: "governanca.dlp.mascara.texto_total", label: "Texto da máscara total", type: "text", defaultValue: "••••••", helper: "De 1 a 40 caracteres. Aparece no lugar do valor quando a máscara do campo é total ou quando o registro não pôde ser consultado." },
      { key: "governanca.ia.agentes_claro", label: "Agentes de IA que recebem campo LOW ou MEDIUM em claro", type: "text", defaultValue: "NENHUM", helper: "Códigos de agente separados por vírgula (por exemplo NAY_FINANCEIRA). NENHUM = nenhum agente: todo campo liberado à IA entra mascarado. Campos HIGH nunca vão em claro e RESTRICTED nunca vai à IA." },
      { key: "governanca.dlp.view.tabelas", label: "Tabelas do registro por tipo de recurso (tela e API)", type: "text", defaultValue: "people.person: people.persons; properties.property: real_estate.properties; procurement.supplier: people.persons; legal.contract: legal.contracts; finance.bank_account: finance.bank_accounts; files.file: people.files", helper: "Formato tipo: schema.tabela, schema.tabela; outro.tipo: schema.tabela. Os campos HIGH e RESTRICTED dessas tabelas saem mascarados para quem não tem a permissão." },
    ],
  },
];
