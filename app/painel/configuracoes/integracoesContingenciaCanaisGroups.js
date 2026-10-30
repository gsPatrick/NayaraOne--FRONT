// Contingência por canal (Marco 9, M9-D227): WhatsApp fora (canal alternativo por e-mail e mensagem vencida na fila) e portal fora (tarefa ao marketing). Padrão = Maturacao/demandas/parametros.csv;
// a API valida a faixa. Entra na aba "Registro de integrações", junto da contingência geral (M9-D226).
export const CONTINGENCIA_CANAIS_GROUPS = [
  {
    title: "WhatsApp fora: canal alternativo e mensagem vencida",
    subtitle:
      "Com o WhatsApp fora, a mensagem fica na fila (nunca é dada como entregue). Se a integração tiver um e-mail alternativo e o contato autorizou o e-mail, a mensagem segue por ele com o texto adaptado e a conversa mostra que foi enviada por canal alternativo. Marketing nunca usa o alternativo: espera na fila e é cancelado se passar do prazo.",
    fields: [
      { key: "integration.whatsapp.alternate_requires_opt_in", label: "Exigir o aceite (OPT_IN) do contato no e-mail para usar o canal alternativo", type: "boolean", defaultValue: true, helper: "Ligado (livro): só segue por e-mail quem aceitou receber nesse canal. Desligado: basta não ter pedido para sair. Quem pediu para sair nunca recebe." },
      { key: "integration.whatsapp.alternate_email_subject", label: "Assunto do e-mail do canal alternativo", type: "text", defaultValue: "Uma mensagem para você", helper: "Até 120 caracteres." },
      { key: "integration.whatsapp.alternate_email_intro", label: "Abertura do e-mail do canal alternativo", type: "text", defaultValue: "Não conseguimos falar com você pelo WhatsApp neste momento; por isso enviamos esta mensagem por e-mail.", helper: "Até 400 caracteres. Vem antes do texto original da mensagem." },
      { key: "integration.whatsapp.expired_template_name", label: "Modelo aprovado para a mensagem que venceu a janela de 24 h na fila", type: "text", defaultValue: "", helper: "Nome de um modelo aprovado no fornecedor, com 0 ou 1 variável (o nome do contato). Vazio: a mensagem vencida é cancelada e uma pessoa liga para o cliente." },
    ],
  },
  {
    title: "Portal fora: tarefa ao marketing",
    subtitle:
      "Com o portal fora, o imóvel segue publicado no sistema e o anúncio fica pendente de sincronização, sendo reprocessado a cada intervalo de leitura de status até o portal aceitar. Passado o prazo da fila do modo, uma única tarefa vai ao responsável de marketing.",
    fields: [
      { key: "integration.portal.manual_task_assignee_role", label: "Papel que recebe a tarefa do anúncio pendente no portal", type: "text", defaultValue: "Gerente de Marketing", helper: "Nome do papel. Sem ninguém ativo nele, vale o papel das tarefas manuais da contingência." },
    ],
  },
  {
    title: "Banco fora: conferência no internet banking",
    subtitle:
      "Com o banco fora, nenhum pagamento é dado como pago: a ordem fica aguardando confirmação do banco. Ao voltar, cada ordem é consultada pela chave de idempotência e pelo extrato antes de qualquer reenvio. Passado o prazo de pendência do banco (o campo horas que um pagamento pode ficar pendente, em Contingência: prazo da fila por modo), uma tarefa vai ao financeiro para conferir no internet banking e localizar a evidência.",
    fields: [
      { key: "integration.bank.manual_task_assignee_role", label: "Papel que recebe a tarefa de conferência do pagamento pendente", type: "text", defaultValue: "Financeiro", helper: "Nome do papel. Sem ninguém ativo nele, vale o papel das tarefas manuais da contingência." },
    ],
  },
];
