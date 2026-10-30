// Canais do Marketing (Marco 9, M9-D430). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
// A liberação de cada canal para produção (marketing.channel.<canal>.liberado) NÃO se edita aqui nem em Parâmetros: só a Diretoria libera, pelo serviço
// de liberação, depois dos testes do canal, da política de consentimento e da homologação do adapter. Enquanto não liberado, o canal só usa o simulador.
export const MARKETING_CANAIS_GROUPS = [
  {
    title: "Canais de Marketing e simulador",
    subtitle: "Canal não liberado para produção usa só o simulador (WhatsApp, e-mail, site, redes sociais e portais), e tudo o que ele devolve fica marcado como simulado. Os tempos abaixo valem para os cenários de teste do simulador.",
    fields: [
      {
        key: "marketing.channel.sandbox.slow_ms",
        label: "Espera do cenário lento do simulador (milissegundos)",
        type: "integer",
        defaultValue: 2000,
        helper: "Número inteiro de 0 a 60000.",
      },
      {
        key: "marketing.channel.sandbox.retry_after_s",
        label: "Tempo de espera informado pelo cenário de limite de chamadas (segundos)",
        type: "integer",
        defaultValue: 30,
        helper: "Número inteiro de 1 a 3600. O sistema respeita esse tempo antes de tentar de novo.",
      },
    ],
  },
];
