// Parâmetros dos painéis de Obras, Estoque e Patrimônio (Marco 9, M9-D618, M9-D652 e M9-D653). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
const OWNER_HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";
const owner = (key, label, value) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue: value, helper: OWNER_HELPER });
const OBRAS = "Diretoria de Obras (papel obras-gestor)";
const ESTOQUE = "Almoxarifado (papel estoque-gestor)";
export const BI_OBRAS_GROUPS = [
  {
    title: "Obras: previsão e receita",
    subtitle: "Como os painéis de Obras projetam o término e o custo final de cada obra e qual valor de contrato conta como receita. A projeção sempre aparece rotulada como projetada e nunca é somada ao que já foi realizado.",
    fields: [
      {
        key: "analytics.obra.previsao_metodo",
        label: "Método da previsão de prazo e custo",
        type: "text",
        defaultValue: "RITMO",
        helper: "RITMO projeta o término e o custo final pelo ritmo já medido na obra (padrão). PLANEJADO repete o prazo e o orçamento aprovados. Sem avanço medido, a previsão por ritmo fica em branco em vez de inventar um número.",
      },
      {
        key: "analytics.obra.receita_contrato_status",
        label: "Contratos que contam como receita da obra",
        type: "text",
        defaultValue: "SIGNED,ACTIVE,SUSPENDED,CLOSED",
        helper: "Status de contrato (em maiúsculas, separados por vírgula) cujo valor entra na receita contratada da obra. Contrato em rascunho, cancelado ou rescindido não entra.",
      },
    ],
  },
  {
    title: "Estoque: itens considerados",
    subtitle: "Quais tipos de item entram no valor em estoque, nos itens abaixo do mínimo e nas rupturas. Ferramentas e patrimônio têm painel próprio.",
    fields: [
      {
        key: "analytics.estoque.tipos_item",
        label: "Tipos de item do estoque",
        type: "text",
        defaultValue: "CONSUMABLE",
        helper: "Tipos separados por vírgula: CONSUMABLE, TOOL, ASSET, SERVICE_ITEM. Padrão: só os materiais de consumo.",
      },
    ],
  },
  {
    title: "Obras: desperdício, custo pós-obra e recorrência",
    subtitle: "Como os painéis de Obras mostram o que se perde e o que se repete. O valor é calculado no servidor; aqui você só ajusta as regras. Desperdício com baixa sem custo, e pós-obra com caso sem obra, aparecem como \"Dado incompleto\", sem número.",
    fields: [
      {
        key: "analytics.obra.recorrencia_dias",
        label: "Recorrência: janela em dias",
        type: "number",
        defaultValue: 180,
        helper: "De 1 a 3650 dias até a data-base. Duas ocorrências da mesma causa, equipe ou material dentro deste prazo contam como recorrência. Padrão: 180.",
      },
      {
        key: "analytics.obra.recorrencia_min_ocorrencias",
        label: "Recorrência: ocorrências mínimas",
        type: "number",
        defaultValue: 2,
        helper: "De 2 a 100. Quantas ocorrências na janela tornam a combinação recorrente. Padrão: 2.",
      },
      {
        key: "analytics.obra.recorrencia_top",
        label: "Recorrência: combinações no ranking",
        type: "number",
        defaultValue: 10,
        helper: "De 1 a 100. Quantas combinações aparecem no ranking das maiores. Padrão: 10.",
      },
      {
        key: "analytics.obra.recorrencia_max_sem_classificacao_pct",
        label: "Recorrência: ocorrências sem causa, equipe ou material aceitas (%)",
        type: "number",
        defaultValue: 100,
        helper: "De 0 a 100. Se a parte das ocorrências da janela sem classificação passar disto, a recorrência aparece como \"Dado incompleto\", sem número. Padrão: 100 (só conta as sem classificação).",
      },
      owner("analytics.owner.obra.waste", "Desperdício", OBRAS),
      owner("analytics.owner.obra.postwork_cost", "Custo pós-obra", OBRAS),
      owner("analytics.owner.obra.recurrence", "Recorrência por causa, equipe e material", OBRAS),
    ],
  },
];
