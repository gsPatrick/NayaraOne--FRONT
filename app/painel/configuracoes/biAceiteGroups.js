// Ambiente do BI e aceite dos indicadores (Marco 9, M9-D708). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida e audita.
export const BI_ACEITE_GROUPS = [
  {
    title: "Ambiente do BI e aceite dos indicadores",
    subtitle: "O BI nasce em LAB (laboratório). Para usar em produção, cada indicador publicado precisa ter sido conferido contra o relatório de origem e aceito pelo responsável por ele.",
    fields: [
      {
        key: "analytics.ambiente",
        label: "Ambiente do BI",
        type: "text",
        defaultValue: "LAB",
        helper: "LAB ou PRODUCAO. Só vai para PRODUCAO se todos os indicadores publicados tiverem o aceite do responsável na versão atual; senão a gravação é recusada e a mensagem lista o que falta. Voltar para LAB é sempre permitido.",
      },
      {
        key: "analytics.aceite.tolerancia",
        label: "Diferença tolerada no aceite",
        type: "text",
        defaultValue: "dinheiro=0,00; contagem=0; demais=0",
        helper: "Quanto o valor do BI pode diferir do relatório de origem para o responsável poder aceitar o indicador. Formato: dinheiro=0,00; contagem=0; demais=0 (demais vale para percentuais, horas e notas). Padrão: zero em tudo. Entrada inválida volta ao padrão.",
      },
    ],
  },
];
