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
  {
    title: "Flags temporárias: expiração e aviso",
    subtitle:
      "A flag temporária tem data de fim. Passada a data, o job diário a marca como expirada (ela deixa de valer) e avisa o responsável com notificação crítica. O livro fixa 06:30; aqui você ajusta o horário e se o aviso se repete todo dia enquanto a flag continuar vencida no registro.",
    fields: [
      { key: "governanca.flags.expiracao_hora", label: "Hora do job de expiração (Brasília)", type: "integer", defaultValue: 6, min: 0, max: 23 },
      { key: "governanca.flags.expiracao_minuto", label: "Minuto do job de expiração", type: "integer", defaultValue: 30, min: 0, max: 59 },
      { key: "governanca.flags.expiracao_lembrete_diario", label: "Avisar o responsável todo dia enquanto a flag vencida continuar no registro", type: "boolean", defaultValue: true },
    ],
  },
  {
    title: "Kill switch: teste periódico",
    subtitle:
      "Todo kill switch crítico é acionado de verdade, em homologação ou desenvolvimento (nunca em produção), a cada período, e o resultado fica registrado. O livro pede teste periódico sem dizer o prazo: o padrão é 30 dias. Sem teste válido dentro do prazo, o responsável recebe alerta crítico; o teste que falha marca o switch como não verificado e se repete todo dia no horário abaixo até passar.",
    fields: [
      { key: "governanca.flags.kill_teste_dias", label: "Periodicidade do teste do kill switch (dias)", type: "integer", defaultValue: 30, min: 1, max: 365 },
      { key: "governanca.flags.kill_teste_hora", label: "Hora do job de teste (Brasília)", type: "integer", defaultValue: 5, min: 0, max: 23 },
      { key: "governanca.flags.kill_teste_minuto", label: "Minuto do job de teste", type: "integer", defaultValue: 0, min: 0, max: 59 },
      { key: "governanca.flags.kill_teste_tolerancia_min", label: "Minutos de um teste em andamento antes de ser dado como interrompido", type: "integer", defaultValue: 10, min: 1, max: 1440, helper: "Passado esse tempo, a execução seguinte devolve o switch ao estado anterior." },
      { key: "governanca.flags.negadas_janela_s", label: "Janela de agregação das tentativas negadas em parâmetro protegido (segundos)", type: "integer", defaultValue: 60, min: 1, max: 3600, helper: "Tentativas negadas do mesmo usuário na mesma chave dentro da janela viram uma linha de auditoria com a contagem." },
    ],
  },
];
