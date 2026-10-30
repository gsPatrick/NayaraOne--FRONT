// Vídeo e mídia do Marketing (Marco 9, M9-D426). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita cada alteração.
export const MARKETING_VIDEO_GROUPS = [
  {
    title: "Vídeo e mídia",
    subtitle: "Só mídia autorizada para marketing entra no vídeo, e o arquivo original nunca é alterado: a montagem gera um arquivo novo. Quando o vídeo tem elemento gerado por inteligência artificial (voz, avatar, cena, renderização ou ilustração de projeto), o texto recebe o aviso de transparência.",
    fields: [
      {
        key: "marketing.video.politica_transparencia",
        label: "Quando o aviso de conteúdo sintético é exigido",
        type: "text",
        defaultValue: "SEMPRE",
        helper: "SEMPRE (aviso em todo vídeo com elemento sintético) ou POR_TIPO (só nos tipos da lista abaixo).",
      },
      {
        key: "marketing.video.tipos_com_aviso",
        label: "Tipos de elemento sintético que pedem aviso (política POR_TIPO)",
        type: "text",
        defaultValue: "VOICE,AVATAR,SCENE,RENDER,ILLUSTRATION",
        helper: "Lista separada por vírgula: VOICE (voz), AVATAR, SCENE (cena), RENDER (renderização de projeto) e ILLUSTRATION (ilustração).",
      },
      {
        key: "marketing.video.aviso_ia",
        label: "Aviso de conteúdo gerado com inteligência artificial",
        type: "text",
        defaultValue: "Conteúdo gerado com apoio de inteligência artificial",
        helper: "Texto de 3 a 200 caracteres, acrescentado à legenda do vídeo com voz, avatar ou cena sintética.",
      },
      {
        key: "marketing.video.aviso_projeto",
        label: "Aviso de imagens de projeto",
        type: "text",
        defaultValue: "Imagens ilustrativas de projeto",
        helper: "Texto de 3 a 200 caracteres, acrescentado à legenda do vídeo com renderização ou ilustração de projeto.",
      },
      {
        key: "marketing.video.texto_ilustrativa",
        label: "Expressão exigida na renderização de projeto de obra",
        type: "text",
        defaultValue: "Imagem ilustrativa",
        helper: "Texto de 3 a 200 caracteres. A renderização de projeto sem esta expressão na legenda do vídeo é recusada.",
      },
      {
        key: "marketing.video.origens_midia",
        label: "Origens aceitas ao autorizar uma mídia",
        type: "text",
        defaultValue: "EQUIPE,OBRA,CORRETOR,BANCO_LICENCIADO,RENDER_PROJETO",
        helper: "Códigos em maiúsculas separados por vírgula. RENDER_PROJETO marca a mídia como renderização de projeto.",
      },
      {
        key: "marketing.video.max_midias",
        label: "Máximo de mídias em uma montagem",
        type: "integer",
        defaultValue: 30,
        helper: "Número inteiro de 1 a 200.",
      },
    ],
  },
];
