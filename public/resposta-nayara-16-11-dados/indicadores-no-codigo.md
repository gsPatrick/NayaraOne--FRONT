# Indicadores sinalizados no Centro de Comando: o que o código diz (16/11/2026)

Levantamento feito só pela leitura do código. Ninguém acessou banco, servidor ou homologação.

- **API:** `wt/api-int2`, commit `db42822d`, publicado em homologação.
- **Front:** `wt/front-int2`.
- **Caminhos:** são relativos à raiz da API, salvo quando indicado. Abreviação: `A/` = `src/features/analytics/`.
- **Datas:** o "hoje" do BI é sempre a data de calendário de São Paulo (`A/metrics/clock.js:27`; `src/utils/businessDate.js:10`, `America/Sao_Paulo`).
- **Leitura ao vivo:** o que aparece no painel depende do banco. Este documento diz por que o painel *pode* sinalizar e como confirmar cada causa com GETs (seção 4).

---

## 1. Como o Centro de Comando decide sinalizar um indicador

### 1.1 De onde vêm os 17

O painel `command_center` não tem cartões de indicador. Tem a faixa de qualidade, o briefing e seis blocos (`A/dashboards/panels/commandCenter.panel.js:11-17`). Cada bloco declara em `dependsOn` os indicadores de que depende (`A/dashboards/command/command.map.js:54-61`):

| Bloco | Indicadores de que depende |
|---|---|
| ACONTECEU | `legal.contracts_signed`, `crm.opportunities_won`, `fin.payments_settled_relevant` |
| DECISAO | `fin.approvals_pending`, `inv.adjustments_pending`, `tec.rule_approvals_pending`, `ai.proposals_pending` |
| RISCO | `fin.anomalies_open`, `legal.cases_by_risk`, `rent.guarantees_expiring`, `obra.projected_margin`, `tec.integration_errors` |
| DINHEIRO | `fin.overdue_receivables`, `obra.measurements`, `cor.commission`, `fin.owner_repasses_pending`, `inv.losses`, `obra.waste`, `obra.postwork_cost` |
| PRAZOS | `legal.deadlines`, `rent.guarantees_expiring`, `fin.payables_7d`, `obra.delays`, `rent.inspections_keys` |
| OPORTUNIDADES | `crm.opportunities_by_stage`, `crm.proposals`, `radar.matches`, `prop.without_sale_by_period` |

São 27 códigos distintos. Os 17 citados pela cliente são exatamente estes:

- ACONTECEU: os 3.
- RISCO: 3 dos 5.
- DINHEIRO: os 7.
- PRAZOS: 3 dos 5.
- OPORTUNIDADES: 1 dos 4.

Pela regra abaixo, isso significa que os blocos ACONTECEU, RISCO, DINHEIRO, PRAZOS e OPORTUNIDADES aparecem com "Conclusão adiada" e só o bloco DECISAO concluiu. Isto é dedução a partir da lista da cliente; não foi lido ao vivo.

### 1.2 A regra

1. **Leitura.** Para cada código, `evaluateBlock` chama `readMetricAsOfUnchecked` na data de hoje (`A/dashboards/dashboard.compose.js:56-59`; `A/quality/status.block.js:21-36`).

2. **Classificação do problema** (`status.block.js:27-34`). Os casos são testados nesta ordem:

| Situação do snapshot | Problema | Texto (`status.block.js:14-16`) |
|---|---|---|
| Não existe snapshot de hoje (`ANALYTICS_SNAPSHOT_NOT_AVAILABLE`) ou o indicador não está publicado (`ANALYTICS_METRIC_NOT_FOUND`) | `INCOMPLETE` | "Dado incompleto" |
| Freshness `EXPIRED` | `EXPIRED` | "Dado antigo, não use para decidir" |
| Freshness `UNKNOWN` (fonte nunca lida, ou carimbo no futuro) | `UNKNOWN` | "Ainda sem atualização" |
| Status `DEGRADED` | `DEGRADED` | "Dado incompleto" |
| Status `INCOMPLETE` | `INCOMPLETE` | "Dado incompleto" |
| Status ou freshness `STALE` | `STALE` | "Dado desatualizado" |

3. **Efeito no bloco.** Com qualquer problema, o bloco fica `deferred: true`, com o texto **"Conclusão adiada: dado incompleto"** (`status.block.js:12, 50-51`) e nenhum item (`A/dashboards/command/commandCenter.service.js:68`).
   - O Front mostra, por indicador: "`<nome>`: `<reason>`." e depois "Última atualização em …" ou "Este indicador ainda não foi atualizado." (`front-int2/components/organisms/CommandCenter/CommandBlock.js:14-24`).

4. **Efeito na faixa de qualidade.** Cada indicador de um bloco adiado entra uma vez em `degradedMetrics`. A mensagem é "**N indicadores não estão confiáveis neste painel. Confira antes de decidir.**" (`A/dashboards/dashboard.banner.js:34-44`).
   - Para essas linhas de bloco, `detail` é sempre nulo (`A/dashboards/dashboard.banner.detail.js:17-18`).
   - O Front escreve "Sem atualização registrada." quando não há `lastUpdateAt` (`front-int2/components/molecules/analytics/BiBanner/BiBannerDetail.js:11`).

### 1.3 O que piora o status de um snapshot que existe

O status é calculado em `A/metrics/freshness.present.js:22-51`:

- **Base.** É o `result.status` da fórmula, gravado no snapshot.
- **Freshness** (`A/metrics/freshness.js:32-45`). A idade conta de `source_snapshot_at`. O limite é:
  - o `analytics.freshness.max_minutos.<DOMINIO>`, quando configurado;
  - senão, o `maxStalenessMinutes` da métrica.

  Com o fator `analytics.freshness.fator_expirado` (padrão 4, `A/quality/quality.settings.js:57`):
  - até o limite: FRESH;
  - acima do limite: STALE (o número continua visível);
  - acima de 4 vezes o limite: EXPIRED, que vira status DEGRADED e esconde o valor.

  **Para os indicadores com limite de 15 min, isso quer dizer: sem nova leitura da fonte por mais de 60 min, o indicador fica sem número.**
- **Checks de qualidade do read model.** Um check BLOCK reprovado ou em erro deixa o indicador DEGRADED (`A/quality/status.service.js`; `A/quality/status.checks.js`).

### 1.4 Quando o snapshot de hoje é gravado

- **Só no fim de um lote de refresh** de um read model observado pelo conjunto de KPIs. Arquivos: `A/metrics/kpis/kpiGroup.factory.js:94-101` e `A/metrics/kpis/legalCor/kpiSet.js:113-122`.
- **O lote pode vir de evento.** O caminho é: outbox, despachado a cada 30 s (`app.js:356-358`), depois o consumidor `A/read-models/readModel.consumer.js:31-34`.
- **Ou da agenda.** O `analyticsReadModelRefreshJob` roda "a cada 15 min e às 00:05 America/Sao_Paulo" (`A/read-models/readModel.settings.js:31`). Mas ele só recalcula read models que declaram `scheduled` e que têm alguma chave a recalcular. Sem chave, não há refresh (`A/read-models/readModel.scheduled.js:21-30`).
- **O job de snapshot diário não grava o dia de hoje.** O `analyticsSnapshotJob` grava D-1, e os provedores devolvem `[]` para qualquer data que não seja hoje (`A/metrics/kpis/legalCor/kpiSet.js:135-138`; `kpiGroup.factory.js:110`).
- **O `cron` da política de cada métrica (por exemplo `'5 0 * * *'`) não é executado por ninguém.** Ele só é validado (`A/metrics/registry.fields.js:64`).
- **Jobs desligáveis.** Os jobs de refresh do BI só sobem com `NODE_ENV != test` e `INTEGRATION_HEALTH_AGGREGATE_JOB_DISABLED != 'true'` (`app.js:471-489`). O outbox é desligado por `OUTBOX_DISPATCHER_JOB_DISABLED`.
- **Trava do lote.** O listener do fim de lote roda no máximo uma vez a cada `analytics.refresh.lote_segundos` (padrão 30 s) por empresa e read model (`A/read-models/readModel.batch.js:51-57`).

