// Famílias de integração do bloco B (Marco 9): e-mail de saída (M9-D234), seguradoras (M9-D238) e NFS-e (M9-D241). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
// Entra na aba "Registro de integrações".
const CLASSIFICACAO_ANEXO = [
  { value: "PUBLIC", label: "Pública" },
  { value: "INTERNAL", label: "Interna" },
  { value: "CONFIDENTIAL", label: "Confidencial (limite do livro)" },
];

export const EMAIL_GROUP = {
  title: "E-mail de saída: anexos e destinatários",
  subtitle:
    "Todo e-mail sai por um provedor configurado em Integrações. O sistema só declara a mensagem entregue quando o provedor avisa; devolução, reclamação e falha ficam registradas como o provedor informou. Um documento restrito nunca vai por anexo: use o link seguro.",
  fields: [
    { key: "integration.email.max_attachment_bytes", label: "Tamanho máximo da soma dos anexos de uma mensagem (bytes)", type: "integer", defaultValue: 10485760, helper: "De 1024 a 104857600. O padrão é 10 MiB (10485760). Acima disso o envio é recusado antes de sair." },
    { key: "integration.email.attachment_allowed_types", label: "Tipos de arquivo aceitos como anexo (extensões separadas por vírgula)", type: "text", defaultValue: "pdf,png,jpg,docx,xlsx", helper: "De 1 a 20 extensões. O tipo do conteúdo também é conferido para as extensões conhecidas." },
    { key: "integration.email.max_attachment_classification", label: "Classificação mais alta de documento que pode ir como anexo", type: "enum", defaultValue: "CONFIDENTIAL", options: CLASSIFICACAO_ANEXO, helper: "O limite do livro é Confidencial; você só pode deixá-lo mais restritivo. Documento restrito ou sem classificação nunca vai por anexo." },
    { key: "integration.email.max_recipients", label: "Destinatários por mensagem (para, cópia e cópia oculta)", type: "integer", defaultValue: 50, helper: "De 1 a 500." },
    { key: "integration.email.max_attachments", label: "Anexos por mensagem", type: "integer", defaultValue: 10, helper: "De 1 a 50." },
  ],
};

export const FAMILIAS_GROUPS = [EMAIL_GROUP];
