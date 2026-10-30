// Padrões de API na aba Governança (Marco 9, M9-D843): limite de requisições, paginação e idempotência. Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_API_GROUPS = [
  {
    title: "Padrões de API (limite, paginação e idempotência)",
    subtitle:
      "Valem para a API inteira: quantas requisições por minuto cada usuário ou credencial pode fazer (acima disso a API responde 429 com o tempo de espera), o tamanho padrão da página (o máximo de 200 é fixo) e por quanto tempo uma chave de idempotência devolve a resposta original.",
    fields: [
      { key: "governanca.api.rate_limit.habilitado", label: "Limite de requisições ligado", type: "boolean", defaultValue: true, helper: "Desligado, a empresa fica sem limite por credencial." },
      { key: "governanca.api.rate_limit.interno_por_minuto", label: "Requisições por minuto por usuário logado", type: "integer", defaultValue: 1200, min: 1, max: 1000000 },
      { key: "governanca.api.rate_limit.externo_por_minuto", label: "Requisições por minuto por credencial de API externa", type: "integer", defaultValue: 600, min: 1, max: 1000000 },
      { key: "governanca.api.paginacao.tamanho_padrao", label: "Itens por página quando o cliente não informa", type: "integer", defaultValue: 50, min: 1, max: 200 },
      { key: "governanca.api.idempotencia.validade_horas", label: "Validade da chave de idempotência (horas)", type: "integer", defaultValue: 24, min: 1, max: 720, helper: "Repetir a mesma chave com o mesmo corpo dentro deste prazo devolve a resposta original, sem repetir o efeito." },
      { key: "governanca.api.idempotencia.espera_segundos", label: "Espera de uma repetição simultânea (segundos)", type: "integer", defaultValue: 10, min: 1, max: 120 },
      { key: "governanca.api.limpeza_job_minutos", label: "Intervalo da limpeza de chaves vencidas (minutos)", type: "integer", defaultValue: 10, min: 1, max: 1440 },
    ],
  },
  {
    title: "Consumidores e deprecação de rotas",
    subtitle:
      "O catálogo de consumidores da API (apps, parceiros e provedores) e o aviso de desligamento de rotas ou versões: quantos dias antes o evento de aviso sai, quanto tempo um consumidor conta como usando a rota e quando o job diário roda. O sistema cadastra o consumidor sozinho; o responsável e o prazo vêm da deprecação.",
    fields: [
      { key: "governanca.api.aviso_dias", label: "Dias de antecedência do aviso de desligamento", type: "integer", defaultValue: 30, min: 1, max: 365, helper: "Faltando este número de dias (ou menos) para o desligamento, cada consumidor ainda ativo na rota ou versão recebe o aviso, uma vez." },
      { key: "governanca.api.deprecacao.consumidor_ativo_dias", label: "Janela em que o consumidor conta como usando a rota (dias)", type: "integer", defaultValue: 30, min: 1, max: 365 },
      { key: "governanca.api.deprecacao.job_hora", label: "Hora da avaliação diária das deprecações (Brasília)", type: "integer", defaultValue: 7, min: 0, max: 23 },
      { key: "governanca.api.deprecacao.cache_segundos", label: "Segundos que cada servidor guarda as deprecações e consumidores", type: "integer", defaultValue: 30, min: 1, max: 3600, helper: "Uma deprecação anunciada ou cancelada vale no próprio servidor na hora e nos demais depois deste prazo." },
      { key: "governanca.api.consumidor.uso_intervalo_minutos", label: "Intervalo mínimo entre registros de uso do mesmo consumidor e rota (minutos)", type: "integer", defaultValue: 60, min: 1, max: 1440 },
      { key: "governanca.api.consumidor.app_web_chave", label: "Identificador do front web (cabeçalho X-Client-App)", type: "text", defaultValue: "nayara-web", helper: "Letras, números, ponto, hífen e sublinhado. Só mude junto com a configuração do front." },
    ],
  },
  {
    title: "API externa (credenciais de parceiros e provedores)",
    subtitle:
      "Parceiros e provedores acessam a API com credencial própria (client id e segredo), só com os acessos (scopes) que você liberou, e sem usar o login de nenhum colaborador. Aqui ficam a validade do token, a força do segredo e o prazo do primeiro contato com um lead recebido por parceiro.",
    fields: [
      { key: "governanca.api.cliente.token_validade_s", label: "Validade do token da credencial (segundos)", type: "integer", defaultValue: 900, min: 60, max: 3600, helper: "Passado esse tempo o parceiro pede outro token. Revogar a credencial vale na hora, mesmo para tokens ainda dentro da validade." },
      { key: "governanca.api.cliente.segredo_custo", label: "Custo do hash do segredo da credencial", type: "integer", defaultValue: 10, min: 4, max: 14, helper: "Quanto maior, mais difícil de quebrar e mais lenta a conferência. Vale para as credenciais criadas depois da mudança." },
      { key: "governanca.api.externo.lead_prazo_horas", label: "Prazo do primeiro contato com lead de parceiro (horas)", type: "integer", defaultValue: 24, min: 1, max: 720, helper: "Todo lead recebido pela API externa entra no funil como Novo, com a próxima ação vencendo neste prazo." },
    ],
  },
  {
    title: "Padrão de telas (carregamento, vazio, sem acesso e sem conexão)",
    subtitle:
      "Toda tela diz em qual situação está: carregando, vazia, com erro de preenchimento, sem acesso, sem conexão, para tentar de novo ou concluída. Quando a conexão cai, a tela pode continuar mostrando o último dado carregado; passado o tempo abaixo ela o marca como desatualizado.",
    fields: [
      { key: "governanca.ui.cache_fresco_s", label: "Tempo em que o último dado carregado conta como atual (segundos)", type: "integer", defaultValue: 60, min: 1, max: 86400, helper: "Só vale quando a conexão cai: o dado mais velho que isso aparece com o aviso \"desatualizado\"." },
    ],
  },
  {
    title: "Confirmação de ações destrutivas e códigos de erro",
    subtitle:
      "Ações difíceis de desfazer (cancelar, excluir, revogar, desativar) mostram o impacto calculado pelo servidor e pedem confirmação. Nível 1: resumo. Nível 2: lista do que será afetado e \"Entendi o impacto\". Nível 3: também digitar o código do registro e escrever a justificativa. Quando algo dá errado, a tela mostra um código para o suporte, sem texto técnico.",
    fields: [
      { key: "governanca.ui.confirmacao_por_nivel", label: "Nível de confirmação de cada ação (chave=nível, separadas por ponto e vírgula)", type: "text", defaultValue: "legal.contract.terminate=3; finance.entry.reverse=3; finance.payment_intent.cancel=3; procurement.order.cancel=2; property.delete=2; file.delete=2; user.deactivate=2; construction.project.cancel=3; data_quality.merge=3; data_quality.bulk=3; retention.apply=3; legal_hold.release=3; dlp.share_link.revoke=2; api_client.revoke=3; api_client.create=3; kill_switch.activate=2; kill_switch.restore=3; migration.canary.rollback=3; integration.error.retry_dangerous=3; integration.connection.disable=3; marketing.publication.cancel=2; ai.agent.deactivate=2", helper: "O padrão é o do livro. Troque o número (1, 2 ou 3) da ação que quiser; ação que não estiver na lista vale o padrão. Só valem as ações do inventário." },
      { key: "governanca.acoes.impacto_validade_min", label: "Validade da simulação de impacto (minutos)", type: "integer", defaultValue: 10, min: 1, max: 60, helper: "Passado esse tempo a pessoa precisa ver o impacto de novo antes de confirmar." },
      { key: "governanca.acoes.impacto_itens_max", label: "Itens afetados listados na confirmação", type: "integer", defaultValue: 50, min: 1, max: 200, helper: "A contagem é sempre completa; só a lista de itens é cortada neste número." },
      { key: "governanca.ui.exibir_debug", label: "Mostrar detalhe técnico do erro (somente desenvolvimento)", type: "boolean", defaultValue: false, helper: "Em produção este ajuste é recusado e nunca aparece texto técnico para o usuário." },
    ],
  },
];
