// URL externa do Marketing (Marco 9, M9-D433): vale para link rastreável, template e texto do conteúdo. Padrão de Maturacao/demandas/parametros.csv; a API valida e audita.
export const MARKETING_URL_GROUPS = [
  {
    title: "URL externa: segurança e antifraude",
    subtitle: "Toda URL que o Marketing aceita de fora precisa ser https, sem usuário e senha na URL, sem IP nem endereço interno, sem encurtador público e de um domínio permitido. Os domínios da empresa (endereço do site e domínios próprios do blog) já valem; aqui você soma portais e redes homologados. O sistema também confere o destino (DNS e redirecionamentos) quando alguém digita a URL.",
    fields: [
      {
        key: "marketing.url.dominios_permitidos",
        label: "Domínios extras permitidos (portais e redes homologados)",
        type: "text",
        defaultValue: "nenhum",
        helper: "Domínios separados por vírgula (ex.: portal.com.br, rede.com) ou a palavra nenhum. Subdomínios valem.",
      },
      {
        key: "marketing.url.encurtadores",
        label: "Encurtadores públicos proibidos",
        type: "text",
        defaultValue: "bit.ly, tinyurl.com, t.co, goo.gl, is.gd, ow.ly, buff.ly, rebrand.ly, cutt.ly, shorturl.at, tiny.cc",
        helper: "Domínios separados por vírgula. Pelo menos um.",
      },
      {
        key: "marketing.url.max_saltos",
        label: "Redirecionamentos seguidos e verificados",
        type: "integer",
        defaultValue: 3,
        helper: "Número inteiro de 0 a 10. Cada salto passa de novo pelas mesmas regras; passar do limite recusa a URL.",
      },
      {
        key: "marketing.url.max_comprimento",
        label: "Tamanho máximo da URL (caracteres)",
        type: "integer",
        defaultValue: 2048,
        helper: "Número inteiro de 64 a 8192.",
      },
      {
        key: "marketing.url.verificar_destino",
        label: "Conferir o destino da URL (DNS e redirecionamento)",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado: a URL digitada só vale se o nome resolver para endereço público e os redirecionamentos ficarem dentro dos domínios permitidos. Desligar mantém só as regras da própria URL.",
      },
      {
        key: "marketing.url.timeout_s",
        label: "Espera de cada consulta do destino (segundos)",
        type: "integer",
        defaultValue: 5,
        helper: "Número inteiro de 1 a 60. Destino que não responde nesse tempo é recusado.",
      },
    ],
  },
];
