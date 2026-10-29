// Parâmetros do DLP (proteção contra vazamento) na aba Governança (Marco 9, M9-D820/M9-D821). Padrões do livro e de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_DLP_GROUPS = [
  {
    title: "Proteção contra vazamento (DLP)",
    subtitle:
      "Política por classificação (baixa, média, alta e restrita) para ver, copiar, exportar, imprimir, compartilhar e enviar à IA. Os valores abaixo definem a política INICIAL de cada empresa; depois, cada célula da matriz é ajustada em GET/PUT /dlp/policies (piso do livro: exportar dado alto ou restrito sempre exige justificativa, verificação em duas etapas, auditoria e expiração).",
    fields: [
      {
        key: "governanca.dlp.classificacao_padrao",
        label: "Classificação de quem ainda não foi classificado",
        type: "text",
        defaultValue: "HIGH",
        helper: "LOW, MEDIUM, HIGH ou RESTRICTED. Padrão HIGH (o mais conservador).",
      },
      {
        key: "governanca.dlp.volume_teto_por_classe",
        label: "Teto de linhas por exportação, por classe",
        type: "text",
        defaultValue: "LOW 100000; MEDIUM 50000; HIGH 10000; RESTRICTED 1000",
        helper: "As quatro classes, no formato CLASSE número separados por ponto e vírgula. Vale para empresas que ainda não têm política criada.",
      },
      {
        key: "governanca.dlp.expiracao_horas_da_classe",
        label: "Prazo máximo (horas) de arquivo exportado e link, por classe",
        type: "text",
        defaultValue: "LOW 168; MEDIUM 72; HIGH 48; RESTRICTED 24",
        helper: "As quatro classes, em horas (1 a 8760). É o único parâmetro de prazo do DLP.",
      },
      {
        key: "governanca.dlp.watermark.padrao_por_classe",
        label: "Marca d'água por classe",
        type: "text",
        defaultValue: "LOW desligado; MEDIUM desligado; HIGH desligado; RESTRICTED desligado",
        helper: "Use ligado ou desligado em cada classe. A marca d'água é opcional; quem exporta também pode pedi-la.",
      },
      {
        key: "governanca.dlp.finalidades",
        label: "Finalidades aceitas em exportação, impressão e compartilhamento",
        type: "text",
        defaultValue: "AUDITORIA,OPERACAO,JURIDICO,CONTABIL,CLIENTE_SOLICITOU,OUTRA",
        helper: "Códigos separados por vírgula (letras maiúsculas, números e _).",
      },
      {
        key: "governanca.dlp.justificativa_min",
        label: "Tamanho mínimo da justificativa (caracteres)",
        type: "integer",
        defaultValue: 20,
        min: 1,
        max: 2000,
      },
    ],
  },
];
