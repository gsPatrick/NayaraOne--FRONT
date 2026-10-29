// Publicação do site e dos portais (Marco 9, M9-D231). Padrão de Maturacao/demandas/parametros.csv; a API valida. Aba "Registro de integrações".
export const PUBLICACAO_GROUP = {
  title: "Publicação do site e dos portais",
  subtitle:
    "Site e portais recebem uma visão própria e reduzida do imóvel (sem dívida do proprietário, margem, observações nem endereço restrito). Aqui fica a precisão do mapa dos imóveis com endereço aproximado.",
  fields: [
    {
      key: "integration.publication.approx_radius_m",
      label: "Raio do ponto aproximado no mapa (metros)",
      type: "integer",
      defaultValue: 300,
      helper: "De 50 a 300. O ponto publicado é deslocado dentro desse raio e é sempre o mesmo para o mesmo imóvel; o ponto exato nunca sai.",
    },
  ],
};