### 1.5 Causas de sinalização, das mais comuns às mais raras

| # | Causa | Texto no Centro | Indicadores afetados |
|---|---|---|---|
| C1 | O read model só atualiza por evento (não tem `scheduled`) e o limite de frescor é 15 min. Uma hora sem evento novo leva a EXPIRED/DEGRADED; entre 15 e 60 min o estado é STALE | "Dado antigo, não use para decidir" ou "Dado desatualizado" | `cor.commission`, `legal.cases_by_risk`, `obra.measurements`, `obra.waste`, `obra.postwork_cost` (sem caso de garantia aberto) e os 3 fatos do dia (a agenda só existe se houve fato nas últimas `janela_horas + 24` h) |
| C2 | Não há snapshot de hoje: o read model nunca foi alimentado na empresa, ou não houve refresh hoje | "Dado incompleto" + "Este indicador ainda não foi atualizado." | Qualquer um. Os mais expostos: os 3 fatos do dia (empresa sem nenhum fato nunca recebe snapshot, nem com valor 0) e `obra.*` sem obra |
| C3 | A fórmula devolve INCOMPLETE por falta de dado (lista de motivos em cada tabela) | "Dado incompleto" | Ex.: `SEM_OBRA`, `FORECAST_INCOMPLETO`, `ETAPA_SEM_DATA_PREVISTA`, `SEM_CONSUMO`, `LANCAMENTO_SEM_VENCIMENTO`, `*_SEM_DATA`, `SEM_CHAMADAS` |
| C4 | A fórmula devolve DEGRADED por regra de qualidade do dado | "Dado incompleto" | Ex.: `CHAVE_SEM_DATA_PREVISTA`, `MEDICAO_APROVADA_SEM_LANCAMENTO`, `PERDA_SEM_CUSTO_MEDIO`, `OCORRENCIA_SEM_OBRA`, `SEM_CLASSIFICACAO_ACIMA_DO_LIMITE` |
| C5 | Um check de qualidade do read model reprovou (BLOCK) | "Dado incompleto" | Qualquer um |
| C6 | Os jobs de refresh ou de outbox estão desligados no ambiente | "Dado incompleto", "Dado antigo" ou "Dado desatualizado" | Todos |

**Não existe "amostra mínima" configurável em nenhum dos 17 indicadores.** Onde há mínimo, ele é sempre "pelo menos um registro" (ver as tabelas).

---

## 2. Os 17 indicadores

Formato de cada tabela:

- **Fonte:** read model e tabela de origem.
- **Período:** janela e fuso.
- **Sinaliza quando:** a regra.
- **Para sair:** o dado necessário.
- **Esperado:** o que aparece.
- **Registro mínimo:** rota e campos.

Prefixo de todas as rotas: `/api` (`app.js:157-159`) + `/v1` (`src/routes/index.js`). `groupId` e `companyId` vêm da sessão, não do corpo.

Os três primeiros (fatos do dia, M9-D710) compartilham estes pontos:

- **Read model:** `analytics.rm_command_events`. Migration: `migrations/20260101009874-create-analytics-rm-command-events.js:21-43`.
- **Conjunto de KPIs:** `A/metrics/kpis/centro-comando/*`, sobre `kpiSet`.
- **Janela** (`A/metrics/kpis/centro-comando/windows.js:14-20`): `[agora − analytics.centro.janela_horas, agora]`. Padrão de `janela_horas`: 24, faixa de 1 a 720 (`A/read-models/commandEvents.settings.js:12,23,58-61`).
  - "Agora" é o instante do recálculo (o refresh), não o da leitura.
  - A janela anterior é `[from − horas, from)`.
- **Frescor:** 15 min, política EVENT (`centro-comando/definitions.js:9-10`).
- **Linhas sem data** (`centro-comando/rows.js:33`). Conta-se `undated` como COUNT de linhas `revision=0 AND occurred_at IS NULL`, **sem filtro de janela**. Um único fato sem data, de qualquer época, deixa o KPI INCOMPLETE.
- **Sem snapshot nunca** (`kpiSet.js:84`; `legalCor/snapshotAt.js:10-19`). Se a empresa nunca teve linha em `rm_command_events` nem refresh registrado, `snapshotAt` é nulo e nunca há snapshot. O indicador fica "Dado incompleto" mesmo quando o valor real é 0.
- **Agenda** (`A/read-models/command-events.readmodel.js:44-48`). Só há agenda para registros de origem com `updated_at` nas últimas `janela_horas + 24` h. Sem fatos recentes não há refresh, e o snapshot envelhece até EXPIRED (causa C1).

### 2.1 Contratos assinados (`legal.contracts_signed`)

| Item | Conteúdo |
|---|---|
| Fonte | `rm_command_events` com kind `CONTRACT_SIGNED`, montado de `legal.contracts`, `legal.signatures` e `legal.contract_versions` (`A/read-models/command-events/contracts.js:11-27`) |
| O que entra | Contrato em SIGNED, ACTIVE, SUSPENDED, TERMINATED ou CLOSED. A data do fato é `max(signed_at)` das assinaturas `SIGNED`. O valor é `total_value`. O tipo é `contract_type` |
| Fórmula | `A/metrics/formulas/legalContractsSigned.js:11-22`: soma de `count_effect` e de `amount`, por tipo |
| Período | Janela de `janela_horas` (padrão 24 h) até o instante do refresh, fuso de São Paulo |
| Sinaliza quando | (a) C2: empresa sem nenhum fato; (b) `undated > 0`, motivo `CONTRATO_ASSINADO_SEM_DATA` (`:12`). Um contrato assinado sem assinatura com `signed_at` (por exemplo, migrado) causa isso; (c) C1: mais de 60 min sem refresh |
| Para sair | Um evento de contrato (`legal.contract.status_changed`, `contract.activated`, `contract.terminated`) que gere o refresh; nenhum contrato "assinado" sem `signed_at`; e frescor de até 15 min |
| Esperado | OK com a quantidade de contratos assinados na janela. Dimensões `valor_brl` e `anterior_qtd`. No bloco 1, o item "N contratos assinados" só aparece se o valor for maior que 0 (`A/dashboards/command/command.block1.js:30`) |
| Registro mínimo | 1. `POST /api/v1/legal/contracts` com `{contractType:"PROPERTY_ADMIN", totalValue}` (`src/modules/legal/shared/legal.routes.js:34`; `contract.service.js:326-327`)<br>2. `POST …/contracts/:id/parties` com `{personId, partyRole:"LANDLORD"}`<br>3. `POST …/contracts/:id/versions` com `{documentFileId}`<br>4. `POST …/contracts/:id/transition` passando por DOCUMENTS_PENDING, LEGAL_REVIEW, APPROVED e SIGNING<br>5. `POST /api/v1/legal/contract-versions/:versionId/manual-signatures` com `{personId, evidenceFileId}` (`legal.routes.js:128`). Isso leva o contrato a SIGNED (`framework/signature.complete.js:13-46`)<br>O refresh é por evento, pelo outbox (cerca de 30 s). As exigências documentais por tipo de contrato não foram mapeadas |

