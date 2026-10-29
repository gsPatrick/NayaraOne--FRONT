// Parâmetros do Centro de Comando da Diretoria (Marco 9, M9-D685): quantos itens cada bloco mostra, o que conta como variação relevante e como o dinheiro parado e o perdido
// são calculados. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
export const BI_CENTRO_COMANDO_GROUPS = [
  {
    title: "Centro de Comando: os seis blocos",
    subtitle: "A tela inicial da diretoria responde seis perguntas, cada uma com poucos itens ordenados por importância. Aqui você ajusta quantos itens aparecem, o que é uma variação relevante e quando uma obra entra em risco.",
    fields: [
      {
        key: "analytics.centro.max_itens_por_bloco",
        label: "Itens por bloco",
        type: "number",
        defaultValue: 5,
        helper: "De 1 a 50. Os demais itens ficam atrás do link \"Ver todos\". Padrão: 5.",
      },
      {
        key: "analytics.centro.relevancia_pct",
        label: "Variação mínima para entrar em \"O que aconteceu\" (%)",
        type: "number",
        defaultValue: 10,
        helper: "De 0 a 1.000. Um indicador crítico só aparece quando a variação contra a janela anterior (de mesma duração) passa deste percentual. Padrão: 10.",
      },
      {
        key: "analytics.centro.margem_minima_pct",
        label: "Margem projetada mínima da obra (%)",
        type: "number",
        defaultValue: 10,
        helper: "De -100 a 100. Obra com margem projetada abaixo disto aparece em \"Onde há risco\". Padrão: 10.",
      },
      {
        key: "analytics.centro.papeis_diretoria",
        label: "Papéis da diretoria",
        type: "text",
        defaultValue: "Diretoria",
        helper: "Nomes de papel separados por vírgula. Alerta já reconhecido, ainda sem resolução, cujo responsável é um destes papéis, aparece em \"O que exige decisão\". Padrão: Diretoria.",
      },
    ],
  },
  {
    title: "Centro de Comando: dinheiro parado e perdido",
    subtitle: "Os dois totais saem sempre separados, cada um com a lista dos componentes. Repasses a proprietários vencidos são dinheiro de terceiros: ficam à parte e nunca entram na soma.",
    fields: [
      {
        key: "analytics.centro.dinheiro_parado_componentes",
        label: "Fórmula do dinheiro parado e do perdido",
        type: "text",
        defaultValue: "PARADO: fin.overdue_receivables + obra.measurements pendentes + cor.commission confirmada a receber + fin.owner_repasses_pending vencidos (à parte); PERDIDO: inv.losses + obra.waste + obra.postwork_cost",
        helper: "Formato: PARADO: código + código; PERDIDO: código + código. Em PARADO valem fin.overdue_receivables, obra.measurements, cor.commission e fin.owner_repasses_pending; em PERDIDO, inv.losses, obra.waste e obra.postwork_cost. Retire um código para tirá-lo da conta. Valor inválido é recusado.",
      },
    ],
  },
];
