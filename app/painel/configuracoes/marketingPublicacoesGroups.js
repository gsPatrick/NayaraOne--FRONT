// Parâmetros da listagem de publicações do Marketing (Marco 9, M9-D410). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const MARKETING_PUBLICACOES_GROUPS = [
  {
    title: "Lista de publicações",
    subtitle: "Cada conteúdo agendado vira uma publicação por canal. Esta lista mostra o status de cada canal, ordenada pelo horário agendado.",
    fields: [
      {
        key: "marketing.publicacoes.pagina_padrao",
        label: "Publicações por página (padrão)",
        type: "integer",
        defaultValue: 50,
        helper: "Número inteiro de 1 a 1000. Usado quando o pedido não informa o tamanho da página.",
      },
      {
        key: "marketing.publicacoes.pagina_maxima",
        label: "Publicações por página (máximo)",
        type: "integer",
        defaultValue: 200,
        helper: "Número inteiro de 1 a 1000. Pedidos com página maior são limitados a este valor.",
      },
    ],
  },
];