### 2.2 Oportunidades ganhas (`crm.opportunities_won`)

| Item | Conteúdo |
|---|---|
| Fonte | `rm_command_events` com kind `OPPORTUNITY_WON`, montado de `crm.opportunities` e `crm.proposals` (`A/read-models/command-events/opportunities.js:11-21`) |
| O que entra | `stage='WON'` e `closed_at` não nulo. O valor é a proposta ACCEPTED |
| Fórmula | `A/metrics/formulas/crmOpportunitiesWon.js:12-28` |
| Período | Mesma janela de 2.1 |
| Sinaliza quando | C2; `undated > 0`, motivo `OPORTUNIDADE_GANHA_SEM_DATA` (`:13`); C1; e também checks do `rm_crm_outcome`, que afetam este código (`A/quality/checks/rm_crm_outcome.checks.js:7`) |
| Para sair | Uma oportunidade ganha (o evento `crm.opportunity.won` gera o refresh) e frescor de até 15 min |
| Esperado | OK com a quantidade de oportunidades ganhas na janela. Item no bloco 1 se maior que 0 |
| Registro mínimo | `POST /api/v1/opportunities` (`src/features/crm/crm.routes.js:53`) com `{personId, stage:"WON", wonReason:"PRICE_ACCEPTED"}`<br>`personId` precisa existir (`opportunity.service.js:42-47`). `closedAt` é preenchido com o momento atual (`:85`). A rota publica `crm.opportunity.won` (`:94`) |

### 2.3 Pagamentos acima do valor relevante (`fin.payments_settled_relevant`)

| Item | Conteúdo |
|---|---|
| Fonte | `rm_command_events` com kind `PAYMENT_SETTLED`, montado de `finance.financial_entries` (`A/read-models/command-events/payments.js:11-22`) |
| O que entra | DEBIT/PAYABLE, sem estorno, status SETTLED ou REVERSED. A data do fato é `settled_at` |
| Fórmula | `A/metrics/formulas/finPaymentsSettledRelevant.js:11-24`. Só entra `ABS(amount) >= analytics.centro.valor_relevante` (padrão **R$ 10.000,00**, comparação inclusiva; `commandEvents.settings.js:13,24,28-37`). Dinheiro de terceiros vai à parte |
| Período | Mesma janela de 2.1 |
| Sinaliza quando | C2; `undated > 0`, motivo `LIQUIDACAO_SEM_DATA` (`:12`); C1 |
| Para sair | Uma liquidação de conta a pagar própria, com valor de pelo menos R$ 10.000,00, dentro da janela |
| Esperado | OK com a quantidade de pagamentos. Dimensão `valor_brl` |
| Registro mínimo | 1. `POST /api/v1/finance/entries` com `{entryType:"DEBIT", nature:"PAYABLE", amount:"10000.00", costCenterId}` (`finance.routes.js:39`; `financial-entry.service.js:58-85`)<br>2. `POST …/entries/:id/settlement-evidence` com `{evidenceFileId, reason}`<br>3. `POST /api/v1/finance/approval-requests` e `POST …/:id/decide`, feito por outra pessoa com `finance:approve`<br>4. `POST …/entries/:id/settle`, com MFA recente e `Idempotency-Key` (`finance.routes.js:48`)<br>O passo 4 publica `finance.entry.settled` |

### 2.4 Processos por risco (`legal.cases_by_risk`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_legal_cases_risk`, montado de `legal.legal_cases` (`A/read-models/juridico-legal-cases-risk.readmodel.js:15-24`) |
| O que entra | `deleted_at` nulo, `status` e `phase` fora de `analytics.juridico.processo_encerrado_status` (padrão `CLOSED,ARCHIVED,CANCELLED`, `juridico.settings.js:10-11`). Risco nulo vira `SEM_CLASSIFICACAO` |
| Fórmula | `A/metrics/formulas/legalCasesByRisk.js:12-24`. O valor é o total de processos ativos. Dimensões `risco:<NIVEL>`; o Centro lê `risco:CRITICAL` e `risco:HIGH` (`command.block3.js:36-40`) |
| Período | Posição atual, sem janela |
| Atualização | **Só por evento** (`legal.case.created`, `legal.case.updated`). Sem agenda (`readmodel.js:27-36`, confirmado na leitura). Frescor de 15 min (`legalCor/legal.definitions.js:10,22`) |
| Sinaliza quando | C1: 60 min depois do último evento de processo, o indicador fica EXPIRED/DEGRADED. Também DEGRADED com motivo `SEM_CLASSIFICACAO_ACIMA_DO_LIMITE` quando a parcela sem risco passa de `analytics.qualidade.max_sem_risco_pct` (padrão 10; comparação estrita, `:21`). Também C2 |
| Para sair | Um evento de processo há menos de 15 min, ou o limite `analytics.freshness.max_minutos.LEGAL` configurado; e todos os processos ativos com `riskLevel` |
| Esperado | OK com o total de processos ativos. Item "N processos de risco alto ou crítico" se houver HIGH ou CRITICAL |
| Registro mínimo | `POST /api/v1/legal/cases` com `{caseType:"LITIGATION", riskLevel:"HIGH"}` (`legal.routes.js:180`; `legal-case.service.js:43-53,74-80`). Publica `legal.case.created` (`:105`) |

### 2.5 Margem projetada (`obra.projected_margin`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_project_cost` (`A/read-models/obras-project-cost.readmodel.js`) |
| Orçamento base | `construction.budgets.baseline_amount` ou, sem ele, `projects.budget_amount` |
| Custo realizado | `finance.financial_entries` PAYABLE SETTLED |
| Receita | `legal.contracts` com `construction_project_id` e status em `analytics.obra.receita_contrato_status` (padrão `SIGNED,ACTIVE,SUSPENDED,CLOSED`) |
| % realizado | `construction.project_stages`. Sem etapa, o % é nulo e o forecast também (`obra.progress.query.js:12-24`; `readmodel.js:51-67`) |
| Fórmula | `A/metrics/formulas/obraProjectedMargin.js:18-30`. O valor é receita menos forecast. Dimensões `obra:<id>:margem_pct`; o Centro lista as obras abaixo de `analytics.centro.margem_minima_pct` (padrão 10%, `command.block3.js:55-69`) |
| Período | Posição de hoje, sem janela |
| Atualização | **Só por evento**: obra, etapa, medição, ledger, contrato e orçamento. Sem agenda. Frescor de 1440 min (24 h) |
| Sinaliza quando | INCOMPLETE "tudo ou nada": `SEM_OBRA`, ou QUALQUER obra com forecast nulo (`FORECAST_INCOMPLETO`), ou QUALQUER obra com receita menor ou igual a zero (`RECEITA_CONTRATADA_ZERO`). Também C2 e STALE após 24 h |
| Para sair | Todas as obras do read model com orçamento base, pelo menos uma etapa e contrato com valor no status aceito |
| Esperado | OK com a margem em reais. Item por obra abaixo do mínimo |
| Registro mínimo | 1. `POST /api/v1/construction/projects` com `{name, budgetAmount}` (`construction.routes.js:26`)<br>2. `POST …/projects/:id/stages` com `{name}`<br>3. Contrato de obra `POST /api/v1/legal/contracts` com `{contractType:"CONSTRUCTION", constructionProjectId, totalValue}`, levado até SIGNED (mesmo caminho de 2.1)<br>Alternativa de teste: incluir DRAFT em `analytics.obra.receita_contrato_status`. Depois disso é preciso outro evento da obra |

