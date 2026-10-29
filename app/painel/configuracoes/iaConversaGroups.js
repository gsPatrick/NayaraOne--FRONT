// Parâmetros das rotas de execução e do chat da NAY (Marco 9, M9-D030). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_CONVERSA_GROUPS = [
  {
    title: "Consulta e conversa com a NAY",
    subtitle: "Quanto tempo a tela espera a resposta de uma consulta e como funciona a conversa com um agente. A conversa não vira memória da NAY: o histórico serve apenas de contexto para a próxima pergunta.",
    fields: [
      {
        key: "ia.run.sincrono_max_ms",
        label: "Tempo de espera da resposta de uma consulta (milissegundos)",
        type: "integer",
        min: 1,
        max: 600000,
        defaultValue: 25000,
        helper: "Número inteiro de 1 a 600000. Passando desse tempo, a consulta continua em segundo plano e a tela recebe o aviso de que ela está em andamento, para consultar o resultado depois.",
      },
      {
        key: "ia.chat.max_mensagens",
        label: "Mensagens anteriores usadas como contexto na conversa",
        type: "integer",
        min: 0,
        max: 50,
        defaultValue: 10,
        helper: "Número inteiro de 0 a 50. Quantas das últimas mensagens da conversa (suas e da NAY) vão junto com a nova pergunta. 0 = cada pergunta é respondida sozinha. Dados pessoais são ocultados antes do envio.",
      },
      {
        key: "ia.chat.conversa_validade_horas",
        label: "Validade de uma conversa (horas)",
        type: "integer",
        min: 1,
        max: 720,
        defaultValue: 24,
        helper: "Número inteiro de 1 a 720. Contada desde a primeira mensagem. Passado o prazo, é preciso iniciar uma nova conversa.",
      },
    ],
  },
];
