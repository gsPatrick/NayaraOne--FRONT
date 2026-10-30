// Envio a fornecedores (Marco 9, bloco B: M9-D214, M9-D215, M9-D216, M9-D218 e M9-D239). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
// Entra na aba "Registro de integrações".
export const ENVIO_GROUPS = [
  {
    title: "Envio a fornecedores: rodada do worker",
    subtitle:
      "Todo pedido a um fornecedor é gravado antes de sair e um worker faz a chamada. Aqui ficam o ritmo do worker e a espera quando a integração está parada.",
    fields: [
      { key: "integration.dispatch.worker_interval_s", label: "Intervalo entre as rodadas do worker (segundos)", type: "integer", defaultValue: 2, helper: "De 1 a 3600. Quanto menor, mais rápido o envio sai; o padrão do livro é 2." },
      { key: "integration.dispatch.worker_batch_size", label: "Envios por rodada", type: "integer", defaultValue: 20, helper: "De 1 a 500. Quantos envios vencidos o worker pega de cada vez." },
      { key: "integration.dispatch.blocked_recheck_s", label: "Espera quando a integração está pausada, desativada ou com credencial recusada (segundos)", type: "integer", defaultValue: 60, helper: "De 5 a 86400. O envio espera sem gastar tentativa e volta a ser conferido depois desse tempo." },
    ],
  },
  {
    title: "Nova tentativa de envio por tipo de erro",
    subtitle:
      "Erro transitório espera cada vez mais entre as tentativas (com uma variação para não bater todo mundo no mesmo instante). Erro de dado e de credencial nunca entram em repetição. Cada integração pode ter valores próprios na política dela.",
    fields: [
      { key: "integration.retry.base_delay_ms", label: "Espera antes da 1ª nova tentativa (milissegundos)", type: "integer", defaultValue: 5000, helper: "De 100 a 3600000. Cada nova espera multiplica a anterior pelo fator, até o teto." },
      { key: "integration.retry.factor", label: "Fator de crescimento da espera", type: "integer", defaultValue: 2, helper: "De 1 a 10. Com 2 as esperas são 5, 10, 20, 40 segundos e assim por diante." },
      { key: "integration.retry.cap_delay_ms", label: "Teto da espera entre tentativas (milissegundos)", type: "integer", defaultValue: 1800000, helper: "De 1000 a 86400000 (24 horas). Padrão do livro: 30 minutos." },
      { key: "integration.retry.jitter_pct", label: "Variação aleatória da espera (%)", type: "integer", defaultValue: 25, helper: "De 0 a 50. A espera varia para mais ou para menos até esse percentual." },
      { key: "integration.retry.rate_limit_max_wait_s", label: "Espera máxima atendida quando o fornecedor pede calma (segundos)", type: "integer", defaultValue: 3600, helper: "De 1 a 86400. Se o fornecedor pedir mais que isso, o envio espera este tempo e a integração ganha um alerta." },
      { key: "integration.retry.rate_limit_max_deferrals", label: "Adiamentos seguidos por limite do fornecedor antes de contar como falha", type: "integer", defaultValue: 100, helper: "De 1 a 10000. Evita que um fornecedor que sempre pede calma segure o envio para sempre." },
    ],
  },
  {
    title: "Limite e cota dos fornecedores",
    subtitle:
      "O sistema reduz o ritmo antes de chegar no limite do fornecedor. Perto do fim da cota, só o que é essencial (como a confirmação de um pagamento) e as operações perigosas saem; mensagens em massa esperam a renovação. O limite de chamadas por segundo, minuto e dia de cada integração fica na política dela.",
    fields: [
      { key: "integration.rate_limit.reserve_pct", label: "Reserva da cota para operações essenciais (%)", type: "integer", defaultValue: 20, helper: "De 0 a 100. Quando o que resta da cota do fornecedor fica abaixo deste percentual do limite, um alerta é aberto e só operações essenciais ou perigosas continuam saindo." },
      { key: "integration.rate_limit.fallback_wait_s", label: "Espera quando a cota acaba sem data de renovação (segundos)", type: "integer", defaultValue: 300, helper: "De 1 a 86400. Usado quando o fornecedor não informa quando a cota volta." },
    ],
  },
  {
    title: "Envio sem resposta (timeout): conferir com o fornecedor antes de repetir",
    subtitle:
      "Quando um pedido perigoso (como um pagamento) fica sem resposta, o sistema não sabe se o fornecedor executou. Ele marca o envio como incerto, pergunta ao fornecedor o que aconteceu e só repete se o fornecedor garantir que não existe registro. Esgotadas as consultas, o envio vai para a fila morta e uma pessoa confere no extrato.",
    fields: [
      { key: "integration.unknown.max_reconcile_attempts", label: "Consultas ao fornecedor antes de pedir revisão humana", type: "integer", defaultValue: 5, helper: "De 1 a 20. Cada consulta que não deu resposta conclusiva conta; ao esgotar, o envio vai para a fila morta com um incidente crítico." },
      { key: "integration.unknown.reconcile_intervals_s", label: "Espera antes de cada consulta (segundos)", type: "text", defaultValue: "30,120,600,3600,21600", helper: "Segundos inteiros separados por vírgula, de 1 a 20 valores. A primeira espera conta a partir do envio incerto; se houver mais consultas que esperas, a última se repete. Padrão do livro: 30 s, 2 min, 10 min, 1 h e 6 h." },
      { key: "integration.unknown.reconcile_job_interval_s", label: "Intervalo entre as rodadas de conferência (segundos)", type: "integer", defaultValue: 10, helper: "De 1 a 3600. De quanto em quanto tempo o sistema procura envios incertos com a consulta vencida." },
      { key: "integration.dispatch.orphan_interval_s", label: "Intervalo da busca por envios presos em andamento (segundos)", type: "integer", defaultValue: 60, helper: "De 5 a 3600. Procura envios que ficaram em andamento depois de uma queda do sistema; o tempo para considerar um envio preso é o parâmetro de envios em andamento sem resposta." },
    ],
  },
  {
    title: "Redes sociais: publicação sem duplicar",
    subtitle:
      "Só sai nas redes o conteúdo aprovado, e cada rede é uma conexão com a própria credencial: se uma rede falha, as outras seguem. Uma nova tentativa nunca cria o mesmo post duas vezes. O conteúdo escrito pela NAY nasce como rascunho e só sai com aprovação de uma pessoa.",
    fields: [
      { key: "integration.social.auto_publish_enabled", label: "Permitir publicação automática nas redes", type: "boolean", defaultValue: false, helper: "Desligado por padrão: sem uma pessoa mandando publicar, nada sai. Ligado, o conteúdo ainda precisa de aprovação específica ou de uma regra pré-aprovada, e o kill switch do Marketing sempre vale." },
      { key: "integration.social.post_dedup_window_days", label: "Dias para trás ao procurar um post igual depois de um timeout", type: "integer", defaultValue: 7, helper: "De 1 a 90. Se a rede não respondeu ao pedido, o sistema olha os posts recentes da conta dessa janela antes de decidir se publica de novo." },
    ],
  },
  {
    title: "Pagamento bancário: extrato e conciliação",
    subtitle:
      "A resposta do banco à ordem de pagamento só diz que ele recebeu: o pagamento só vale como pago quando o banco informa o status final e o valor confere. O extrato do banco é lido por páginas e cada lançamento entra uma única vez; a saída do extrato que confere com o pagamento o marca como conciliado.",
    fields: [
      { key: "integration.bank.statement_page_size", label: "Lançamentos do extrato lidos por página", type: "integer", defaultValue: 100, helper: "De 10 a 500. A leitura segue por páginas, retomando do ponto em que parou." },
      { key: "integration.bank.reconcile_date_tolerance_days", label: "Tolerância de data na conciliação (dias)", type: "integer", defaultValue: 3, helper: "De 0 a 30. Ao casar a saída do extrato com o pagamento por valor e favorecido, a data do lançamento pode diferir da data do envio em até esse número de dias." },
      { key: "integration.bank.reconcile_min_age_min", label: "Idade mínima para consultar o banco sobre um pagamento (minutos)", type: "integer", defaultValue: 2, helper: "De 0 a 1440. Um pagamento enviado ou incerto só é consultado depois desse tempo." },
      { key: "integration.bank.confirm_without_amount", label: "Confirmar pagamento quando o status final do banco não traz o valor", type: "boolean", defaultValue: true, helper: "Ligado: o status final sem valor confirma (como sempre foi). Desligado: sem o valor para conferir, o pagamento não é confirmado e abre revisão humana." },
    ],
  },
  {
    title: "Portais imobiliários: anúncios e status",
    subtitle:
      "Cada portal é uma conexão com o próprio formato de anúncio: o sistema converte o imóvel para o formato do portal, guarda o código do anúncio e confere o status dele no portal de tempos em tempos. O que o portal reprovar aparece no vínculo do imóvel com aquele portal.",
    fields: [
      { key: "integration.portal.reconcile_interval_min", label: "Intervalo da leitura de status dos anúncios nos portais (minutos)", type: "integer", defaultValue: 15, helper: "De 1 a 1440. De quanto em quanto tempo o sistema pergunta a cada portal o status dos anúncios." },
      { key: "integration.portal.sync_page_size", label: "Anúncios lidos por página a cada rodada", type: "integer", defaultValue: 50, helper: "De 5 a 500. A leitura segue por páginas, retomando do ponto em que parou se for interrompida." },
      { key: "integration.portal.unpublish_confirm_deadline_min", label: "Prazo para o portal confirmar a remoção de um anúncio (minutos)", type: "integer", defaultValue: 60, helper: "De 1 a 10080. A remoção só termina quando o portal confirma; passado esse prazo o sistema consulta o portal e, se o anúncio segue no ar, pede a remoção de novo." },
      { key: "integration.portal.unpublish_retry_interval_min", label: "Intervalo entre os pedidos de remoção repetidos (minutos)", type: "integer", defaultValue: 30, helper: "De 1 a 1440. Depois do prazo, o pedido é repetido nesse intervalo, sem aumentar a espera a cada vez." },
      { key: "integration.portal.unpublish_max_attempts", label: "Pedidos de remoção repetidos antes de chamar uma pessoa", type: "integer", defaultValue: 8, helper: "De 1 a 50. Esgotados os pedidos, abre-se uma tarefa urgente para o responsável e um alerta alto: o anúncio de um imóvel indisponível continua no ar." },
    ],
  },
  {
    title: "Métricas e eventos de monitoramento",
    subtitle:
      "As métricas e os eventos do sistema (contadores, erros de aplicação com a pilha já sem dado pessoal) saem para o serviço de analytics em segundo plano. Se o serviço estiver fora do ar, o trabalho do ERP não é afetado: o que não sair a tempo é descartado.",
    fields: [
      { key: "integration.analytics.drop_after_s", label: "Segundos até descartar uma métrica ou evento que não saiu", type: "integer", defaultValue: 300, helper: "De 1 a 86400. Passado esse tempo, a métrica ou o evento é descartado e não é enviado depois." },
    ],
  },
];