### 2.6 Integrações com erro (`tec.integration_errors`)

O detalhe completo está na seção 3.

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_tech_integrations`, montado de `integration.provider_health`, `integration.connections` (ACTIVE) e `integration.providers` (`A/read-models/tecnologia/integrations.js:18-37`) |
| Período | Última janela **fechada** de `analytics.tec.janela_minutos` (padrão 60) de cada conexão ativa. Detalhes na seção 3 |
| Sinaliza quando | INCOMPLETE com motivo `SEM_CHAMADAS` se a soma de chamadas for 0 (`A/metrics/formulas/techIntegrationErrors.js:45`). Também C2, checks e EXPIRED (limite de 5 min) |
| Esperado | OK com a % de erro. O Centro mostra "N integrações acima do limite de erro" se a dimensão `acima_do_slo_qtd` for maior que 0 (`command.block3.js:46-50`) |
| Registro mínimo | Uma tentativa real de envio por uma conexão ACTIVE (seção 3.6) |

### 2.7 Inadimplência (`fin.overdue_receivables`, "Valor inadimplente")

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_finance_health`, montado de `finance.financial_entries` (`A/read-models/financeHealth.entries.js:39,45`; detalhe em `financeHealth.overdue.js:16-39`) |
| O que entra | RECEIVABLE próprio, PENDING ou PARTIALLY_SETTLED, com `due_at < hoje` (meia-noite de São Paulo). Soma o saldo em aberto |
| Fórmula | `A/metrics/formulas/finOverdueReceivables.js:15-33` |
| Período | Tudo que venceu antes de hoje, sem limite de idade. Faixas em `analytics.inadimplencia.faixas_atraso_dias` (padrão `30,60,90`) |
| Atualização | Por evento (`financeHealth.events.js:8-16`) e pela agenda de 15 min (`financeiro-finance-health.readmodel.js:102`). Frescor de 15 min |
| Sinaliza quando | INCOMPLETE com motivo `LANCAMENTO_SEM_VENCIMENTO` se existir **qualquer** conta a receber própria em aberto sem `due_at` (`:17`). Também C2 se não houver linha de hoje |
| Para sair | Nenhuma conta a receber em aberto sem vencimento, e a agenda rodando |
| Esperado | OK com o valor vencido. Componente "Recebíveis vencidos" do dinheiro PARADO |
| Registro mínimo | `POST /api/v1/finance/entries` com `{entryType:"CREDIT", nature:"RECEIVABLE", amount:"100.00", resultCenterId, dueAt:"2026-11-10T12:00:00-03:00"}` (`financial-entry.service.js:86-87`). Use data passada do mês corrente (período aberto) e **sempre com hora e fuso**: `dueAt` só com a data é gravado em UTC e cai no dia anterior em São Paulo |

### 2.8 Medições (`obra.measurements`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_project_measurements`, montado de `construction.stage_measurements`, `project_stages` e `finance.financial_entries` (`A/read-models/obras-project-measurements.readmodel.js:17-31`) |
| O que entra | Pendente = SUBMITTED ou REVIEWED. O Centro lê `pendente_brl` |
| Fórmula | `A/metrics/formulas/obraMeasurements.js:20-36` |
| Período | Posição de hoje |
| Atualização | **Só por evento** (`measurement.submitted`, `measurement.approved`, `stage_measurement.decided`, `finance.entry.reversed`). Sem agenda. **Frescor de 15 min** |
| Sinaliza quando | INCOMPLETE com motivo `SEM_OBRA` quando não há nenhuma medição: o conjunto entrega `projects: []` (`A/metrics/kpis/obras/inputs.js:39-43`) e a fórmula recusa a lista vazia (`:22`). Também DEGRADED com motivo `MEDICAO_APROVADA_SEM_LANCAMENTO`, e C1 (60 min após o último evento de medição) |
| Para sair | Pelo menos uma medição, nenhuma aprovada sem lançamento a pagar, e um evento de medição há menos de 15 min (ou o limite `analytics.freshness.max_minutos.CONSTRUCTION`) |
| Esperado | OK com o total medido. `pendente_brl` vai para o dinheiro PARADO |
| Registro mínimo | Obra e etapa (como em 2.5), depois:<br>1. `POST /api/v1/construction/stages/:id/measurements` com `{measuredPct, measuredAt, totalAmount}` (`construction.routes.js:54`; `stageMeasurements.service.js:113-128`)<br>2. `POST /api/v1/construction/measurements/:id/submit`, que publica `measurement.submitted` |

### 2.9 Comissões (`cor.commission`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_fin_commission`, montado de `correspondent.commission_entitlements` (exceto ADJUSTED), `financing_cases` e `finance.financial_entries` (`A/read-models/correspondente-fin-commission.readmodel.js:14-26`) |
| O que entra | O Centro lê `a_receber_brl` = confirmada − recebida |
| Fórmula | `A/metrics/formulas/corCommission.js:13-36` |
| Período | Valor da empresa inteira. `periodStart` = dia 1º do mês (`legalCor/cor.set.js:14`) |
| Atualização | **Só por evento** (`commission.entitlement.created/confirmed/received/adjusted`). Sem agenda (`readmodel.js:28-37`, confirmado na leitura). **Frescor de 15 min** |
| Sinaliza quando | C1: 60 min sem evento de comissão leva a EXPIRED/DEGRADED. DEGRADED com motivo `RECEBIDA_SEM_CASO_VINCULADO` ou `READ_MODEL_NAO_RECALCULADO`. Também C2 (nunca alimentado) |
| Para sair | Um evento de comissão há menos de 15 min, ou o limite `analytics.freshness.max_minutos.CORRESPONDENT` |
| Esperado | OK com o valor esperado. `a_receber_brl` vai para o dinheiro PARADO |
| Registro mínimo | 1. `POST /api/v1/financing-cases` com `{applicants:[{personId, role:"PRINCIPAL"}]}`<br>2. `POST …/:id/commissions` com `{baseAmount:100000}`, que publica `commission.entitlement.created`<br>3. Para que `a_receber_brl` seja maior que 0: `POST …/commissions/:entitlementId/confirm` com `{externalConfirmationId}`. Exige `finance:settle` (`commissionEntitlements.controller.js:31-41`) |

### 2.10 Repasses (`fin.owner_repasses_pending`)

