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

export const SEGUROS_GROUP = {
  title: "Seguradoras: vencimento, renovação e fluxo manual",
  subtitle:
    "Cotação, proposta e apólice passam pela seguradora escolhida em Integrações (ou pelo fluxo manual, quando ela não tem API: o trabalho vira tarefa para uma pessoa, com o mesmo resultado e os mesmos avisos). Cada apólice vigente avisa o vencimento nos prazos abaixo e pede a cotação de renovação pela mesma seguradora.",
  fields: [
    { key: "integration.insurance.renewal_alert_days", label: "Avisos de vencimento da apólice (dias antes do fim da vigência, separados por vírgula)", type: "text", defaultValue: "60,30,15,7", helper: "De 1 a 10 prazos, de 1 a 730 dias. Cada prazo gera um aviso por apólice e vigência, sem repetir. O padrão do livro é 60, 30, 15 e 7 dias." },
    { key: "integration.insurance.renewal_quote_enabled", label: "Pedir sozinho a cotação de renovação", type: "boolean", defaultValue: true, helper: "Ligado, quando a apólice chega ao prazo abaixo o sistema pede a nova cotação à mesma seguradora (ou abre a tarefa, no fluxo manual) e avisa a pessoa responsável." },
    { key: "integration.insurance.renewal_quote_days", label: "Dias antes do fim da vigência para pedir a cotação de renovação", type: "integer", defaultValue: 30, helper: "De 1 a 365. Vale a primeira faixa de aviso que chegar a esse prazo." },
    { key: "integration.insurance.manual_task_due_days", label: "Prazo das tarefas do fluxo manual (dias)", type: "integer", defaultValue: 3, helper: "De 1 a 60. Prazo para anexar a cotação, registrar a proposta ou anexar a apólice quando a seguradora não tem API." },
  ],
};

export const FAMILIAS_GROUPS = [EMAIL_GROUP, SEGUROS_GROUP];
