// Classes de conteúdo da NAY que saem sem aprovação humana (Marco 9, M9-D408, MKT-P029). Padrão de Maturacao/demandas/parametros.csv (lista vazia: nada sai sozinho);
// a API valida (422 "Valor inválido para o parâmetro.") e audita cada alteração. Alterar exige a permissão de gerir automações de Marketing, não a de aprovar conteúdo.
export const MARKETING_AUTOPUBLICACAO_GROUPS = [
  {
    title: "Publicação automática da NAY",
    subtitle: "Por padrão, tudo que a NAY escreve espera a aprovação de uma pessoa. Aqui você autoriza, classe por classe, que um tipo de conteúdo de baixo risco em um canal saia sozinho, depois de passar na conferência dos fatos, na limpeza de dados pessoais e no kill switch. Conteúdo escrito por pessoa nunca sai sozinho.",
    fields: [
      {
        key: "marketing.autopublish.classes",
        label: "Classes autorizadas a publicar sozinhas",
        type: "text",
        defaultValue: "[]",
        helper: 'Lista JSON, ex.: [{"tipo":"SOLD_RENTED","canal":"SITE","quando":0,"canais_agendamento":["SITE"]}]. "quando" são minutos de espera além da antecedência mínima do agendamento. Canais aceitos: SITE, PORTAL e redes sociais. Vazio: nenhuma classe.',
      },
    ],
  },
];