| Item | Conteúdo |
|---|---|
| Fonte | `rm_finance_health`, montado de `finance.owner_repasses` com status PENDING ou APPROVED (`A/read-models/financeHealth.repasses.js:14-28`) |
| O que entra | O Centro lê `vencidos_alerta_brl`: repasses com mais de `analytics.repasse.dias_alerta` dias úteis (padrão 5) desde a criação |
| Fórmula | `A/metrics/formulas/finOwnerRepassesPending.js:21-44`. **Nunca devolve INCOMPLETE nem DEGRADED** |
| Período | Posição atual. Idade em dias úteis de São Paulo |
| Atualização | Por evento e pela agenda de 15 min. Frescor de 15 min |
| Sinaliza quando | Só C2 (sem linha de hoje), C5 ou C6. A fórmula não sinaliza |
| Para sair | A agenda do `rm_finance_health` rodando hoje. Basta isso para sair OK com 0,00 |
| Esperado | OK. Componente "Repasses a proprietários vencidos" à parte, nunca somado (`command.block4.js:26-32`) |
| Registro mínimo | Para valor maior que 0: conta a receber liquidada, depois `POST /api/v1/finance/owner-repasses` com `{propertyId, ownerPersonId, referenceMonth, sourceEntryIds}` (`owner-repasses.service.js:81-105`). **Um repasse criado hoje tem 0 dias úteis, então `vencidos_alerta_brl` fica 0. Não há rota que aceite data retroativa** |

### 2.11 Perdas de estoque (`inv.losses`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_inventory_health`, montado de `inventory.loss_cases` (APPROVED, `decided_at` na janela) e `inventory_movements` (`A/read-models/estoque-inventory-health.readmodel.js:35-45`) |
| Fórmula | `A/metrics/formulas/invLosses.js:14-18` |
| Período | De `hoje − (N−1)` até hoje, com N = `analytics.estoque.janela_perdas_dias` (padrão 30), meia-noite de São Paulo |
| Atualização | Por evento e pela agenda de 15 min, sempre com a chave de hoje |
| Sinaliza quando | DEGRADED com motivo `PERDA_DECIDIDA_SEM_VALOR`; C2 se a agenda não rodou hoje; C6 |
| Para sair | A agenda rodando. **Não precisa de registro nenhum** para sair OK com 0,00 |
| Esperado | OK com o valor das perdas. Vai para o dinheiro PERDIDO |
| Registro mínimo | Para valor maior que 0: item com custo médio (recebimento confirmado), depois `POST /api/v1/inventory/loss-cases` com `{context, inventoryItemId, quantity, locationId, evidenceFileIds, projectId}` e `POST …/loss-cases/:id/decide` com `{decision:"APPROVED"}`, feito por outro usuário (`lossCases.service.js:111-143,296-337`) |

### 2.12 Desperdício (`obra.waste`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_project_waste`, montado de `inventory.inventory_movements` com `project_id` e tipo LOSS ou OUT (`A/read-models/obras-project-waste.readmodel.js:14-23`) |
| Fórmula | `A/metrics/formulas/obraWaste.js:30-38` |
| Período | Acumulado, sem janela |
| Atualização | **Só por evento** `inventory.movement.recorded` com obra. Sem agenda. **Frescor de 15 min** |
| Sinaliza quando | INCOMPLETE com motivo `SEM_CONSUMO` (consumo total zero; inclui a tabela vazia, `:38`). DEGRADED com motivo `PERDA_SEM_CUSTO_MEDIO`. C1 após 60 min sem movimento de obra. C2 |
| Para sair | Pelo menos um movimento OUT com custo para uma obra, e frescor de até 15 min (ou o limite `analytics.freshness.max_minutos.CONSTRUCTION`) |
| Esperado | OK com o valor do desperdício. Vai para o dinheiro PERDIDO |
| Registro mínimo | 1. Item: `POST /api/v1/inventory/items` com `{name, sku, unitOfMeasure}`<br>2. Local: `POST /api/v1/inventory/locations`<br>3. Recebimento com custo: `POST /api/v1/inventory/receipts`, depois `/review` e `/confirm`<br>4. `POST /api/v1/inventory/movements` com `{movementType:"OUT", inventoryItemId, quantity, sourceLocationId, projectId, stageId, responsiblePersonId}` (`movements.service.js:366-371,637-641`) |

### 2.13 Custo pós-obra (`obra.postwork_cost`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_postwork_cost`, montado de `construction.maintenance_cases` e `warranty_actions` (`A/read-models/obras-postwork-cost.readmodel.js:19-34`) |
| Fórmula | `A/metrics/formulas/obraPostworkCost.js:13-38`. O realizado considera só casos CLOSED |
| Período | Posição atual |
| Atualização | Por evento de garantia. Pela agenda só quando existe caso aberto (`:40-47,58`). Frescor de 15 min |
| Sinaliza quando | DEGRADED com motivo `OCORRENCIA_SEM_OBRA` (caso sem `projectId`). C1 quando não há caso aberto. C2 |
| Para sair | Um caso com `projectId`. Com caso aberto, a agenda mantém o indicador fresco |
| Esperado | OK com o custo realizado (0,00 enquanto o caso está aberto). Vai para o dinheiro PERDIDO |
| Registro mínimo | `POST /api/v1/construction/warranty-cases` com `{propertyId, description, projectId, laborCost}` (`construction.routes.js:148`; `maintenanceCases.service.js:174-180`). Publica `warranty.case.opened` |

### 2.14 Contas a pagar em sete dias (`fin.payables_7d`)

| Item | Conteúdo |
|---|---|
| Fonte | `rm_finance_health`, montado de `finance.financial_entries` PAYABLE próprio, PENDING ou PARTIALLY_SETTLED (`A/read-models/financeHealth.entries.js:18-21,32,44`) |
| Fórmula | `A/metrics/formulas/finPayables7d.js:6`, que chama `_finWindow.js:15-23` |
| Período | De hoje até hoje+6, de 00:00 de São Paulo de hoje até 00:00 de hoje+7 (`financeHealth.dates.js:12-19`). Fixo, não configurável |
| Atualização | Por evento e pela agenda de 15 min. Frescor de 15 min |
| Sinaliza quando | INCOMPLETE com motivo `LANCAMENTO_SEM_VENCIMENTO` se existir **qualquer** conta a pagar própria em aberto sem `due_at` (`_finWindow.js:21`). Também C2 |
| Para sair | Nenhuma conta a pagar em aberto sem vencimento |
| Esperado | OK com o valor. Item no bloco 5 se maior que 0 (`command.block5.js:51-53`) |
| Registro mínimo | `POST /api/v1/finance/entries` com `{entryType:"DEBIT", nature:"PAYABLE", amount:"100.00", costCenterId, dueAt:"<hoje..hoje+6>T12:00:00-03:00"}`. Publica `finance.entry.created` |

### 2.15 Atrasos (`obra.delays`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_project_delays`, montado de `construction.project_stages` (`A/read-models/obras-project-delays.readmodel.js:17-25`) |
| O que entra | Etapa atrasada: data de `ends_at` em São Paulo anterior a hoje, status diferente de DONE e medido abaixo de 100% |
| Fórmula | `A/metrics/formulas/obraDelays.js:16-26` |
| Período | Data-base de hoje em São Paulo |
| Atualização | Por evento e pela agenda de 15 min, para obras não fechadas. Frescor de 1440 min |
| Sinaliza quando | INCOMPLETE com motivo `SEM_OBRA`, ou com motivo `ETAPA_SEM_DATA_PREVISTA` se QUALQUER etapa não DONE de qualquer obra estiver sem `ends_at`. Também C2 (sem nenhuma obra, não há snapshot) |
| Para sair | Todas as etapas abertas com data prevista |
| Esperado | OK com a quantidade de etapas atrasadas. Item por obra no bloco 5 |
| Registro mínimo | Obra (como em 2.5) e `POST …/projects/:id/stages` com `{name, endsAt:"<ontem>"}` (`projectStages.service.js:27-38,71`) |

