// Parâmetros dos fatos do dia do Centro de Comando (Marco 9, M9-D710): contratos assinados, oportunidades ganhas e pagamentos liquidados relevantes. A API valida (SETTINGS_SCHEMA);
// o padrão mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. O número é calculado no servidor.
const HELPER = "Papel responsável por conferir o número. Vale para o indicador publicado a partir de agora.";

const owner = (key, label, defaultValue) => ({ key, label: `Responsável pelo indicador ${label}`, type: "text", defaultValue, helper: HELPER });

export const BI_CENTRO_COMANDO_FATOS_GROUPS = [
  {
    title: "Centro de Comando: fatos do dia",
    subtitle: "Contratos assinados, oportunidades ganhas e pagamentos liquidados relevantes que aparecem no primeiro bloco do Centro de Comando. Aqui você ajusta a janela de tempo, o que conta como pagamento relevante e quem responde por cada indicador.",
    fields: [
      {
        key: "analytics.centro.janela_horas",
        label: "Janela dos fatos do dia, em horas",
        type: "number",
        defaultValue: 24,
        helper: "De 1 a 720. Para hoje a janela termina agora e começa essas horas antes; para uma data passada termina à meia-noite do dia seguinte (horário de São Paulo). A comparação usa a janela imediatamente anterior, de mesma duração. Padrão: 24.",
      },
      {
        key: "analytics.centro.valor_relevante",
        label: "Valor a partir do qual um pagamento liquidado é relevante",
        type: "text",
        defaultValue: "R$ 10.000,00",
        helper: "Em reais, como R$ 10.000,00. Pagamento de valor igual ou acima deste entra no bloco; abaixo, não. Dinheiro de terceiros nunca soma ao do grupo. Padrão: R$ 10.000,00.",
      },
      owner("analytics.owner.legal.contracts_signed", "Contratos assinados na janela", "Jurídico (papel juridico-gestor)"),
      owner("analytics.owner.crm.opportunities_won", "Oportunidades ganhas na janela", "Gerência Comercial (papel comercial-gestor)"),
      owner("analytics.owner.fin.payments_settled_relevant", "Pagamentos liquidados acima do valor relevante", "Diretoria Financeira (papel financeiro-gestor)"),
    ],
  },
];
