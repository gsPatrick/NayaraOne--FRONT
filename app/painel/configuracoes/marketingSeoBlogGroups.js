// Parâmetros do site (SEO) e do blog educativo do Marketing (Marco 9, M9-D427). Padrão de Maturacao/demandas/parametros.csv; a API valida cada valor.
export const MARKETING_SEO_BLOG_GROUPS = [
  {
    title: "Página do imóvel no site (SEO)",
    subtitle: "O que acontece com a página pública de um imóvel vendido, alugado ou retirado do mercado. O endereço de internet de cada imóvel nunca muda: só o texto de apoio pode mudar.",
    fields: [
      {
        key: "marketing.seo.politica_vendido",
        label: "Política da página de imóvel vendido ou alugado",
        type: "text",
        defaultValue: "SELO_E_REDIRECT",
        helper: "SELO_E_REDIRECT: a página fica no ar com o selo Vendido ou Alugado e fora do Google pelos dias abaixo, e depois redireciona para a listagem do bairro. REDIRECT_IMEDIATO: redireciona desde o dia da venda. Nenhum outro valor é aceito.",
      },
      {
        key: "marketing.seo.dias_selo_vendido",
        label: "Dias com o selo Vendido ou Alugado",
        type: "integer",
        min: 0,
        defaultValue: 30,
        helper: "Número inteiro de 0 a 3650. Vale só para SELO_E_REDIRECT.",
      },
      {
        key: "marketing.seo.dias_removido",
        label: "Dias até a página de imóvel retirado do mercado sair do ar",
        type: "integer",
        min: 0,
        defaultValue: 0,
        helper: "Número inteiro de 0 a 3650. Depois do prazo a página responde que não existe mais (nunca redireciona). 0 = no mesmo dia.",
      },
      {
        key: "marketing.seo.url_base",
        label: "Endereço do site (para o link canônico)",
        type: "text",
        defaultValue: "nenhuma",
        helper: "Endereço https do site sem parâmetros (ex.: https://www.suaempresa.com.br) ou nenhuma. Sem ele, os links canônicos saem só com o caminho.",
      },
      {
        key: "marketing.seo.cache_s",
        label: "Tempo de cache da página pública (segundos)",
        type: "integer",
        min: 0,
        defaultValue: 60,
        helper: "Número inteiro de 0 a 86400. Depois desse tempo o navegador e o site conferem se a página mudou (venda, preço, remoção). 0 = sempre conferir.",
      },
    ],
  },
  {
    title: "Blog educativo",
    subtitle: "Todo artigo precisa citar fontes permitidas: parágrafo com número, porcentagem, data, valor em reais ou nome de lei exige uma referência [n] apontando para uma fonte registrada (endereço e data de acesso).",
    fields: [
      {
        key: "marketing.blog.fontes_permitidas",
        label: "Domínios permitidos como fonte",
        type: "text",
        defaultValue: "gov.br, ibge.gov.br, bcb.gov.br, caixa.gov.br, cnj.jus.br",
        helper: "Domínios separados por vírgula; subdomínios valem. A lista não pode ficar vazia.",
      },
      {
        key: "marketing.blog.dominios_empresa",
        label: "Domínios da própria empresa (também valem como fonte)",
        type: "text",
        defaultValue: "nenhum",
        helper: "Domínios separados por vírgula ou nenhum.",
      },
      {
        key: "marketing.blog.min_palavras",
        label: "Mínimo de palavras do artigo",
        type: "integer",
        defaultValue: 400,
        helper: "Número inteiro de 1 a 20000.",
      },
      {
        key: "marketing.blog.aviso_ia",
        label: "Aviso de apoio de inteligência artificial",
        type: "text",
        defaultValue: "Conteúdo gerado com apoio de inteligência artificial",
        helper: "Frase que precisa constar no artigo gerado pela NAY (10 a 200 caracteres).",
      },
    ],
  },
];