### 2.16 Vistorias e chaves (`rent.inspections_keys`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_rental_inspections_keys`, montado de `legal.inspections`, `legal.key_deliveries` e `legal.contracts` de locação (`A/read-models/locacao/inspections-keys.js:15-30`) |
| O que entra | O Centro lê `vistorias_atrasadas_qtd` (agendada antes de hoje e não concluída) e `chaves_atrasadas_qtd` (RELEASED com fim de contrato vencido) |
| Fórmula | `A/metrics/formulas/rentInspectionsKeys.js:17-22` |
| Período | Posição em `as_of_date` = hoje em São Paulo |
| Atualização | Pela agenda de 15 min (chave de hoje). Por evento só em conclusão, chave e contrato; **criar uma vistoria não publica evento**. Frescor de 1440 min |
| Sinaliza quando | DEGRADED com motivo `READ_MODEL_NAO_RECALCULADO` quando não há linha de hoje (`:17`). DEGRADED com motivo `CHAVE_SEM_DATA_PREVISTA` com uma única chave RELEASED em contrato ACTIVE sem `ends_at` (`:19`). Nos dois casos as dimensões também somem |
| Para sair | A agenda rodando hoje, e nenhuma chave liberada em contrato sem data de fim |
| Esperado | OK com as vistorias pendentes. Itens de atraso no bloco 5 |
| Registro mínimo | 1. Contrato `POST /api/v1/legal/contracts` com `{contractType:"LEASE_RESIDENTIAL"}` (em DRAFT já serve)<br>2. `POST /api/v1/legal/inspections` com `{propertyId, inspectionType:"ENTRY", contractId, scheduledAt:"<ontem>"}` (`legal.routes.js:145`; `inspection.service.js:52-75`)<br>O registro entra na passada seguinte da agenda (até cerca de 15 min) |

### 2.17 Oportunidades por estágio (`crm.opportunities_by_stage`)

| Item | Conteúdo |
|---|---|
| Fonte | `analytics.rm_crm_opportunity_stage` (`crm.opportunities` mais a última `crm.messages`) e `rm_crm_outcome` (`A/read-models/comercial-imoveis/opportunity-stage.js:21-25`) |
| O que entra | O Centro lê `paradas_qtd`: em aberto e sem movimento antes de 00:00 de São Paulo de (hoje − `analytics.centro.opp_parada_dias`, padrão 7) |
| Fórmula | `A/metrics/formulas/crmOpportunitiesByStage.js:20-52` |
| Período | Estágios abertos na posição atual. Fechadas contam pelo mês de `closed_at` em São Paulo |
| Atualização | Por evento e pela agenda de 15 min. Frescor de 1440 min |
| Sinaliza quando | DEGRADED com motivo `OPORTUNIDADE_SEM_ESTAGIO` (praticamente inalcançável pela API). Também INCOMPLETE por `sourceSnapshotAt` nulo (UNKNOWN) quando o read model nunca foi alimentado: este conjunto grava o snapshot mesmo assim (`A/metrics/kpis/crm.entries.js:36,45-46`). Também C5 (completude de `owner_user_id`) |
| Para sair | Um refresh do CRM hoje e o read model alimentado. Criar uma oportunidade basta |
| Esperado | OK com o total. "Paradas" só depois de N dias sem movimento |
| Registro mínimo | `POST /api/v1/opportunities` com `{personId, nextAction, nextActionDueAt}` (`opportunity.service.js:42-59`). **Uma oportunidade criada hoje só conta como parada depois de N+1 dias. Não há rota com data retroativa** |

---

## 3. "Integrações com erro" (`tec.integration_errors`) no BI de Tecnologia

### 3.1 A janela

| Pergunta | Resposta (código) |
|---|---|
| Duração | `analytics.tec.janela_minutos`, **padrão 60** (`A/read-models/tecnologiaKpi.settings.js:19,28`; catálogo em `Maturacao/demandas/parametros.csv:603`). O esquema aceita de 1 a 10080 (`:33`), mas **só há dado para 5, 60 e 1440**, as janelas que o agregador grava (`src/features/integrations/health/aggregateRunner.js:10`). Com outro valor, o read model não tem linha e o indicador fica INCOMPLETE para sempre (`A/metrics/kpis/tecnologia/rows.js:26-30`, filtro `window_minutes = :windowMinutes`) |
| Recorte | Baldes alinhados ao relógio UTC: `bucketStart = floor(epoch / duração)` (`aggregateRunner.js:14`). Com 60 min, o balde é a hora cheia. Como São Paulo está em UTC−3 sem horário de verão, a hora cheia de São Paulo coincide. Com 1440 min, o dia começa às **00:00 UTC = 21:00 de São Paulo** |
| Ponto de corte | A **última janela fechada** de cada conexão: `window_start + duração <= now` (`A/read-models/tecnologia/integrations.js:21-24`; DI-BI-5 nas linhas 10-11). `now` é o instante do recálculo do read model (`tecnologia/common.js:34-37`), feito a cada `analytics.tec.recalculo_min` (padrão 4, `tecnologia.settings.js:20,23`; job em `src/engines/jobs/analyticsTechRefreshJob.js:26-35`). Exemplo: às 14:20 de São Paulo, a janela usada é 13:00–14:00 |
| Idade da janela | **Não há limite de idade.** O `DISTINCT ON … ORDER BY window_start DESC` pega a última janela fechada que existir, por mais antiga que seja (`integrations.js:22-24`). Com o agregador ligado, ele grava uma linha por conexão ativa e por janela a cada passada, mesmo sem chamadas (`aggregateRunner.js:23-27`; a cada `integration.health.aggregate_interval_s`, padrão 60 s, `src/features/integrations/health/healthParams.js:7,15`; `src/engines/jobs/integrationHealthAggregateJob.js:23-33`) |
| Cobertura do balde | Cada passada regrava o balde corrente com as tentativas de `[início do balde, instante da passada]` (`aggregateRunner.js:24-26`). As tentativas que começam depois da última passada dentro da hora não entram no balde dessa hora. Pela leitura do código, isso pode deixar de fora até cerca de 1 intervalo do agregador (60 s) no fim de cada hora. **Observação, não testada** |
| Fuso | Instantes `timestamptz`. As datas da rota administrativa saem em horário de Brasília (`admin.format.js` `brtDeep`) |

### 3.2 De onde vêm as chamadas contadas

- **Chamadas** (`src/features/integrations/dispatch/quota/quota.sample.js:14-16,28`): linhas de **`integration.dispatch_attempts`** da conexão com:
  - `started_at` dentro do balde;
  - `outcome IS NOT NULL`;
  - `error_class <> 'VALIDATION'` (erro de dado nosso não conta).
