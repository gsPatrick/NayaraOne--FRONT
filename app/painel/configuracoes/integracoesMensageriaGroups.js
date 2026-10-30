// Mensageria do CRM (Marco 9, M9-D229): telefone no formato internacional e prazo do contato novo. Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa. Entra na aba "Registro de integrações".
export const MENSAGERIA_GROUPS = [
  {
    title: "Mensageria e atendimento (WhatsApp)",
    subtitle:
      "O CRM envia mensagens pelo fornecedor de mensageria ativo, sem saber qual é. A mensagem fica na fila até o fornecedor aceitar; só vira entregue ou lida quando o fornecedor confirma. Quem escreve pela primeira vez vira um contato novo com a primeira ação para responder.",
    fields: [
      { key: "integration.messaging.country_code", label: "Código do país dos telefones das mensagens", type: "text", defaultValue: "55", helper: "Só dígitos (de 1 a 3). O número do destinatário precisa vir completo, com o sinal de + e este código (ex.: +5511999990000). Sem ele, a mensagem é recusada." },
      { key: "integration.messaging.inbound_lead_prazo_horas", label: "Prazo para responder um contato novo que escreveu primeiro (horas)", type: "integer", defaultValue: 24, helper: "De 1 a 720. É o prazo da primeira ação da oportunidade criada quando um número desconhecido envia mensagem." },
    ],
  },
];
