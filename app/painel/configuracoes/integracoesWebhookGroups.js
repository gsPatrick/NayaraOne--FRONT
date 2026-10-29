// Rota pública de webhooks (Marco 9, M9-D211), borda de segurança e worker (M9-D212 e M9-D213) e evidência da assinatura digital (M9-D236). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa. Entra na aba "Registro de integrações".
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
  {
    title: "Segurança da borda e processamento dos webhooks",
    subtitle:
      "O sistema só grava o evento e responde; um processamento separado o converte em evento interno. Eventos repetidos, antigos demais, grandes demais ou fora do formato são barrados ou mandados para a fila de erros, sem guardar dado pessoal.",
    fields: [
      { key: "integration.webhook.response_timeout_ms", label: "Tempo máximo para gravar e responder ao fornecedor (milissegundos)", type: "integer", defaultValue: 2000, helper: "De 100 a 60000. Passou disso, o fornecedor recebe aviso de indisponibilidade (503) e reenvia o evento." },
      { key: "integration.webhook.worker_interval_s", label: "Intervalo do processamento dos eventos recebidos (segundos)", type: "integer", defaultValue: 5, helper: "De 1 a 3600." },
      { key: "integration.webhook.worker_batch_size", label: "Eventos processados por rodada", type: "integer", defaultValue: 50, helper: "De 1 a 500." },
      { key: "integration.webhook.timestamp_tolerance_s", label: "Diferença máxima entre o horário assinado do evento e o do servidor (segundos)", type: "integer", defaultValue: 300, helper: "De 1 a 86400. Evento mais antigo (ou mais adiantado) que isso é recusado como repetição (401). Vale só para o fornecedor que assina o horário." },
      { key: "integration.webhook.replay_window_s", label: "Tempo que o identificador de um evento fica guardado para recusar reenvio (segundos)", type: "integer", defaultValue: 86400, helper: "De 60 a 2592000. O registro do evento é mantido pelo menos por este tempo, mesmo que o prazo de retenção da caixa de entrada seja menor." },
      { key: "integration.webhook.max_json_depth", label: "Profundidade máxima do conteúdo do evento (níveis)", type: "integer", defaultValue: 20, helper: "De 1 a 200. Acima disso o evento vai para a fila de erros." },
      { key: "integration.webhook.max_keys", label: "Quantidade máxima de campos do evento", type: "integer", defaultValue: 5000, helper: "De 1 a 100000. Acima disso o evento vai para a fila de erros." },
      { key: "integration.webhook.max_string_length", label: "Tamanho máximo de um texto dentro do evento (caracteres)", type: "integer", defaultValue: 100000, helper: "De 100 a 10000000. Acima disso o evento vai para a fila de erros." },
      { key: "integration.webhook.accepted_content_types", label: "Tipos de conteúdo aceitos nos webhooks", type: "text", defaultValue: "application/json,text/plain", helper: "Tipos separados por vírgula. O formato de formulário só vale para o fornecedor que o declara. Outro tipo recebe a recusa 415." },
    ],
  },
  {
    title: "Assinatura digital do Jurídico",
    subtitle:
      "O contrato só passa a Assinado quando todas as partes obrigatórias assinaram, o fornecedor confirmou o conteúdo original enviado e a evidência de cada assinatura está completa (horário do fornecedor, método de autenticação e hash do documento).",
    fields: [
      { key: "legal.assinatura.exigir_evidencia_completa", label: "Exigir evidência completa de todas as assinaturas para o contrato ficar Assinado", type: "boolean", defaultValue: true, helper: "Ligado por padrão (regra do livro). Desligar só em laboratório: o contrato passa a Assinado sem a evidência do fornecedor." },
      { key: "legal.assinatura.exigir_ip_user_agent", label: "Exigir também o IP e o navegador do signatário na evidência", type: "boolean", defaultValue: false, helper: "Desligado por padrão: o livro pede IP e navegador apenas quando o fornecedor os informa. Ligado, assinatura sem eles não conta como completa." },
    ],
  },
];
