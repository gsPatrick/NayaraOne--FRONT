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
  {
    title: "Proteção contra vazamento — acesso em massa (anomalia)",
    subtitle:
      "Detecta leitura e exportação em massa por usuário e reage pelo controle de acesso, sem derrubar a sessão: pede verificação em duas etapas de novo e suspende exportar, compartilhar e imprimir até a revisão em GET/POST /dlp/anomalies.",
    fields: [
      {
        key: "governanca.dlp.anomalia.limiares",
        label: "Limiares de acesso em massa (itens/minutos)",
        type: "text",
        defaultValue: "HIGH 200/10; RESTRICTED 20/10; EXPORT 3/30",
        helper: "Leitura de dado alto (HIGH) ou restrito (RESTRICTED): dispara quando PASSA de N itens na janela de minutos. EXPORT: dispara ao ATINGIR N pedidos de exportação, compartilhamento ou impressão (aprovados ou bloqueados) na janela. Formato: CLASSE N/minutos separados por ponto e vírgula.",
      },
      {
        key: "governanca.dlp.anomalia.mfa_horas",
        label: "Verificação em duas etapas nova, por quantas horas",
        type: "integer",
        defaultValue: 24,
        min: 1,
        max: 8760,
        helper: "Enquanto durar, a verificação feita antes da detecção não vale e a próxima ação sensível pede um código novo.",
      },
      {
        key: "governanca.dlp.anomalia.suspensao_horas",
        label: "Suspensão de exportar, compartilhar e imprimir (horas)",
        type: "integer",
        defaultValue: 24,
        min: 1,
        max: 8760,
        helper: "A partir da detecção, até a revisão. Ver, copiar e entrar no sistema continuam liberados.",
      },
      {
        key: "governanca.dlp.anomalia.confirmada_horas",
        label: "Suspensão depois de a anomalia ser confirmada (horas)",
        type: "integer",
        defaultValue: 168,
        min: 1,
        max: 8760,
        helper: "Conta a partir da decisão de quem revisou; ao vencer, a suspensão cai sozinha.",
      },
    ],
  },
  {
    title: "Proteção contra vazamento — ver e copiar na tela",
    subtitle:
      "Quais campos são altos (HIGH) ou restritos (RESTRICTED) por tipo de recurso. Campo restrito sai mascarado para quem não tem a permissão dedicada e não pode ser copiado; campo alto pode ser copiado, com registro.",
    fields: [
      {
        key: "governanca.dlp.view.campos",
        label: "Campos sensíveis por tipo de recurso",
        type: "text",
        defaultValue:
          "people.person: taxIdNormalized RESTRICTED, extractedDataJson RESTRICTED, birthOrFoundationDate HIGH, valueNormalized HIGH, zipCode HIGH, street HIGH; properties.property: registryNumber HIGH, registryOffice HIGH; finance.bank_account: accountNumber RESTRICTED, pixKey RESTRICTED, agency HIGH; legal.contract: totalValue HIGH; files.file: storageKey HIGH",
        helper: "Formato: tipo: campo CLASSE, campo CLASSE; outro.tipo: campo CLASSE. Classes: LOW, MEDIUM, HIGH ou RESTRICTED.",
      },
      {
        key: "governanca.dlp.view.mascara_ultimos",
        label: "Caracteres finais que o valor mascarado ainda mostra",
        type: "integer",
        defaultValue: 4,
        min: 0,
        max: 8,
        helper: "0 mascara o valor por inteiro. Valores curtos sempre saem totalmente mascarados.",
      },
      {
        key: "governanca.dlp.view.auditoria_janela_min",
        label: "Auditoria de visualização: uma linha por recurso a cada (minutos)",
        type: "integer",
        defaultValue: 1,
        min: 1,
        max: 1440,
      },
    ],
  },
];
