// Parâmetros da continuidade operacional (BCP) na aba Governança (Marco 9, M9-D830). Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_BCP_GROUPS = [
  {
    title: "Continuidade operacional (BCP)",
    subtitle:
      "Qual setor de contingência cada perfil da empresa atende. O perfil ADMIN pertence aos seis setores.",
    fields: [
      {
        key: "governanca.bcp.setor_por_papel",
        label: "Perfis de cada setor (atendimento, locação, financeiro, obras, correspondente e jurídico)",
        type: "text",
        defaultValue:
          '{"ATENDIMENTO":["ATENDIMENTO","ATENDENTE","CORRETOR","RECEPCAO"],"LOCACAO":["LOCACAO","LOCAÇÃO","LOCADOR"],"FINANCEIRO":["FINANCEIRO"],"OBRAS":["OBRAS","ENGENHARIA","MESTRE DE OBRAS"],"CORRESPONDENTE":["CORRESPONDENTE"],"JURIDICO":["JURIDICO","JURÍDICO"]}',
        helper:
          'JSON no formato {"SETOR":["NOME DO PERFIL"]}, com os setores ATENDIMENTO, LOCACAO, FINANCEIRO, OBRAS, CORRESPONDENTE e JURIDICO. Quem tem um perfil listado registra e consulta as operações manuais do setor. Usuário sem setor não usa o BCP.',
      },
    ],
  },
];
