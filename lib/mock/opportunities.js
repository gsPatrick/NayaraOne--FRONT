// Dados 100% mockados — alinhado a crm.opportunities / crm.visits / messages.

export const STAGES = [
  { key: "novo", label: "Novo Lead" },
  { key: "contato", label: "Em Contato" },
  { key: "visita", label: "Visita Agendada" },
  { key: "proposta", label: "Proposta" },
  { key: "ganho", label: "Fechado (Ganho)" },
  { key: "perdido", label: "Fechado (Perdido)" },
];

export const OPPORTUNITIES = [
  {
    id: "opp-1", stage: "novo", personName: "Marina Costa", propertyName: "Studio Moema — Apto 24",
    repName: "Renata Souza", nextAction: "Ligar para qualificar interesse", nextActionDueAt: "2026-08-21T14:00:00Z",
    createdAt: "2026-08-18T09:00:00Z",
    visits: [],
    messages: [{ id: "m1", from: "Renata Souza", text: "Lead recebido via site institucional.", sentAt: "2026-08-18T09:05:00Z" }],
  },
  {
    id: "opp-2", stage: "novo", personName: "Diego Martins", propertyName: "Sala Comercial Centro — 12B",
    repName: "João Pereira", nextAction: "Enviar catálogo de salas comerciais", nextActionDueAt: "2026-08-19T18:00:00Z",
    createdAt: "2026-08-17T11:20:00Z",
    visits: [],
    messages: [{ id: "m2", from: "Diego Martins", text: "Tenho interesse em salas no Centro, até 50m².", sentAt: "2026-08-17T11:22:00Z" }],
  },
  {
    id: "opp-3", stage: "contato", personName: "Camila Rezende", propertyName: "Edifício Aurora — Apto 302",
    repName: "Renata Souza", nextAction: "Confirmar renda para análise de fiança", nextActionDueAt: "2026-08-22T10:00:00Z",
    createdAt: "2026-08-10T08:30:00Z",
    visits: [{ id: "v1", propertyName: "Edifício Aurora — Apto 302", scheduledAt: "2026-08-15T15:00:00Z", status: "Realizada" }],
    messages: [
      { id: "m3", from: "Camila Rezende", text: "Gostei muito do apartamento, quero avançar.", sentAt: "2026-08-15T16:10:00Z" },
      { id: "m4", from: "Renata Souza", text: "Ótimo! Vou preparar a documentação para análise.", sentAt: "2026-08-15T16:30:00Z" },
    ],
  },
  {
    id: "opp-4", stage: "contato", personName: "Paulo Bittencourt", propertyName: "Cobertura Vista Verde — Apto 1801",
    repName: "João Pereira", nextAction: "Agendar visita presencial", nextActionDueAt: "2026-08-16T09:00:00Z",
    createdAt: "2026-08-05T13:00:00Z",
    visits: [],
    messages: [{ id: "m5", from: "Paulo Bittencourt", text: "Podemos ver a cobertura neste fim de semana?", sentAt: "2026-08-14T10:00:00Z" }],
  },
  {
    id: "opp-5", stage: "visita", personName: "Grupo Habitar Empreendimentos S.A.", propertyName: "Terreno Loteamento Vista Verde",
    repName: "Renata Souza", nextAction: "Acompanhar visita técnica com engenheiro", nextActionDueAt: "2026-08-23T13:30:00Z",
    createdAt: "2026-07-28T09:00:00Z",
    visits: [{ id: "v2", propertyName: "Terreno Loteamento Vista Verde", scheduledAt: "2026-08-23T13:30:00Z", status: "Agendada" }],
    messages: [{ id: "m6", from: "João Pereira", text: "Visita técnica confirmada com o engenheiro do grupo.", sentAt: "2026-08-13T09:00:00Z" }],
  },
  {
    id: "opp-6", stage: "visita", personName: "João Pereira", propertyName: "Galpão Industrial Zona Sul",
    repName: "João Pereira", nextAction: "Reagendar visita — cliente remarcou", nextActionDueAt: "2026-08-17T11:00:00Z",
    createdAt: "2026-07-30T09:00:00Z",
    visits: [
      { id: "v3", propertyName: "Galpão Industrial Zona Sul", scheduledAt: "2026-08-10T10:00:00Z", status: "Cancelada" },
      { id: "v4", propertyName: "Galpão Industrial Zona Sul", scheduledAt: "2026-08-24T10:00:00Z", status: "Agendada" },
    ],
    messages: [{ id: "m7", from: "Sistema", text: "Visita de 10/08 cancelada pelo cliente.", sentAt: "2026-08-09T18:00:00Z" }],
  },
  {
    id: "opp-7", stage: "proposta", personName: "Fernando Lima", propertyName: "Loja Shopping Vale — L34",
    repName: "Renata Souza", nextAction: "Aguardar retorno da contraproposta", nextActionDueAt: "2026-08-20T17:00:00Z",
    createdAt: "2026-07-20T09:00:00Z",
    visits: [{ id: "v5", propertyName: "Loja Shopping Vale — L34", scheduledAt: "2026-07-25T14:00:00Z", status: "Realizada" }],
    messages: [
      { id: "m8", from: "Fernando Lima", text: "Enviei a proposta de R$ 9.200/mês.", sentAt: "2026-08-12T09:00:00Z" },
      { id: "m9", from: "Renata Souza", text: "Vou levar para aprovação do proprietário.", sentAt: "2026-08-12T09:30:00Z" },
    ],
  },
  {
    id: "opp-8", stage: "proposta", personName: "Beatriz Nunes", propertyName: "Apartamento Boa Vista — Apto 501",
    repName: "João Pereira", nextAction: "Enviar minuta de contrato para revisão", nextActionDueAt: "2026-08-14T12:00:00Z",
    createdAt: "2026-07-15T09:00:00Z",
    visits: [{ id: "v6", propertyName: "Apartamento Boa Vista — Apto 501", scheduledAt: "2026-07-18T10:00:00Z", status: "Realizada" }],
    messages: [{ id: "m10", from: "Beatriz Nunes", text: "Podem enviar a minuta assim que possível?", sentAt: "2026-08-11T14:00:00Z" }],
  },
  {
    id: "opp-9", stage: "ganho", personName: "Ricardo Alves", propertyName: "Casa Jardim das Palmeiras",
    repName: "Renata Souza", createdAt: "2026-06-01T09:00:00Z",
    visits: [{ id: "v7", propertyName: "Casa Jardim das Palmeiras", scheduledAt: "2026-06-10T10:00:00Z", status: "Realizada" }],
    messages: [{ id: "m11", from: "Sistema", text: "Venda concluída — contrato assinado em 18/01/2026.", sentAt: "2026-01-18T17:00:00Z" }],
  },
  {
    id: "opp-10", stage: "ganho", personName: "Marina Costa", propertyName: "Edifício Aurora — Apto 1104",
    repName: "João Pereira", createdAt: "2026-04-02T09:00:00Z",
    visits: [{ id: "v8", propertyName: "Edifício Aurora — Apto 1104", scheduledAt: "2026-04-10T10:00:00Z", status: "Realizada" }],
    messages: [{ id: "m12", from: "Sistema", text: "Oferta de venda aceita e contrato gerado.", sentAt: "2026-04-22T10:00:00Z" }],
  },
  {
    id: "opp-11", stage: "perdido", personName: "Camila Rezende", propertyName: "Galpão Industrial Zona Sul",
    repName: "João Pereira", createdAt: "2026-03-01T09:00:00Z",
    visits: [{ id: "v9", propertyName: "Galpão Industrial Zona Sul", scheduledAt: "2026-03-05T10:00:00Z", status: "Realizada" }],
    messages: [{ id: "m13", from: "Sistema", text: "Cliente optou por outro imóvel — oportunidade encerrada.", sentAt: "2026-03-20T10:00:00Z" }],
  },
  {
    id: "opp-12", stage: "perdido", personName: "Diego Martins", propertyName: "Cobertura Vista Verde — Apto 1801",
    repName: "Renata Souza", createdAt: "2026-02-10T09:00:00Z",
    visits: [],
    messages: [{ id: "m14", from: "Sistema", text: "Orçamento do cliente incompatível com o valor do imóvel.", sentAt: "2026-02-25T10:00:00Z" }],
  },
  {
    id: "opp-13", stage: "contato", personName: "Paulo Bittencourt", propertyName: "Studio Moema — Apto 24",
    repName: "João Pereira", nextAction: "Enviar simulação de financiamento", nextActionDueAt: "2026-08-25T09:00:00Z",
    createdAt: "2026-08-16T09:00:00Z",
    visits: [],
    messages: [{ id: "m15", from: "Paulo Bittencourt", text: "Consigo financiar 80% do valor?", sentAt: "2026-08-16T10:00:00Z" }],
  },
];