- **Erros:** `outcome <> 'SUCCESS'`. O 429 conta como falha e também à parte, em `rate_limit_count`.
- **O que não vira chamada:** a caixa de webhooks (`integration.webhook_inbox`) só soma fila e DLQ (`src/features/integrations/health/inboxSample.js:11-18`).
- **Agregação** (`integrations.js:25-36`): por fornecedor, família e ambiente, só conexões `integration.connections.status = 'ACTIVE'`, juntando `integration.providers`. Soma `calls_total` em `calls` e `calls_failed` em `errors`.
- **Limite de erro por fornecedor:** 100 − sucesso mínimo do SLO da criticidade `integration.slo.<CRITICIDADE>` (`src/features/integrations/health/sloTargets.readRepository.js:9-15`). Padrões: CRITICAL 99,9%, HIGH 99,5%, MEDIUM 99,0%, LOW 95,0% (`sloParse.js:23-28`).
- **Quem cria `dispatch_attempts`:** só o worker de envio (`src/features/integrations/dispatch/worker/worker.attempts.js:8`), processando despachos que os módulos enfileiram. Exemplos: envio de mensagem do CRM, e-mail, NFS-e, seguros, social (`dispatch/enqueue/dispatch.service.js`).
  - **O "testar conexão" (`POST /api/v1/admin/integrations/:provider/test-connection`) não cria tentativa contada** (`testConnection.service.js`).

### 3.3 Amostra mínima e os três estados

Fórmula: `A/metrics/formulas/techIntegrationErrors.js:41-60`.

| Situação | O que acontece |
|---|---|
| **Janela vazia**: nenhuma conexão ACTIVE, nenhuma linha na duração configurada, ou soma de chamadas = 0 | `INCOMPLETE`, `value: null`, `details.reason: 'SEM_CHAMADAS'`, `dimensions: []` (`:45`; `_legalCorKpi.js:9,14,16`; caso de teste `:69`) |
| **Amostra insuficiente** | **Não existe amostra mínima além de 1 chamada.** Não há parâmetro de mínimo; procurei em `tecnologiaKpi.settings.js`, `tecnologia.settings.js` e na fórmula. Com 1 ou mais chamadas o resultado já é OK. Fornecedor com 0 chamadas fica fora da taxa e da contagem acima do limite (`:33-39`; caso de teste `:115`) |
| **Amostra suficiente** (1 chamada ou mais) | `OK`. `value` = erros ÷ chamadas × 100, com 2 casas, arredondado uma vez. Dimensões: `acima_do_slo_qtd`, `provider:<p>:chamadas_qtd`, `provider:<p>:erros_qtd`, `provider:<p>:erro_pct` e o quadro `quadro:<fornecedor>~<ambiente>~<família>:<medida>` (`:48-59`) |
| **Sem snapshot** (read model de Tecnologia nunca recalculado) | Não há snapshot, porque `snapshotAt` é nulo (`A/metrics/kpis/legalCor/kpiSet.js:83-84`; `tecnologia/rows.js:39-44`). O cartão mostra "Dado incompleto" com freshness UNKNOWN |
| **Frescor** | Limite de 5 min (`A/metrics/kpis/tecnologia/definitions.js:31`). Acima de 20 min sem recálculo, o estado é EXPIRED e o valor some |

### 3.4 De onde vem o texto "dados insuficientes"

- **No BI de Tecnologia** (painel `tech`, widget TABLE em `A/dashboards/panels/tech.panel.js:34-37`), com o indicador `incomplete`, o Front escreve exatamente "**A fonte deste indicador não trouxe dados suficientes para a data do painel.**" (`front-int2/lib/analytics/panelText.js:23`).
  - Esse ramo só é escolhido quando **não há check reprovado, não há herança, e a freshness não é UNKNOWN** (`panelText.js:16-23`).
  - Em outras palavras: o snapshot de hoje existe e foi gravado com status INCOMPLETE. Para este indicador, a única fórmula que produz INCOMPLETE é `SEM_CHAMADAS`.
  - Conclusão pelo código: **na última janela fechada de 60 min, a soma de chamadas de todas as conexões ACTIVE foi 0** (ou não havia conexão ACTIVE, ou a janela configurada não é 5, 60 nem 1440).
- **No painel de Saúde** (`health`), a área Tecnologia (`A/dashboards/health/health.areas.js:16`) fica CINZA "**Sem dados suficientes**" quando nenhum indicador da área tem dado atual (`A/dashboards/health/health.colors.js:8,11`; `health.service.js:36,65`).
- **No Centro de Comando** o texto seria "Dado incompleto" (bloco RISCO adiado).

### 3.5 Como comparar a origem com o valor do painel (GETs)

1. **Valor do indicador.** `GET /api/v1/analytics/metrics/tec.integration_errors` (`A/metrics/metrics.routes.js:24`; `query.service.js:50-73`).
   - Campos úteis: `status`, `value`, `valueReliable`, `freshness.state`, `sourceSnapshotAt`, `refreshedAt`, `quality.checks`.
   - E também `sourceRefs[0]`, que traz o filtro assinado (`filter.equals.tecWindow`, `filter.equals.tecClosedBy` = instante do read model), `filterHash`, `filterSignature` e `count`.
   - Com `?dimension=…` dá para ler uma dimensão (`query.params.js:10`).
   - `404 ANALYTICS_SNAPSHOT_NOT_AVAILABLE` significa sem snapshot hoje.
2. **Linhas de origem.** `GET /api/v1/analytics/metrics/tec.integration_errors/drilldown?filter=<JSON de sourceRefs[0].filter>&filterHash=…&filterSignature=…&pageSize=…` (`A/metrics/drilldown.routes.js:19-25`; `drilldown.service.js:73-106`).
   - Devolve `aggregate.count` (número de linhas de `integration.provider_health`, uma por conexão) e `rows` com as colunas `provider_code`, `connection_id`, `window_minutes`, `window_start`, `calls_total`, `calls_failed` (`A/metrics/sourceSpecs.tecnologia.js:47-49,68`).
   - A soma de `calls_total` é o denominador do painel. A origem aplica o mesmo critério de "última janela fechada de conexão ativa" (`sourceSpecs.tecnologia.js:28-33`).
   - Exige `analytics:drilldown` e a permissão do domínio.
3. **Série por fornecedor.** `GET /api/v1/admin/integrations/:provider/health?window=1h` (opcional `&environment=`; padrão `1h`) (`src/features/integrations/admin/admin.routes.js:16`; `admin.query.js:9-10,31-36`; `admin.health.js:16-21,35-44,50-76`; permissão `integration:read`).
   - Devolve `series[]` com as janelas de 60 min das últimas 24 h, cada uma com `windowStart`, `callsTotal`, `callsSuccess` e `callsFailed`.
   - **Compare a penúltima entrada** (a última fechada) com o painel.
   - Lista de fornecedores e conexões: `GET /api/v1/admin/integrations` (`admin.routes.js:13`).

Consulta equivalente, só para referência (não foi executada):

```sql
WITH last AS (SELECT DISTINCT ON (h.connection_id) h.* FROM integration.provider_health h
  WHERE h.company_id = :empresa AND h.window_minutes = 60 AND h.window_start + interval '60 min' <= now()
  ORDER BY h.connection_id, h.window_start DESC)
SELECT l.provider_code, l.window_start, l.calls_total, l.calls_failed
  FROM last l JOIN integration.connections c ON c.id = l.connection_id AND c.status = 'ACTIVE';
```

### 3.6 Registro mínimo para o indicador mostrar número

