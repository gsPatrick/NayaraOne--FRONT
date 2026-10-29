// Rota pública de webhooks (Marco 9, M9-D211). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa. Entra na aba "Registro de integrações".
// O tamanho máximo do corpo recebido fica no grupo "Caixa de entrada de webhooks".
export const WEBHOOK_GROUPS = [
  {
    title: "Recebimento de webhooks dos fornecedores",
    subtitle:
      "Os fornecedores avisam o sistema (pagamento, mensagem, assinatura) chamando um endereço público do tipo /v1/webhooks/<fornecedor>/<canal>. O canal é um código aleatório criado junto com a integração; a chamada só é aceita se a assinatura do fornecedor conferir com o conteúdo recebido.",
    fields: [
      { key: "integration.webhook.alias_root_enabled", label: "Aceitar também o endereço curto /webhooks/<fornecedor>/<canal> (sem /v1)", type: "boolean", defaultValue: true, helper: "Ligado por padrão. Desligado, só o endereço com /v1 responde; o curto passa a responder como canal desconhecido." },
      { key: "integration.webhook.rate_limit_per_minute", label: "Chamadas de webhook por minuto, por origem e fornecedor", type: "integer", defaultValue: 120, helper: "De 10 a 100000. Acima disso a chamada recebe o aviso de excesso (429) antes de qualquer consulta. Este valor só aperta o teto da plataforma; ele não o aumenta." },
      { key: "integration.webhook.channel_token_length", label: "Tamanho do código do canal gerado para cada integração (caracteres)", type: "integer", defaultValue: 32, helper: "De 24 a 48. Vale para as integrações criadas depois da mudança; os canais já criados continuam como estão." },
    ],
  },
];
