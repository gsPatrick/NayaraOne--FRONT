// Parâmetros de execução das automações do Marketing (Marco 9, M9-D415). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_RUNNER_GROUPS = [
  {
    title: "Execução das automações",
    subtitle: "Uma execução que fica em andamento além deste tempo, sem terminar, é considerada travada e é retomada só nas ações que faltam. Execuções que esperam um horário marcado (horário de silêncio, cadência) nunca são tratadas como travadas.",
    fields: [
      {
        key: "marketing.runner.timeout_s",
        label: "Tempo para considerar uma execução travada (segundos)",
        type: "integer",
        defaultValue: 300,
        helper: "Número inteiro de 1 a 86400.",
      },
      {
        key: "marketing.runner.acao_timeout_s",
        label: "Tempo máximo de cada ação da automação (segundos)",
        type: "integer",
        defaultValue: 30,
        helper: "Número inteiro de 1 a 3600. Uma ação que passa deste tempo fica com resultado desconhecido e não é repetida sem conferir antes.",
      },
      {
        key: "marketing.runner.canais_automaticos",
        label: "Ordem dos canais quando a ação de envio pede canal automático",
        type: "text",
        defaultValue: "WHATSAPP, EMAIL",
        helper: "Canais separados por vírgula (WHATSAPP, EMAIL). O primeiro em que a pessoa tem contato é o usado; se não tiver nenhum, a automação não envia.",
      },
    ],
  },
  {
    title: "Textos de envio e de automação: tamanho e endereços ambíguos",
    subtitle: "Valem para a mensagem enviada direto, para o texto das ações das automações, para templates e para a legenda do vídeo. O tamanho é conferido antes de qualquer leitura do texto, para que um pedido enorme não trave o sistema.",
    fields: [
      {
        key: "marketing.url.max_chars_variavel",
        label: "Tamanho máximo de cada variável (caracteres)",
        type: "integer",
        defaultValue: 2000,
        helper: "Número inteiro de 50 a 100000. Vale para cada item de lista, cada campo de objeto e cada chave. Acima disso o envio ou a automação é recusado.",
      },
      {
        key: "marketing.url.max_chars_campo",
        label: "Tamanho máximo de cada campo de texto (caracteres)",
        type: "integer",
        defaultValue: 20000,
        helper: "Número inteiro de 200 a 200000. Vale para texto, assunto, pré-cabeçalho, corpo de template e legenda.",
      },
      {
        key: "marketing.url.max_chars_total",
        label: "Tamanho máximo de tudo que é conferido numa chamada (caracteres)",
        type: "integer",
        defaultValue: 100000,
        helper: "Número inteiro de 1000 a 2000000. Soma de todos os campos e variáveis de um envio ou de uma automação.",
      },
      {
        key: "marketing.url.revisao_sem_aprovador",
        label: "Endereço ambíguo onde não há aprovação humana",
        type: "enum",
        defaultValue: "bloquear",
        options: [{ value: "bloquear", label: "Bloquear (mais seguro)" }, { value: "permitir", label: "Permitir" }],
        helper: "Abreviações coladas (Av.Paulista), nomes de arquivo (foto.jpg) e endereços curtos duvidosos não são claramente perigosos. No conteúdo gerado eles vão à aprovação humana; no envio direto, nas automações, nos templates e nas legendas não há quem aprove, então o padrão é bloquear. Escreva Av. Paulista com espaço para não ser barrado.",
      },
    ],
  },
];