- **Condições:**
  - uma conexão ACTIVE;
  - o agregador ligado (`integrationHealthAggregateJob`);
  - pelo menos uma tentativa de envio por essa conexão, com resultado, dentro de uma hora cheia já encerrada.
- **Rota de negócio que gera uma tentativa:** por exemplo `POST /api/v1/messages/send` com `{kind:"text", personId|opportunityId|conversationId, to, text}` (`src/features/crm/crm.routes.js:80`; `src/features/crm/messages.schema.js:66-81`; obrigatório só `kind`).
  - O worker cria a linha em `dispatch_attempts`.
  - O número aparece depois que a hora fecha e o read model recalcula (até cerca de 4 min depois).
  - Não mapeei qual conector a conexão de homologação usa.

### 3.7 Parâmetros

| Chave | Padrão | Onde |
|---|---|---|
| `analytics.tec.janela_minutos` | 60 | `tecnologiaKpi.settings.js:19,28` |
| `analytics.tec.recalculo_min` | 4 | `tecnologia.settings.js:20,23` |
| `integration.health.aggregate_interval_s` | 60 | `healthParams.js:7,15`; `parametros.csv:326` |
| `integration.slo.<CRITICAL\|HIGH\|MEDIUM\|LOW>` | `99.9% / …`, `99.5% / …`, `99.0% / …`, `95.0% / …` | `sloParse.js:23-28` |
| `analytics.freshness.max_minutos.TECH_AI` | sem padrão próprio; vale o limite de 5 min da métrica | `A/metrics/freshness.js:32-38` |

Alteração: `PUT /api/v1/settings/:key` (`src/features/settings/settings.routes.js:43`).

### 3.8 Checks que podem sinalizar este indicador

Ficam em `A/quality/checks/rm_tech_integrations.checks.js:6-10`: freshness, reconciliação, a invariante "erros ≤ chamadas", completude de `family`, duplicidade, faixa de linhas e valores não negativos.

Se um deles reprovar, o Front escreve "Uma verificação de qualidade reprovou este número." (`panelText.js:20`), e não "dados suficientes".

---

## 4. Rotas GET para leitura ao vivo (usuário admin)

Base: `/api/v1`. O router do BI é montado em `src/routes/index.js:119` e as rotas estão em `A/routes.js:19-28`. Todo GET roda em transação somente leitura.

| Rota | Permissão | Uso |
|---|---|---|
| `GET /api/v1/analytics/dashboards/command_center` (aceita `?asOf=AAAA-MM-DD`, `?bloco=ACONTECEU\|DECISAO\|RISCO\|DINHEIRO\|PRAZOS\|OPORTUNIDADES`) | `analytics:read` (`A/dashboards/dashboard.catalog.js:26`) | Centro de Comando e briefing da NAY Diretoria (`A/dashboards/dashboard.routes.js:20-28`; `dashboard.service.js:39-46`; `query.params.js:11`) |
| `GET /api/v1/analytics/dashboards/tech` | `analytics:read:tech` (`dashboard.catalog.js:25`) | BI de Tecnologia |
| `GET /api/v1/analytics/dashboards/health` | `analytics:read` | Semáforo por área (CINZA "Sem dados suficientes") |
| `GET /api/v1/analytics/metrics/:code` | `analytics:read` + domínio | Um indicador por vez. Distingue: **404 `ANALYTICS_SNAPSHOT_NOT_AVAILABLE`** = sem snapshot hoje; **404 "Indicador não encontrado."** = não publicado; **200 com `status` INCOMPLETE/DEGRADED/STALE e `freshness.state`** = snapshot com problema |
| `GET /api/v1/analytics/metrics/:code/drilldown?filter&filterHash&filterSignature` | `analytics:drilldown` + domínio | Linhas de origem e `aggregate` |
| `GET /api/v1/admin/integrations/:provider/health?window=1h` | `integration:read` | Série de janelas das integrações |

### Campos da resposta do Centro de Comando

A resposta segue o envelope `success(res, { data })`.

**Em `data`:**
- `dashboardCode`, `version`, `asOfDate`, `period`, `generatedAt`;
- `quality: { summary: 'ATENCAO'|'OK', degradedMetrics[] }`;
- `widgets[]`;
- `blocks[]`;
- `brief`;
- `hidden: { count, text }`;
- `window: { from, to, hours }`;
- `maxItemsPerBlock`, `canReadAll` (`dashboard.service.js:42`; `commandCenter.service.js:108-111`).

**Faixa de qualidade:** é o widget `type: 'QUALITY_BANNER'`, com `banner: { summary, visible, message, degradedMetrics[] }`.
- Cada item de `degradedMetrics` tem `{ metricCode, title, problem: INCOMPLETE|DEGRADED|STALE|EXPIRED|UNKNOWN, reason, status, checks, inheritedFrom, detail, lastUpdateAt }` (`dashboard.banner.js:22-45`; `dashboard.banner.detail.js:14-19`).
- **`visible: true` e `degradedMetrics.length` correspondem aos "17 sinalizados".**

**Blocos:** são os widgets `type: 'COMMAND_BLOCK'`, com dois objetos:
- `block: { deferred, concludes, text, reasons[{ metricCode, name, problem, reason, lastUpdateAt }] }`;
- `command: { key, title, question, deferred, deferredText, reasons, items[], total, shown, hiddenCount, hiddenText, viewAllHref, totals? }` (`commandCenter.service.js:66-78`).
- `deferred: true` indica bloco adiado.
- Item com `metric: { metricCode, value, status, freshness }` (`commandCenter.service.js:43-48`).

### Campos da resposta do BI de Tecnologia

O widget do indicador traz `metric: { metricCode, value, formatted, status, incomplete, incompleteText: 'Dado incompleto', valueReliable, quality: { checks, degradedReasons, inheritedFrom }, freshness: { state, label, ageMinutes, sourceSnapshotAt, maxStalenessMinutes }, sourceSnapshotAt, refreshedAt, sourceRefs, drilldown }` (`A/dashboards/dashboard.metricView.js:38-62`), mais `view` e `drilldown.sourceRef`.

Leitura dos estados:
- **`incomplete: true` com `freshness.state != 'UNKNOWN'` e `quality.checks` vazio:** é o caso "dados suficientes" da seção 3.4.
- **`freshness.state: 'UNKNOWN'` com `version: null`:** não há snapshot (`dashboard.metricView.js:38-44`).

---

## 5. Não encontrado

| Assunto | Onde procurei |
|---|---|
| Executor do `cron` das políticas de métrica | `src/` inteiro; só aparece em validação |
| Amostra mínima configurável para qualquer um dos 17 | Fórmulas e arquivos `*.settings.js` |
| Rota que crie repasse, oportunidade ou movimento com data retroativa | `owner-repasses.service.js`, `opportunity.service.js`, buscas por `silent: true` e `bulkCreate` |
| Rota GET própria do briefing da NAY | `A/routes.js`; o briefing só sai dentro do `command_center` |
| Agenda (`scheduled`) para `rm_legal_cases_risk`, `rm_fin_commission`, `rm_project_cost`, `rm_project_measurements` e `rm_project_waste` | Registro de cada read model, conferido |
| Exigências documentais por tipo de contrato antes de SIGNING | Não mapeadas (`requirement.service.js`) |
| Conector das conexões de integração de homologação | Depende do banco; não lido |
