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

export const EMAIL_INBOUND_GROUP = {
  title: "E-mail recebido: anexos, dado pessoal e vínculo",
  subtitle:
    "Todo e-mail recebido passa pela quarentena e pelo antivírus antes de virar arquivo, e CPF, CNPJ, cartão e conta são mascarados antes de gravar. O e-mail nunca é a única fonte de um documento: o que vale é o arquivo promovido.",
  fields: [
    { key: "integration.email.inbound_max_attachments", label: "Anexos aceitos por mensagem recebida", type: "integer", defaultValue: 20, helper: "De 1 a 100. O que passar disso fica registrado como anexo bloqueado, sem guardar o conteúdo." },
    { key: "integration.email.inbound_reference_prefixes", label: "Prefixos da referência no assunto (ex.: [PROC-1234])", type: "text", defaultValue: "PROC", helper: "De 1 a 10 prefixos de 2 a 12 letras ou números, separados por vírgula. Sem referência reconhecida nem resposta a um e-mail enviado, a mensagem fica não vinculada." },
    { key: "integration.email.inbound_verify_immediately", label: "Verificar os anexos na chegada da mensagem", type: "boolean", defaultValue: true, helper: "Ligado por padrão. Desligado, os anexos esperam em quarentena pela rodada de verificação." },
    { key: "integration.email.inbound_body_max_chars", label: "Tamanho máximo do corpo guardado (caracteres)", type: "integer", defaultValue: 20000, helper: "De 100 a 200000. O corpo é guardado já mascarado; o excedente é cortado." },
    { key: "integration.email.inbound_poll_interval_min", label: "Intervalo da leitura periódica do e-mail recebido (minutos)", type: "integer", defaultValue: 5, helper: "De 1 a 1440. Vale só para conexões de e-mail configuradas com leitura periódica; quem recebe por aviso do provedor (webhook) não depende disso." },
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

export const NFSE_GROUP = {
  title: "NFS-e: RPS e emissor",
  subtitle:
    "Cada nota nasce com um RPS (série e número) único e crescente, que é também a chave que impede a nota de sair duas vezes: se a resposta do emissor se perde, o sistema consulta o RPS antes de emitir de novo. A nota recusada pela prefeitura nunca é editada: a correção sai com outro RPS. O cancelamento exige motivo e a confirmação do emissor.",
  fields: [
    { key: "correspondent.nfse.rps_series", label: "Série do RPS da empresa", type: "text", defaultValue: "A", helper: "De 1 a 8 letras ou números, a série cadastrada na prefeitura. O número do RPS é contado dentro da série; mudar a série recomeça a contagem em 1 sem repetir nenhuma nota já emitida." },
  ],
};

import { INFRA_GROUPS } from "./integracoesInfraGroups";

export const FAMILIAS_GROUPS = [EMAIL_GROUP, EMAIL_INBOUND_GROUP, SEGUROS_GROUP, NFSE_GROUP, ...INFRA_GROUPS];
