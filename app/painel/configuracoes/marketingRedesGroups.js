// Redes sociais do Marketing (Marco 9, M9-D428). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
export const MARKETING_REDES_GROUPS = [
  {
    title: "Redes sociais: limites de cada rede",
    subtitle: "Cada rede tem regras próprias de formato, proporção, duração, tamanho e tamanho da legenda. O sistema confere o conteúdo contra estes limites ANTES de agendar a publicação e recusa o que passa. Os valores iniciais são os limites publicados pelas redes; ajuste aqui quando uma rede mudar a regra.",
    fields: [
      {
        key: "marketing.social.instagram.capacidades",
        label: "Limites do Instagram",
        type: "text",
        defaultValue: "{\"formatos\":[\"IMAGE\",\"CAROUSEL\",\"VIDEO\",\"REEL\"],\"proporcoes\":{\"IMAGE\":[\"1:1\",\"4:5\",\"1.91:1\"],\"CAROUSEL\":[\"1:1\",\"4:5\"],\"VIDEO\":[\"1:1\",\"4:5\"],\"REEL\":[\"9:16\"]},\"duracaoMaxS\":{\"VIDEO\":60,\"REEL\":90},\"tamanhoMaxMb\":{\"IMAGE\":8,\"CAROUSEL\":8,\"VIDEO\":100,\"REEL\":100},\"legendaMax\":2200}",
        helper: "JSON com formatos (IMAGE, CAROUSEL, VIDEO, REEL), proporcoes por formato (largura:altura), duracaoMaxS e tamanhoMaxMb por formato e legendaMax (caracteres). O conteúdo que passa de um limite é recusado antes de agendar.",
      },
      {
        key: "marketing.social.facebook.capacidades",
        label: "Limites do Facebook",
        type: "text",
        defaultValue: "{\"formatos\":[\"IMAGE\",\"CAROUSEL\",\"VIDEO\",\"REEL\"],\"proporcoes\":{\"IMAGE\":[\"1:1\",\"4:5\",\"1.91:1\",\"16:9\"],\"CAROUSEL\":[\"1:1\",\"1.91:1\"],\"VIDEO\":[\"1:1\",\"4:5\",\"16:9\",\"9:16\"],\"REEL\":[\"9:16\"]},\"duracaoMaxS\":{\"VIDEO\":7200,\"REEL\":90},\"tamanhoMaxMb\":{\"IMAGE\":10,\"CAROUSEL\":10,\"VIDEO\":1024,\"REEL\":1024},\"legendaMax\":63206}",
        helper: "JSON com formatos (IMAGE, CAROUSEL, VIDEO, REEL), proporcoes por formato (largura:altura), duracaoMaxS e tamanhoMaxMb por formato e legendaMax (caracteres). O conteúdo que passa de um limite é recusado antes de agendar.",
      },
      {
        key: "marketing.social.linkedin.capacidades",
        label: "Limites do LinkedIn",
        type: "text",
        defaultValue: "{\"formatos\":[\"IMAGE\",\"CAROUSEL\",\"VIDEO\"],\"proporcoes\":{\"IMAGE\":[\"1.91:1\",\"1:1\",\"4:5\"],\"CAROUSEL\":[\"1:1\",\"1.91:1\"],\"VIDEO\":[\"16:9\",\"1:1\",\"4:5\",\"9:16\"]},\"duracaoMaxS\":{\"VIDEO\":600},\"tamanhoMaxMb\":{\"IMAGE\":5,\"CAROUSEL\":100,\"VIDEO\":200},\"legendaMax\":3000}",
        helper: "JSON com formatos (IMAGE, CAROUSEL, VIDEO, REEL), proporcoes por formato (largura:altura), duracaoMaxS e tamanhoMaxMb por formato e legendaMax (caracteres). O conteúdo que passa de um limite é recusado antes de agendar.",
      },
      {
        key: "marketing.social.youtube.capacidades",
        label: "Limites do YouTube",
        type: "text",
        defaultValue: "{\"formatos\":[\"VIDEO\",\"REEL\"],\"proporcoes\":{\"VIDEO\":[\"16:9\"],\"REEL\":[\"9:16\"]},\"duracaoMaxS\":{\"VIDEO\":43200,\"REEL\":60},\"tamanhoMaxMb\":{\"VIDEO\":262144,\"REEL\":262144},\"legendaMax\":5000}",
        helper: "JSON com formatos (IMAGE, CAROUSEL, VIDEO, REEL), proporcoes por formato (largura:altura), duracaoMaxS e tamanhoMaxMb por formato e legendaMax (caracteres). O conteúdo que passa de um limite é recusado antes de agendar.",
      },
      {
        key: "marketing.social.tiktok.capacidades",
        label: "Limites do TikTok",
        type: "text",
        defaultValue: "{\"formatos\":[\"VIDEO\",\"REEL\"],\"proporcoes\":{\"VIDEO\":[\"9:16\",\"1:1\",\"16:9\"],\"REEL\":[\"9:16\"]},\"duracaoMaxS\":{\"VIDEO\":600,\"REEL\":600},\"tamanhoMaxMb\":{\"VIDEO\":500,\"REEL\":500},\"legendaMax\":2200}",
        helper: "JSON com formatos (IMAGE, CAROUSEL, VIDEO, REEL), proporcoes por formato (largura:altura), duracaoMaxS e tamanhoMaxMb por formato e legendaMax (caracteres). O conteúdo que passa de um limite é recusado antes de agendar.",
      },
      {
        key: "marketing.social.tolerancia_proporcao_pct",
        label: "Tolerância da proporção da mídia (%)",
        type: "integer",
        defaultValue: 2,
        helper: "Número inteiro de 0 a 20. Diferença aceita entre a proporção da mídia e a da rede (ex.: 1200x628 vale como 1,91:1).",
      },
    ],
  },
  {
    title: "Redes sociais: marca de idempotência do post",
    subtitle: "As redes não têm chave de idempotência. Para confirmar se um post já saiu (e nunca publicar duas vezes), o texto enviado leva uma marca curta derivada da publicação.",
    fields: [
      {
        key: "marketing.social.marca_idempotencia",
        label: "Tipo de marca",
        type: "text",
        defaultValue: "INVISIVEL",
        helper: "INVISIVEL (código em caracteres que não aparecem na tela) ou HASHTAG (hashtag técnica visível no fim do texto).",
      },
      {
        key: "marketing.social.hashtag_prefixo",
        label: "Prefixo da hashtag técnica",
        type: "text",
        defaultValue: "nyr",
        helper: "De 2 a 12 letras minúsculas ou números. Só vale no tipo HASHTAG.",
      },
    ],
  },
];
