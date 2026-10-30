// Validador factual do conteúdo de Marketing (Marco 9, M9-D407). Padrão de Maturacao/demandas/parametros.csv; a API valida e audita.
export const MARKETING_FACTUAL_GROUPS = [
  {
    title: "Conferência do texto com o cadastro do imóvel",
    subtitle: "Antes de seguir para a marca e a aprovação, o texto é conferido com o cadastro público do imóvel: preço, área, quartos, suítes, banheiros, vagas, endereço e características. O que o texto afirma e o cadastro não tem, ou tem diferente, bloqueia o conteúdo. A conferência não usa inteligência artificial.",
    fields: [
      {
        key: "marketing.factual.tolerancia_area_m2",
        label: "Tolerância da área citada no texto (m²)",
        type: "integer",
        defaultValue: 0,
        helper: "Número inteiro de 0 a 1000. Com 0, a área do texto precisa ser igual à do cadastro.",
      },
      {
        key: "marketing.factual.dicionario_features",
        label: "Sinônimos das características",
        type: "text",
        defaultValue: "piscina: piscinas; churrasqueira: churrasqueiras; varanda: varandas, sacada, sacadas; elevador: elevadores; academia: academias, sala de ginástica; playground: playgrounds, parquinho; salão de festas: salões de festas, salão de festa, espaço de festas; portaria 24h: portaria 24 horas, portaria vinte e quatro horas; ar-condicionado: ar condicionado, ares-condicionados; mobiliado: mobiliada, mobilhado, mobilhada; aceita pets: aceita animais, pet friendly, pet-friendly; vaga coberta: vagas cobertas, garagem coberta",
        helper: "Formato: característica: sinônimo, sinônimo; outra característica: sinônimo. Só vale característica da lista de características publicáveis.",
      },
      {
        key: "marketing.factual.termos_internos",
        label: "Termos que indicam ocorrência ou anotação interna",
        type: "text",
        defaultValue: "ocorrência, reclamação, anotação interna, observação interna, nota interna, caso aberto, não conformidade",
        helper: "Termos separados por vírgula. Texto que cita qualquer um deles não segue: ocorrência e reclamação interna nunca vão a canal público.",
      },
      {
        key: "marketing.factual.telefones_empresa",
        label: "Telefones da empresa que o texto pode citar",
        type: "text",
        defaultValue: "nenhum",
        helper: "Telefones com DDD separados por vírgula, ou a palavra nenhum. Qualquer outro número solto no texto bloqueia o conteúdo.",
      },
    ],
  },
];
