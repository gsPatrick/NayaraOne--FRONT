// Parâmetros do BI do Financeiro (Marco 9, M9-D620): caixa livre e dinheiro de terceiros. A API valida (SETTINGS_SCHEMA); o padrão mostrado é o de
// Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada.
export const BI_CAIXA_GROUPS = [
  {
    title: "Caixa livre e dinheiro de terceiros",
    subtitle: "Como o painel Financeiro separa o caixa que a empresa pode usar do dinheiro que tem dono (caução e repasses). O valor é calculado no servidor; aqui você só ajusta as regras.",
    fields: [
      {
        key: "analytics.caixa.usar_saldo_abertura",
        label: "Somar o saldo de abertura das contas ao caixa",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão: o saldo que a conta bancária já tinha antes do primeiro lançamento do sistema entra no caixa total. O saldo de abertura é informado no cadastro da conta bancária.",
      },
      {
        key: "analytics.terceiros.termos_caucao",
        label: "Termos que identificam uma caução",
        type: "text",
        defaultValue: "caução, caucao",
        helper: "Separe por vírgula (até 10 termos). Se a referência do dinheiro de terceiros tiver um deles, ele conta como caução no detalhe por origem. Padrão: caução, caucao.",
      },
      {
        key: "analytics.terceiros.termos_repasse",
        label: "Termos que identificam um repasse ao proprietário",
        type: "text",
        defaultValue: "repasse",
        helper: "Separe por vírgula (até 10 termos). O que não casar com caução nem com repasse aparece como \"outro\". Padrão: repasse.",
      },
      {
        key: "analytics.mapa_status.finance",
        label: "Mapa de status dos lançamentos do Financeiro",
        type: "text",
        defaultValue: "a pagar/receber = PENDING; liquidado = SETTLED; REVERSED e CANCELLED excluídos; estorno e original ignorados em par",
        helper: "O trecho \"liquidado = SETTLED\" diz quais status entram como dinheiro realizado (SETTLED e, se quiser, PARTIALLY_SETTLED). Cancelados, estornados e o par estorno/original nunca entram.",
      },
      {
        key: "analytics.owner.fin.free_cash",
        label: "Responsável pelo indicador Caixa livre",
        type: "text",
        defaultValue: "Diretoria Financeira (papel financeiro-gestor)",
        helper: "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.",
      },
      {
        key: "analytics.owner.fin.third_party_cash",
        label: "Responsável pelo indicador Dinheiro de terceiros",
        type: "text",
        defaultValue: "Diretoria Financeira (papel financeiro-gestor)",
        helper: "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.",
      },
    ],
  },
];
