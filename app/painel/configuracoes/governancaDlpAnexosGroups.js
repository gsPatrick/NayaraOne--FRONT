// Parâmetros do DLP de anexos, downloads e impressão (Marco 9, M9-D920) na aba Governança. Padrões de Maturacao/demandas/parametros.csv; a API valida.
// O prazo máximo por classe e a marca d'água por classe estão no grupo Proteção contra vazamento (DLP); aqui ficam o endereço de uso único, o lote, o rodapé e a classe do anexo novo.
export const GOVERNANCA_DLP_ANEXOS_GROUPS = [
  {
    title: "Download de anexos (DLP)",
    subtitle:
      "Arquivo HIGH ou RESTRICTED baixa por endereço assinado, de uso único; o endereço vale o menor entre este prazo e o teto da classe. O texto da marca d'água é o da exportação (grupo Exportação de arquivos).",
    fields: [
      {
        key: "governanca.dlp.download.url_min",
        label: "Validade do endereço de download (minutos)",
        type: "integer",
        defaultValue: 15,
        min: 1,
        max: 1440,
        helper: "Nunca passa do prazo máximo da classe.",
      },
      {
        key: "governanca.dlp.download.lote_max",
        label: "Máximo de arquivos num download em lote (zip)",
        type: "integer",
        defaultValue: 200,
        min: 1,
        max: 5000,
        helper: "O lote conta como exportação com volume igual ao número de arquivos.",
      },
      {
        key: "governanca.dlp.marca.paginas_max",
        label: "Máximo de páginas de um PDF que recebe marca d'água",
        type: "integer",
        defaultValue: 500,
        min: 1,
        max: 20000,
        helper: "PDF maior que isto, com marca ligada ou pedida, não é entregue.",
      },
      {
        key: "governanca.dlp.anexos.categoria_entidade",
        label: "Tabela de dados que define a classe do anexo novo, por categoria de envio",
        type: "text",
        defaultValue:
          "contracts: legal.contract_versions; contracts-signed: legal.contract_versions; inspections: legal.inspection_items; people-documents: people.person_documents; property-documents: real_estate.property_documents; insurance: procurement.insurance_policies; inventory-invoices: inventory.receipts; correspondent: correspondent.case_documents",
        helper: "Formato \"categoria: schema.tabela\", separado por ponto e vírgula. O anexo nasce com a maior classe das colunas da tabela; categoria fora da lista (anexo avulso) nasce com a classe padrão (HIGH).",
      },
    ],
  },
  {
    title: "Impressão (DLP)",
    subtitle: "Toda impressão passa por um pedido antes do PDF: o endereço vale uma vez só e o rodapé sai em todas as páginas.",
    fields: [
      {
        key: "governanca.dlp.impressao.url_min",
        label: "Validade do endereço do PDF de impressão (minutos)",
        type: "integer",
        defaultValue: 15,
        min: 1,
        max: 1440,
      },
      {
        key: "governanca.dlp.impressao.rodape",
        label: "Rodapé do PDF impresso",
        type: "text",
        defaultValue: "Impresso por {usuario} em {data} · documento {documento}",
        helper: "{usuario}, {data} e {documento} são trocados na geração; {usuario} e {documento} são obrigatórios.",
      },
      {
        key: "governanca.dlp.impressao.fuso",
        label: "Fuso horário da data e hora do rodapé",
        type: "text",
        defaultValue: "America/Sao_Paulo",
        helper: "Nome do fuso, por exemplo America/Sao_Paulo.",
      },
    ],
  },
];
