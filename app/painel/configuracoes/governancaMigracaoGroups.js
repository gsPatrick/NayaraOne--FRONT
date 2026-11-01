// Migração v2 na aba Governança (Marco 9, M9-D900): carga delta do sistema antigo. Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_MIGRACAO_GROUPS = [
  {
    title: "Migração do sistema antigo: carga incremental",
    subtitle:
      "A carga do sistema antigo traz só o que mudou desde o último ponto de controle e pode ser repetida sem duplicar nada. Cada lote roda numa transação: se falhar, nada é aplicado e o ponto de controle não avança.",
    fields: [
      { key: "migracao.lote.tamanho", label: "Linhas por lote", type: "integer", defaultValue: 2000, min: 1, max: 100000, helper: "Quantas linhas (ou eventos) cada lote aplica de uma vez. Lote menor falha e recomeça mais rápido; lote maior termina mais depressa." },
      { key: "migracao.watermark.sobreposicao_s", label: "Sobreposição da leitura por data de alteração (segundos)", type: "integer", defaultValue: 120, min: 0, max: 86400, helper: "A leitura volta este tempo antes do último ponto de controle para não perder uma linha cuja gravação só terminou depois. O que já foi aplicado é ignorado." },
      { key: "migracao.lote.max_tentativas", label: "Falhas seguidas do mesmo lote até abortar", type: "integer", defaultValue: 3, min: 1, max: 20, helper: "Passado este número de falhas seguidas o lote é abortado e a fonte para; uma nova execução cria outro lote." },
      { key: "migracao.lote.timeout_min", label: "Minutos até considerar falho um lote que não terminou", type: "integer", defaultValue: 30, min: 1, max: 1440, helper: "Se o processo cair no meio de um lote, a fonte fica travada por este tempo; depois o lote é dado como falho e a fonte é liberada." },
    ],
  },
  {
    title: "Migração do sistema antigo: limite de execuções",
    subtitle:
      "Cada pedido de carga abre conexão com o sistema antigo e usa o banco do Nayara. Estes limites impedem que pedidos repetidos ou simultâneos sobrecarreguem os dois. Passado o limite, o pedido é recusado com uma mensagem clara.",
    fields: [
      { key: "migracao.execucao.max_por_fonte", label: "Execuções ao mesmo tempo para a mesma fonte", type: "integer", defaultValue: 1, min: 1, max: 10, helper: "Quantas execuções (na fila, rodando ou pausadas) a mesma fonte do sistema antigo pode ter ao mesmo tempo. Um pedido sem fonte definida vale para todas. Com 1, o segundo pedido só entra depois que o primeiro terminar." },
      { key: "migracao.execucao.max_por_empresa", label: "Teto de execuções ativas da empresa", type: "integer", defaultValue: 3, min: 1, max: 50, helper: "Somando todas as fontes, quantas execuções a empresa pode ter ativas. Acima disso o pedido é recusado até alguma terminar." },
      { key: "migracao.execucao.max_no_processo", label: "Teto de execuções rodando ao mesmo tempo no servidor", type: "integer", defaultValue: 5, min: 1, max: 100, helper: "Quantas cargas o servidor roda juntas. As que passarem disso esperam na fila e são retomadas sozinhas em até um minuto." },
      { key: "migracao.execucao.expira_min", label: "Minutos até uma execução sem fim deixar de contar", type: "integer", defaultValue: 720, min: 1, max: 10080, helper: "Se o servidor cair no meio de uma carga, ela ficaria contando como ativa para sempre; passado este tempo deixa de contar e a fonte é liberada." },
      { key: "migracao.execucao.expira_replay_min", label: "Minutos sem sinal de vida até um replay de lote deixar de contar", type: "integer", defaultValue: 30, min: 1, max: 1440, helper: "O replay relê um lote só. Enquanto o replay roda ele renova um sinal de vida; se o servidor cair no meio dele, o sinal para e o registro libera a vaga da fonte depois deste tempo (e é encerrado como falho). Replay longo e vivo não expira." },
      { key: "migracao.execucao.sinal_vida_s", label: "Segundos entre as renovações do sinal de vida de um replay", type: "integer", defaultValue: 30, min: 1, max: 600, helper: "Com que frequência o replay de lote em andamento avisa que continua vivo. Valores menores detectam queda mais cedo, com mais escritas no banco." },
    ],
  },
  {
    title: "Migração do sistema antigo: empresa no sistema antigo",
    subtitle:
      "O sistema antigo é um só para todo o grupo. Com várias empresas no grupo, cada empresa deve ler apenas as linhas dela, identificadas por uma coluna do sistema antigo. Sem isso a carga é recusada, para nenhuma empresa receber os dados da outra.",
    fields: [
      { key: "migracao.legado.filtrar_por_empresa", label: "Ler só as linhas desta empresa", type: "boolean", defaultValue: false, helper: "Ligado: toda leitura do sistema antigo traz somente as linhas cuja coluna abaixo vale o código desta empresa. Cada empresa do grupo tem o seu código." },
      { key: "migracao.legado.coluna_empresa", label: "Coluna que identifica a empresa no sistema antigo", type: "text", defaultValue: "empresa_id", helper: "Nome da coluna, igual nas tabelas de clientes, fornecedores e imóveis do sistema antigo. Só letras, números e sublinhado." },
      { key: "migracao.legado.codigo_empresa", label: "Código desta empresa no sistema antigo", type: "text", defaultValue: "A_DEFINIR", helper: "O valor que a coluna acima tem nas linhas desta empresa. Enquanto estiver A_DEFINIR e o filtro ligado, a carga é recusada." },
      { key: "migracao.legado.exigir_filtro_multiempresa", label: "Recusar a carga em grupo com várias empresas sem o filtro", type: "boolean", defaultValue: true, helper: "Ligado: se o grupo tem mais de uma empresa e o filtro está desligado, a carga não começa. Desligue só se o sistema antigo já entrega a esta empresa apenas as linhas dela." },
    ],
  },
  {
    title: "Migração do sistema antigo: descarte do conteúdo de origem",
    subtitle:
      "Para conferir e repetir a carga, o Nayara guarda a linha original do sistema antigo (com CPF e data de nascimento) até o registro ser reconciliado. Depois disso o conteúdo é descartado; o resumo de conferência e o vínculo com o cadastro novo ficam.",
    fields: [
      { key: "migracao.payload.retencao_dias", label: "Dias até descartar o conteúdo depois de reconciliado", type: "integer", defaultValue: 30, min: 1, max: 3650, helper: "Com 1, o conteúdo é descartado um dia após a reconciliação. Repetir uma carga relê o sistema antigo e devolve o conteúdo, que é descartado de novo no prazo." },
    ],
  },
  {
    title: "Migração do sistema antigo: Torre de controle",
    subtitle: "O painel da migração mostra quanto já foi, quanto falta e uma estimativa de término calculada pela velocidade dos últimos lotes concluídos.",
    fields: [
      { key: "migracao.eta.janela_lotes", label: "Lotes usados na estimativa de término", type: "integer", defaultValue: 5, min: 1, max: 100, helper: "A velocidade (linhas por minuto) é a média dos últimos lotes concluídos; aqui você diz quantos entram na média. Poucos lotes reagem rápido a mudanças; muitos dão uma estimativa mais estável." },
    ],
  },
  {
    title: "Migração do sistema antigo: comparação paralela",
    subtitle:
      "Enquanto os dois sistemas rodam lado a lado, um robô compara o que o antigo e o novo dizem sobre os mesmos registros. Cada janela de comparação é definida pela API (período, entidades e a regra de cada campo); aqui ficam os padrões.",
    fields: [
      { key: "migracao.paralelo.intervalo_min", label: "Intervalo entre comparações (minutos)", type: "integer", defaultValue: 60, min: 1, max: 1440, helper: "De quanto em quanto tempo o robô compara de novo durante a janela. É o padrão de uma janela criada sem intervalo próprio." },
      { key: "migracao.paralelo.fuso", label: "Fuso das datas da janela e do dia civil", type: "text", defaultValue: "America/Sao_Paulo", helper: "Datas da janela sem fuso e a regra de data (mesmo dia civil) são lidas neste fuso. Use o nome do fuso, por exemplo America/Sao_Paulo." },
      { key: "migracao.paralelo.timeout_min", label: "Minutos até considerar falha uma comparação que não terminou", type: "integer", defaultValue: 30, min: 1, max: 1440, helper: "Se o processo cair no meio de uma comparação, a janela fica travada por este tempo; depois a comparação é dada como falha (nunca como sem diferenças) e a janela é liberada." },
    ],
  },
  {
    title: "Migração do sistema antigo: ativação por setor",
    subtitle:
      "O sistema novo é ligado aos poucos, setor por setor: primeiro uma parte dos usuários, depois mais, até todos. Cada setor avança e volta sozinho, sem afetar os outros. O avanço só acontece com a Torre de controle sem pendências bloqueantes do setor.",
    fields: [
      { key: "migracao.canary.etapas", label: "Etapas da ativação (percentual de usuários do setor)", type: "text", defaultValue: "5,25,50,100", helper: "Percentuais crescentes de usuários de cada setor que passam a operar no sistema novo, separados por vírgula e terminando em 100. A escolha dos usuários é estável: subir a etapa só acrescenta pessoas." },
      { key: "migracao.canary.exigir_comparacao", label: "Exigir comparação paralela limpa para avançar", type: "boolean", defaultValue: true, helper: "Ligado: para avançar de etapa, cada entidade do setor que a migração carrega precisa ter uma comparação paralela concluída e sem diferenças bloqueantes. Uma comparação que falhou nunca conta como limpa." },
      { key: "migracao.setor.atendimento.entidades", label: "Entidades do setor Atendimento", type: "text", defaultValue: "LEAD,VISIT", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (leads e visitas) impedem o avanço do setor Atendimento. Nomes separados por vírgula." },
      { key: "migracao.setor.locacao.entidades", label: "Entidades do setor Locação", type: "text", defaultValue: "PROPOSAL,CONTRACT", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (propostas e contratos de locação) impedem o avanço do setor Locação. Nomes separados por vírgula." },
      { key: "migracao.setor.financeiro.entidades", label: "Entidades do setor Financeiro", type: "text", defaultValue: "FINANCIAL_ENTRY", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (lançamentos e parcelas) impedem o avanço do setor Financeiro. Nomes separados por vírgula." },
      { key: "migracao.setor.obras.entidades", label: "Entidades do setor Obras", type: "text", defaultValue: "PROJECT,PROJECT_STAGE", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (obras e etapas) impedem o avanço do setor Obras. Nomes separados por vírgula." },
      { key: "migracao.setor.correspondente.entidades", label: "Entidades do setor Correspondente", type: "text", defaultValue: "FINANCING_PROCESS", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (processos de financiamento) impedem o avanço do setor Correspondente. Nomes separados por vírgula." },
      { key: "migracao.setor.juridico.entidades", label: "Entidades do setor Jurídico", type: "text", defaultValue: "LEGAL_DEADLINE,LEGAL_CASE", helper: "Pendências bloqueantes da Torre de controle sobre estas entidades (prazos e processos) impedem o avanço do setor Jurídico. Nomes separados por vírgula." },
    ],
  },
  {
    title: "Migração do sistema antigo: plano de rollback",
    subtitle:
      "Se o corte der errado e for preciso voltar ao sistema antigo, o que já saiu para o mundo (pagamento, mensagem, assinatura, publicação) não se desfaz sozinho. O relatório de rollback lista essas operações desde o GO, com o procedimento de compensação e o responsável de cada tipo.",
    fields: [
      { key: "migracao.rollback.itens_por_pagina", label: "Operações listadas por página no relatório de rollback", type: "integer", defaultValue: 100, min: 1, max: 1000, helper: "Quando você abre um tipo de operação no relatório, é este o número de operações mostradas de cada vez. Os tipos, as compensações e os responsáveis são cadastrados pela API do plano de rollback." },
    ],
  },
  {
    title: "Migração do sistema antigo: relógios",
    subtitle:
      "Antes de cada lote o sistema confere se os relógios do servidor da aplicação, do banco de destino, da internet (NTP) e do sistema antigo estão alinhados. Um relógio 3 minutos atrasado muda a data de vencimento de um boleto. Acima do limite a carga pausa sozinha e volta sozinha, do ponto em que parou, quando a medição voltar ao limite.",
    fields: [
      { key: "migracao.relogio.deriva_max_s", label: "Diferença máxima entre os relógios (segundos)", type: "integer", defaultValue: 2, min: 0, max: 3600, helper: "Acima disso a Torre de controle mostra a pendência de relógio e a carga pausa." },
      { key: "migracao.relogio.reverificar_min", label: "Reverificar o relógio a cada (minutos)", type: "integer", defaultValue: 5, min: 1, max: 1440, helper: "Com a carga pausada ou a diferença aberta, a conferência se repete neste ritmo; ao voltar ao limite a carga retoma." },
      { key: "migracao.relogio.ntp_ativo", label: "Conferir também o relógio da internet (NTP)", type: "boolean", defaultValue: true, helper: "Desligue só num laboratório sem acesso à internet: o relógio do banco e do sistema antigo continuam conferidos." },
      { key: "migracao.relogio.ntp_servidor", label: "Servidor NTP", type: "text", defaultValue: "pool.ntp.org", helper: "Nome do servidor, ou servidor:porta." },
      { key: "migracao.relogio.ntp_timeout_ms", label: "Tempo máximo de espera pelo NTP (milissegundos)", type: "integer", defaultValue: 3000, min: 100, max: 60000, helper: "Sem resposta neste tempo o relógio conta como não medido e a carga não parte." },
    ],
  },
  {
    title: "Migração do sistema antigo: fuso horário",
    subtitle:
      "Datas e horas do sistema antigo que vêm sem fuso são lidas no fuso de origem e convertidas para UTC (com o horário de verão brasileiro até 2019). Datas sem hora, como o vencimento, nunca mudam de dia.",
    fields: [
      { key: "migracao.fuso_origem", label: "Fuso do sistema antigo", type: "text", defaultValue: "America/Sao_Paulo", helper: "Nome do fuso, por exemplo America/Sao_Paulo." },
      { key: "migracao.fuso.ambiguo", label: "Horário que ocorre duas vezes (fim do horário de verão)", type: "text", defaultValue: "FIRST_OCCURRENCE", helper: "FIRST_OCCURRENCE usa a primeira vez, SECOND_OCCURRENCE a segunda e QUARANTINE manda o registro para a quarentena. Horário que não existe (início do horário de verão) sempre vai para a quarentena." },
      { key: "migracao.fuso.amostra_por_entidade", label: "Registros conferidos com datas de borda no ensaio", type: "integer", defaultValue: 1000, min: 1, max: 1000000, helper: "Por entidade, o ensaio compara ponto a ponto com a origem registros com meia-noite, 29/02 e 31/12 23:59:59 primeiro." },
    ],
  },
  {
    title: "Migração do sistema antigo: ensaio DRY3",
    subtitle:
      "O terceiro ensaio roda o fluxo completo com o volume real, num banco descartável, e termina em APROVADO ou REPROVADO pelos critérios do livro, sem aprovação manual. O relatório mostra dados pessoais sempre mascarados, a não ser que o ambiente de ensaio possa vê-los.",
    fields: [
      { key: "migracao.dry3.janela_comparacao_min", label: "Duração da janela de comparação do ensaio (minutos)", type: "integer", defaultValue: 10, min: 1, max: 1440, helper: "O ensaio abre uma janela curta de comparação paralela e a fecha ao terminar." },
      { key: "migracao.dry3.exemplos_no_relatorio", label: "Registros de exemplo no relatório", type: "integer", defaultValue: 10, min: 0, max: 100, helper: "Quantos registros o relatório do ensaio mostra, com a máscara de dados pessoais." },
      { key: "migracao.dry3.dados_pessoais_em_claro", label: "O ambiente de ensaio pode ver dados pessoais em claro", type: "boolean", defaultValue: false, helper: "Desligado, os exemplos do relatório saem mascarados. A máscara vale só para o que é exibido: a verificação de hash e a comparação usam sempre o valor real." },
      { key: "migracao.dry3.timeout_min", label: "Minutos até considerar interrompido um ensaio sem fim", type: "integer", defaultValue: 720, min: 1, max: 10080, helper: "Se o processo cair no meio do ensaio, ele fica ocupado por este tempo; depois é marcado como interrompido (nunca aprovado) e um novo pode começar." },
      { key: "migracao.dry3.validade_horas", label: "Validade do relatório do ensaio para o GO (horas)", type: "integer", defaultValue: 168, min: 1, max: 8760, helper: "O GO só aceita o relatório exportado do ensaio se ele foi gerado dentro deste prazo; um ensaio velho não prova o corte." },
      { key: "migracao.dry3.volume_minimo", label: "Volume mínimo do ensaio para o GO (linhas de origem)", type: "integer", defaultValue: 1000, min: 1, max: 1000000000, helper: "O GO só aceita um ensaio que migrou pelo menos esta quantidade de linhas; ensaio com poucas linhas não é volume real." },
      { key: "migracao.dry3.exigir_commit_igual", label: "O relatório do ensaio só vale para o commit em execução", type: "boolean", defaultValue: true, helper: "Ligado, o GO recusa relatório gerado em outra versão do sistema. Desligue só se a versão do ensaio e a do corte forem comprovadamente a mesma." },
      { key: "migracao.paralelo.prazo_dias", label: "Dias de tolerância de uma janela de comparação vencida", type: "integer", defaultValue: 7, min: 1, max: 365, helper: "Uma janela de comparação ainda aberta depois do fim por mais dias que isto gera alerta crítico ao responsável pelo encerramento da comparação." },
    ],
  },
];
