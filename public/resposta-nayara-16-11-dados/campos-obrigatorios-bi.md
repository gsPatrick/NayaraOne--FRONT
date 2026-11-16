# Campos de completude CRÍTICA do BI: a API e a tela deixam o registro sem o campo?

Levantamento feito em 16/11/2026, só lendo código, sem rodar nada. API em `wt/api-int2/src`, Front em `wt/front-int2/app`, cadernos em `Maturacao/MARCO_*_CADERNO_COMPLETO.md`.
Abreviações usadas nos caminhos: `API/` = `wt/api-int2/src/`, `FRONT/` = `wt/front-int2/app/`, `M3..M9` = `Maturacao/MARCO_N_CADERNO_COMPLETO.md`.

## 0. Como a verificação funciona (vale para todos os campos)

- **Medição**: cada verificação conta `nulls/total` na tabela de origem e arredonda o percentual para 2 casas (`API/features/analytics/quality/types/completeness.js:11-19`).
- **Ultrapassar o limite do campo NÃO bloqueia sozinho.** Até `max_nulos_bloqueio_pct` a falha é `COMPLETENESS` = **WARN** (gravada como WARNING, não degrada o indicador). Só acima desse limite vira `COMPLETENESS_BLOCK` = **BLOCK** (CRITICAL, degrada o KPI e aborta o rebuild): `types/completeness.js:18-19`, `quality.settings.js:36-39`, `quality.severity.js:8-11`, `quality.record.js:21`.
  - Limite do campo: padrão 1%, ou 0% para os campos que entram direto numa fórmula (`quality.settings.js:24-33`).
  - Limite de bloqueio: padrão 5% (`quality.settings.js:57`).
  - Exemplo: campo com limite 1% e 3% de nulos dá aviso. Com 6% de nulos, bloqueia. Campo com limite 0%: qualquer nulo dá aviso, e acima de 5% bloqueia.
- **Os limites são parâmetros do administrador, não constantes fixas.**
  - `analytics.qualidade.max_nulos_pct.<campo>` para cada campo, de 0 a 100: `quality.settings.js:98` (esquema) e `:120` (leitura). Valor ausente ou inválido volta ao padrão.
  - `analytics.qualidade.max_nulos_bloqueio_pct`: `quality.settings.js:92`.
  - `analytics.qualidade.severidades` permite rebaixar `COMPLETENESS_BLOCK` para WARN: `quality.settings.js:95` e `:72-80`.
  - A gravação é por `PUT /settings/:key` com a permissão `settings:update` (`API/features/settings/settings.routes.js:43`). A leitura é por empresa (`readQualityParams`, `quality.settings.js:105-122`).
  - Na tela, ficam em Configurações, aba "BI e Centro de Comando": `FRONT/painel/configuracoes/biQualidadeGroups.js:76-101` (bloqueio, `due_at`, `competence_month`, `result_center_id`) e `:3-40` + `:216-226` (os demais campos).
  - **Exceção:** `occurred_at` (item 17) está no dicionário da API (`quality.settings.js:32`), mas **não aparece na tela**, porque não está em `CAMPOS_ESSENCIAIS` (`biQualidadeGroups.js:3-40`). Só dá para mudar por `PUT /settings/analytics.qualidade.max_nulos_pct.occurred_at`.
- **A chave é por NOME de campo, não por verificação.** O mesmo parâmetro vale para várias verificações:
  - `due_at`: itens 14 e 16.
  - `cause_code`: as duas verificações do item 6.
  - `ends_at`: etapas de obra e garantias.
  - `contract_id`: vistorias e outras.
  - `closed_at`.
  - Não é possível afrouxar uma verificação sem afrouxar as outras que usam o mesmo campo.
- **O livro não fixa os números 1%, 0% e 5%.** O M9 só manda ter verificação de completude e marcar o KPI como DEGRADED (M9:836-838, BI-015 em M9:764). Os padrões vieram das decisões PD-126/PD-127/M9-D696 (`Maturacao/demandas/parametros.csv:572-573` e `:753-755`).

## 1. Tabela resumo

| # | Campo (verificação) | API exige? | Tela exige? | Livro exige? | Limite configurável? | Risco em produção |
|---|---|---|---|---|---|---|
| 1 | legal.legal_cases.risk_level | Não (opcional; aceita null na edição) | **Não há campo nenhum** (nem na criação nem na edição) | Sim (M5:244) | Sim (`max_nulos_pct.risk_level`, 1%) | **CERTO**: 100% dos processos criados pela tela ficam sem risco, então BLOCK |
| 2 | legal.legal_cases.estimated_amount | Não (opcional; aceita null na edição) | Não (a criação não envia; "Atualizar valores" é opcional e pode apagar) | Sim (M5:244 "valor"; M9:797) | Sim (`estimated_amount`, 1%) | **ALTO** |
| 3 | construction.project_stages.ends_at | Só para passar a IN_PROGRESS; depois pode ser apagado | Não ("Opcional") | Sim (M6:16 "prazo") | Sim (`ends_at`, 1%, compartilhado com garantias) | **ALTO** (etapas PENDING contam) |
| 4 | construction.projects.ends_at_planned | Só em READY→ACTIVE; depois pode ser apagado | Não ("Opcional") | Implícito (M6:11, M9:793 "cronograma"), sem campo explícito | Sim (`planned_end_date`, 1%) | **MÉDIO/ALTO** (obras PLANNED/BUDGETED/CANCELLED contam) |
| 5 | construction.maintenance_cases.root_cause_code | Só para fechar (CLOSED) | Só para fechar; a criação não envia | Sim (M6:26, M6:66, M6:144) | Sim (`root_cause_code`, 1%) | **ALTO** (chamados abertos contam) |
| 6 | construction.nonconformities.cause_code | Não; **não há edição**; o checklist nunca preenche | **Não há campo** | Não na NC (M6:22-23); só o KPI "recorrência por causa" (M9:794) | Sim (`cause_code`, 1%) | **CERTO**: 100% nulo, então BLOCK nas duas verificações |
| 7 | crm.opportunities.lead_source | Não | **Não há campo** | Não no M3; M9:610 (atribuição) e M9:784 ("Leads por origem") | Sim (`lead_source`, 1%) | **CERTO**: a tela, o WhatsApp e os parceiros criam sem origem |
| 8 | crm.opportunities.next_action (abertas) | **Sim** (422) | **Sim** | Sim (M3:39-40, M3:184, M3:746) | Sim (`next_action`, 1%) | BAIXO (só texto feito de espaços por API direta, ou legado) |
| 9 | crm.opportunities.closed_at (WON/LOST/WITHDRAWN) | Automático (o sistema grava) | N/A | Não explícito | Sim (`closed_at`, 1%) | BAIXO (só legado ou SQL direto) |
| 10 | inventory.inventory_items.average_cost (ACTIVE) | Não (a API nem aceita; só o recebimento grava) | Não há campo | Não no cadastro (M7:82: "entrada confirmada atualiza custo") | Sim (`item_cost`, 1%) | **ALTO** (todo item novo ou sem recebimento, e todo SERVICE_ITEM) |
| 11 | legal.inspections.contract_id | Não (opcional); **não há edição** | Não (o contrato é opcional) | Não (M5:203-212) | Sim (`contract_id`, 1%, compartilhado) | **MÉDIO/ALTO** |
| 12 | finance.owner_repasses.reference_month | **Sim** + CHECK no banco | **Sim** | Implícito (M4:210-220) | Sim (`reference_month`, 1%) | BAIXO (só linhas anteriores ao corte da migration 420) |
| 13 | legal.contracts.total_value (todos os contratos) | Não; a correção aceita null antes de APPROVED | Sim para o contrato principal; **opcional para termos e aditivos** | Não encontrado no M5 | Sim (`total_value`, **0%**) | **ALTO**: a verificação conta todos os tipos, e a própria tela deixa aditivo sem valor |
| 14 | finance.financial_entries.due_at (todo RECEIVABLE PENDING) | Não | Não (vencimento opcional; a cobrança de perda nunca envia) | Implícito (M4:310-314) | Sim (`due_at`, **0%**, compartilhado com o item 16) | **ALTO** |
| 15a | financial_entries.result_center_id (SETTLED) | Só para RECEIVABLE na criação; PAYABLE não exige; PATCH aceita null | Só para RECEIVABLE | Só para receita (M4:81-83) | Sim (`result_center_id`, 1%) | **ALTO** (toda despesa liquidada sem centro de resultado) |
| 15b | financial_entries.competence_month (SETTLED) | Sempre derivada (nunca nula pelo serviço) | N/A | Sim (FIN-007, M4:41-42) | Sim (`competence_month`, 0%) | BAIXO |
| 16 | financial_entries.due_at (PAYABLE/RECEIVABLE PENDING próprios) | Não (POST manual e perdas); repasse sem vencimento, mas é dinheiro de terceiro e fica **fora** da conta | Não | Implícito (M4:310-311) | Sim (`due_at`, 0%) | **ALTO** (manual e perdas; o excedente classificado como despesa também) |
| 17 | occurred_at (contrato assinado / WON / PAYABLE SETTLED) | Garantido pelos gates do contrato e pelo preenchimento automático | N/A | Não explícito (M9:771-773) | Sim pela API; **não está na tela** (`occurred_at`, 0%) | BAIXO (legado ou importação) |
| 18 | real_estate.property_price_history.old_price | **Toda oferta criada grava uma linha com old_price NULL** | N/A | M3:143 (a mudança de preço gera histórico) | Sim (`old_price`, 1%) | **CERTO**: quase toda empresa fica acima de 5%, então BLOCK |

"CERTO" quer dizer que o próprio uso normal pela tela gera os nulos. "ALTO" quer dizer que há caminho comum, pela tela ou por outro fluxo do sistema, que deixa o campo nulo.

---

## 2. Detalhe por campo

### 1. legal.legal_cases.risk_level (`legal_cases_risk_risk_level_completeness`)
- Consulta: todos os processos não excluídos, com `NULLIF(btrim(risk_level),'')` (`checks/rm_legal_cases_risk.checks.js:8`).
- (a) **Não é obrigatório.** `createLegalCase` exige só `groupId`, `companyId` e `caseType` (`API/modules/legal/cases/legal-case.service.js:77-80`). O risco só é validado quando informado (`:48-54`).
- (b) **Pode ser apagado.** `riskLevel: null` grava null (`:54`), aplicado em `updateLegalCase` (`:242`, `:248`). O PATCH não passa por esquema que impeça isso (`API/modules/legal/shared/legal.routes.js:183`).
- (c) **A tela não tem campo de risco.**
  - Criação: `FRONT/painel/contratos/processos/novo/page.js:54` (valida só número, tipo e resumo). O payload em `:65-72` não envia `riskLevel`.
  - Detalhe: só exibe o risco, e só se existir (`processos/[id]/page.js:148`). `riskLevel` não aparece em nenhuma outra tela fora do Financeiro e do Estoque.
- (d) **Sim.** M5:244, "Processo tem número, órgão, classe, status, partes, valor, risco e responsável." KPI "processos por risco" em M9:797.
- (e) Configurável: `analytics.qualidade.max_nulos_pct.risk_level` (padrão 1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:30`.
- **Risco: certo.** Todo processo aberto pela tela nasce e continua sem risco. Com qualquer processo cadastrado, o percentual é 100% e o resultado é BLOCK.

### 2. legal.legal_cases.estimated_amount (`legal_values_estimated_amount_completeness`)
- Consulta: todos os processos não excluídos (`checks/rm_legal_values.checks.js:8`).
- (a) **Não é obrigatório** (`legal-case.service.js:55-61`, só validado quando informado).
- (b) **Pode ser apagado.** `estimatedAmount: null` grava null (`:61`, aplicado em `:248`).
- (c) **Não.**
  - A criação não envia o campo (`processos/novo/page.js:65-72`).
  - O botão "Atualizar valores" é opcional, e campo vazio envia `null`, o que apaga o valor (`processos/[id]/CaseValuesForm.js:22`, `:30`).
- (d) **Sim.** M5:244 ("valor"), M5:250 ("Valores a receber ficam estimados") e M9:797 ("valores estimados/confirmados").
- (e) `max_nulos_pct.estimated_amount` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:17`.
- **Risco: alto.** O campo depende de uma segunda ação manual e opcional.

### 3. construction.project_stages.ends_at (`project_delays_ends_at_completeness`)
- Consulta: todas as etapas não excluídas, em qualquer status (`checks/rm_project_delays.checks.js:8`).
- (a) **Não é obrigatório na criação.** São exigidos só `groupId`, `companyId` e `name` (`API/features/construction/projectStages.service.js:67-70`), e grava `endsAt || null` (`:123`). Só é exigido na passagem para IN_PROGRESS (`:232-246`, em particular `:237`).
- (b) **Pode ser apagado depois.** `if (endsAt !== undefined) stage.endsAt = endsAt` (`:221`) não reconfere a regra quando a etapa já está IN_PROGRESS ou DONE.
- (c) **Não.**
  - O campo está marcado "Opcional" (`FRONT/painel/obras/lista/[id]/page.js:880`).
  - O botão exige só nome e sequência (`:827`).
  - Na edição, campo vazio envia `null` (`:279`) e apaga a data.
- (d) **Sim.** M6:16, "Etapas possuem dependências sem ciclos, prazo, progresso, custo e responsável."
- (e) `max_nulos_pct.ends_at` (1) em `quality.settings.js:28`, compartilhado com garantias (`biQualidadeGroups.js:16`).
- **Risco: alto.** Etapas ainda PENDING (planejamento) contam como nulas.

### 4. construction.projects.ends_at_planned (`project_progress_planned_end_date_completeness`)
- Consulta: todas as obras não excluídas, em qualquer status, inclusive PLANNED e CANCELLED (`checks/rm_project_progress.checks.js:8`).
- (a) **Não é obrigatório na criação** (`API/features/construction/projects.service.js:170-172`, grava `endsAtPlanned || null` em `:193`). Só é exigido em READY→ACTIVE (`:374-385`, em particular `:378`).
- (b) **Pode ser apagado depois**, inclusive com a obra ACTIVE. `if (endsAtPlanned !== undefined) project.endsAtPlanned = endsAtPlanned` (`:298`) não tem regra por status.
- (c) **Não.**
  - Criação: "Opcional" (`FRONT/painel/obras/lista/novo/page.js:177`); `isValid` exige só o nome (`:65`).
  - Edição: o helper diz "Opcional agora — obrigatório para iniciar a execução" (`lista/[id]/page.js:776`), e campo vazio envia `null` (`:222`).
- (d) Não há campo explícito para a obra nos cadernos: só "cronograma" (M6:11, M6:70) e o KPI "Progresso x cronograma" (M9:793). Para a etapa, o prazo é exigido em M6:16. O comentário do código cita outro documento, "TAB-0700 / Banco de Dados Físico BLINDADO" (`projects.service.js:366-373`), que não está nos cadernos.
- (e) `max_nulos_pct.planned_end_date` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:24`.
- **Risco: médio/alto.** Obras em planejamento e obras canceladas sem data entram na conta.

### 5. construction.maintenance_cases.root_cause_code (`postwork_cost_root_cause_code_completeness`)
- Consulta: todos os chamados não excluídos, **em qualquer status**, com `btrim` (`checks/rm_postwork_cost.checks.js:8`).
- (a) **Não é obrigatório na criação.** São exigidos só `groupId`, `companyId`, `propertyId` e `description` (`API/features/construction/maintenanceCases.service.js:176-181`). A causa é validada só quando vem (`:122-123`, `:234`). Só é exigida para fechar (`:362-366`).
- (b) **Pode ser apagado enquanto o chamado não está CLOSED** (`:396`). Com o chamado CLOSED, a remoção é recusada (`:380-388`, `maintenanceCaseClosedRules.js:16-29`).
- (c) **Não na criação.** `FRONT/painel/obras/pos-obra/novo/page.js:65-74` não envia `rootCauseCode`. Só o fechamento cobra o campo (`pos-obra/[id]/page.js:162`, `:222-228`).
- (d) **Sim.** M6:26 ("Pós-obra possui SLA, causa..."), M6:66 ("WarrantyCase contém ... causa") e M6:144 (`rootCauseCode`).
- (e) `max_nulos_pct.root_cause_code` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:31`.
- **Risco: alto.** Todo chamado aberto ou em atendimento ainda não tem causa (ela é apurada no atendimento), e a verificação os conta.

### 6. construction.nonconformities.cause_code (`project_nonconf_cause_code_completeness` e `project_occurrences_cause_code_completeness`)
- Consulta: a mesma nas duas verificações, todas as NCs não excluídas (`checks/rm_project_nonconformities.checks.js:8`, `checks/rm_project_occurrences.checks.js:8`).
- (a) **Não é obrigatório.** São exigidos só `groupId`, `companyId` e `description` (`API/features/construction/nonconformities.service.js:73-75`), e grava `causeCode ? ... : null` (`:139`).
  - A NC aberta automaticamente pelo checklist reprovado **nunca envia** `causeCode` (`qualityChecklist.service.js:178-189`).
- (b) **Não há como preencher depois.** `causeCode` só aparece na criação (`nonconformities.service.js:69`, `:139`); não existe update da NC, e `closeNonconformity` (`:187`) não recebe causa.
- (c) **Não há campo.** `FRONT/painel/obras/lista/[id]/qualidade/page.js:295-302` não envia `causeCode`, e `causeCode` não aparece em nenhum arquivo do Front.
- (d) **Não para a NC.** M6:22-23 exige "severidade, responsável, SLA, evidência antes/depois e aceite", sem causa. O livro pede só o KPI "recorrência por causa/equipe/material" (M9:794).
- (e) `max_nulos_pct.cause_code` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:7`. As duas verificações usam a mesma chave.
- **Risco: certo.** Pela tela e pelo checklist, 100% das NCs ficam sem causa, então as duas verificações dão BLOCK.

### 7. crm.opportunities.lead_source (`crm_lead_daily_lead_source_completeness`)
- Consulta: todas as oportunidades não excluídas, com `btrim` (`checks/rm_crm_lead_daily.checks.js:8`).
- (a) **Não é obrigatório.**
  - `createOpportunity` exige `groupId`, `companyId` e `personId` (`API/features/crm/opportunity.service.js:42-44`).
  - A origem só é gravada `if (payload.leadSource)` (`:113-121`, que grava a coluna em `features/marketing/tracking/tracking.events.repository.js:63`).
  - O esquema da porta trata o campo como opcional (`opportunities.schema.js:24`).
- Outros criadores que **não** enviam `leadSource`:
  - Contato novo pelo WhatsApp: `features/crm/messaging/messaging.sender.js:43-46`.
  - Lead de parceiro pela API externa: `features/core-governance/api-governance/clients/external.leads.js:49-52`.
  - Proposta importada do BCP: `features/core-governance/bcp/import/adapters/proposal.js:21-24`.
  - Envia origem: o lead importado do BCP (`adapters/lead.js:22-25`).
- (b) A edição (`opportunity.service.js:163`) não mexe em `lead_source`, então não apaga. Também não existe rota para preencher a origem depois.
- (c) **Não há campo.** O formulário "Nova oportunidade" envia `stage`, `personId`, `propertyId`, `ownerUserId`, `nextAction` e `nextActionDueAt` (`FRONT/painel/crm/page.js:808-815`). `leadSource` não aparece em nenhum arquivo do Front.
- (d) Não no M3 (o funil está em M3:165-180, sem origem obrigatória). M9:610 ("Lead source, campaign_id, tracking_link e attribution events") e o KPI "Leads por origem" (M9:784).
- (e) `max_nulos_pct.lead_source` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:20`.
- **Risco: certo.** A tela e o WhatsApp geram 100% de oportunidades sem origem.

### 8. crm.opportunities.next_action, oportunidades abertas (`crm_next_action_next_action_completeness`)
- Consulta: `stage NOT IN ('WON','LOST','WITHDRAWN')`, com `btrim` (`checks/rm_crm_next_action.checks.js:8`).
- (a) **Sim.** `assertNextActionWhenActive` responde 422 sem `nextAction`/`nextActionDueAt` (`API/features/crm/opportunityNextAction.validator.js:23-31`), chamado na criação (`opportunity.service.js:59`).
- (b) **Não pode ser apagado.** A edição usa o mesmo validador (`opportunity.service.js:167-170`).
  - Brecha mínima: o validador testa `!nextAction` sem `trim`, então um texto feito só de espaços enviado direto à API passa, e a verificação (com `btrim`) o conta como nulo.
  - Os criadores automáticos (WhatsApp, parceiros, BCP) sempre preenchem.
- (c) **Sim.** Criação: `FRONT/painel/crm/page.js:794-796`. Edição: faz `trim` e envia `null` (`crm/opportunityEditPatch.js:26`), e a API recusa.
- (d) **Sim.** M3:39-40 (CRMX-006), M3:184 e M3:746.
- (e) `max_nulos_pct.next_action` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:21`.
- **Risco: baixo.** Só legado ou chamada direta com espaços. O seed de ensaio `features/marketing/publications/drill/drill.cases.webhook.js:86` grava sem próxima ação, mas roda "na transação do ensaio".

### 9. crm.opportunities.closed_at, WON/LOST/WITHDRAWN (`crm_outcome_closed_at_completeness`)
- (a) **É automático.** Na criação: `closedAt: CLOSED_STAGES.includes(stage) ? new Date() : null` (`opportunity.service.js:85`). Na edição: grava ao entrar no desfecho e limpa ao sair (`:208-212`). `closedAt` não vem do payload.
- (b) Não pode ser apagado enquanto a oportunidade está no desfecho.
- (c) N/A (a tela não envia o campo).
- (d) Não há exigência explícita. O funil está em M3:176-177.
- (e) `max_nulos_pct.closed_at` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:9`.
- **Risco: baixo.** Só legado ou SQL direto.

### 10. inventory.inventory_items.average_cost, itens ACTIVE (`inventory_health_item_cost_completeness`)
- Consulta: itens não excluídos com `status = 'ACTIVE'` (`checks/rm_inventory_health.checks.js:8`).
- (a) **Não é obrigatório.** `createItem` nem aceita o custo: grava sem `averageCost`, e o status nasce ACTIVE (`API/features/inventory/items.service.js:17-57`; `models/InventoryItem.js:64-73`).
  - O único lugar do código que escreve `averageCost` é o recebimento de compra (`features/inventory/receipts.service.js:215`).
  - Ficam nulos: todo item recém-cadastrado, todo item que só recebeu entrada por ajuste ou movimento, e todo `SERVICE_ITEM` (sem saldo físico).
- (b) Não há como apagar, mas também não há como informar.
- (c) Não há campo. A criação está em `FRONT/painel/estoque/page.js:107-113`, e a lista mostra "Sem custo registrado" (`:252`).
- (d) Não no cadastro. M7:82, "Entrada confirmada atualiza saldo e custo". O custo nasce da entrada.
- (e) `max_nulos_pct.item_cost` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:19`.
- **Risco: alto.** Basta o catálogo ter mais de 5% de itens ativos sem nenhum recebimento.

### 11. legal.inspections.contract_id (`rental_insp_keys_contract_id_completeness`)
- Consulta: **todas** as vistorias não excluídas (`checks/rm_rental_inspections_keys.checks.js:8`). O read model conta só as vistorias de contratos de locação (`features/analytics/read-models/locacao/inspections-keys.js:15-24`).
- (a) **Não é obrigatório.**
  - São exigidos `propertyId` e `inspectionType` (`API/modules/legal/inspections/inspection.service.js:52-54`), e `contractId` é `optional: true` (`:61`, gravado como `contractId || null` em `:71`).
  - O livro tem vistoria FINAL de casa nova (M5:148), que não tem contrato de locação.
- (b) **Não existe rota de edição** de vistoria (`modules/legal/shared/legal.routes.js:145-162`). A revisão copia o contrato da original (`inspection.service.js:715`). Vistoria criada sem contrato fica sem contrato para sempre.
- (c) **Não.** `FRONT/painel/contratos/vistorias/novo/page.js:68` exige imóvel, tipo e data, e envia `contractId || undefined` (`:117`).
- (d) **Não.** M5:203-212 (tipo, itens, fotos e assinatura, sem contrato obrigatório).
- (e) `max_nulos_pct.contract_id` (1) em `quality.settings.js:28`, compartilhado com exigências e obrigações (`biQualidadeGroups.js:11`).
- **Risco: médio/alto.** Toda vistoria de entrega de obra, de captação ou sem contrato entra como nula.

### 12. finance.owner_repasses.reference_month (`rental_repasses_reference_month_completeness`)
- (a) **Sim.**
  - `FINANCE_OWNER_REPASSE_PERIOD_REQUIRED` (`API/modules/finance/application/services/owner-repasses.service.js:90-92`).
  - CHECK no banco: `owner_repasses_period_required_ck` (`modules/finance/infrastructure/db/migrations/20260101000420-...js:51-54`), que isenta só as linhas `created_at <` o instante da migration (`:20-23`).
- (b) Não há edição do período, e a aprovação também recusa repasse sem período (`owner-repasses.service.js:245-247`).
- (c) **Sim.** `FRONT/painel/financeiro/comissoes-repasses/page.js:612`, `:618`.
- (d) Implícito. M4:210-220 (o repasse é por contrato/regra e tem extrato); o código cita "§12, Frente 3".
- (e) `max_nulos_pct.reference_month` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:28`.
- **Risco: baixo.** Só repasses anteriores à migration 420. A consulta não filtra exclusão nem status.

### 13. legal.contracts.total_value (`rental_contracts_total_value_completeness`)
- Consulta: **todos** os contratos não excluídos, de qualquer tipo e status, inclusive DRAFT, aditivos, venda e empreitada (`checks/rm_rental_contracts.checks.js:8`).
  - O read model, porém, considera só os tipos de locação (`read-models/locacao/contracts.js:23`) e já trata contrato sem valor (`without_rent`, `:26`).
  - Limite: **0%**.
- (a) **Não é obrigatório.** `createContract` exige `groupId`, `companyId` e `contractType` (`API/modules/legal/contracts/application/contract.service.js:323-327`), e grava `totalValue` ou null (`:376`). A assinatura e a ativação não conferem valor (`:214-243`, `:478-482`).
- (b) **Pode ser anulado** por `correctContractData` enquanto o contrato não chega a APPROVED. `totalValue` é campo corrigível (`:710`), o bloqueio só vale de APPROVED em diante (`:711-712`, `:742`), e `null` é aceito (`:763`).
- (c) Sim para o contrato principal (`FRONT/painel/contratos/lista/novo/page.js:100`, valor > 0). **Opcional para termos e aditivos** (`:99` e `:299`: "Opcional para termos e aditivos").
- (d) Não encontrado: o M5 não exige valor do contrato (busquei "valor", "total" e "value" no M5; só aparecem M5:175, 228, 244 e 250, que tratam de outros assuntos). O KPI M9:789 "Contratos ativos" é contagem.
- (e) `max_nulos_pct.total_value` (**0**) em `quality.settings.js:27`, e na tela em `biQualidadeGroups.js:39`.
- **Risco: alto.** Qualquer aditivo ou termo sem valor já reprova (0%); acima de 5% dos contratos, BLOCK. Além disso, a verificação mede uma população maior do que a do indicador.

### 14. finance.financial_entries.due_at, cobrança de locação (`rental_arrears_due_at_completeness`)
- Consulta: **todo** `RECEIVABLE` com `status='PENDING'` da empresa, não só locação, e incluindo dinheiro de terceiros e estornos (`checks/rm_rental_arrears.checks.js:8`). O read model separa o que é locação (`read-models/locacao/arrears.js:27-30`). Limite: **0%**.
- (a) **Não é obrigatório.** `assertReasonableDueDate` retorna sem erro quando não há data (`API/modules/finance/application/services/financial-entry.service.js:39-40`), e a gravação é `dueAt || null` (`:126`). O esquema da porta só confere o tipo (`modules/finance/presentation/http/finance.input.schema.js:21`).
- Criadores de recebível PENDING sem vencimento:
  - `POST /finance/entries` manual (`finance.routes.js:39`).
  - Cobrança de perda de estoque: `chargeDueAt` opcional (`API/features/inventory/lossCases.service.js:256-283`, `:293`, `:483`; `inventory.controller.js:247-249`).
  - Os demais fluxos de recebível enviam data: aluguel garantido, antecipação, consumo, seguro, baixa de ativo, comissão do correspondente e processo (`legalCaseReceivables.service.js:50` exige).
- (b) **Pode ser apagado.** `PATCH /finance/entries/:id` com `dueAt: null` grava null (`financial-entry.service.js:211`, `:270`). Na tela, a edição envia `undefined` quando o campo está vazio (`FRONT/painel/financeiro/lancamentos/[id]/useEntryEdit.js:39`), então pela tela não apaga.
- (c) **Não.**
  - "Vencimento" não é obrigatório: `FRONT/painel/financeiro/lancamentos/novo/page.js:127-136` (o `isValid` não cobra o campo) e `:274-276`.
  - A tela de perdas **nunca envia** `chargeDueAt` (`FRONT/painel/estoque/perdas/page.js:189-190`).
- (d) Implícito. M4:311 ("Recebíveis 7/30/60 dias") e M4:314 ("Inadimplência: Vencidos/total elegível"), sem regra explícita de vencimento obrigatório.
- (e) `max_nulos_pct.due_at` (**0**) em `quality.settings.js:25`, e na tela em `biQualidadeGroups.js:83-88`. É a mesma chave do item 16.
- **Risco: alto.**

### 15. finance.financial_entries.result_center_id e competence_month em SETTLED (`sector_margin_center_completeness` e `sector_margin_competence_completeness`)
- Consulta: `status='SETTLED' AND nature IN ('RECEIVABLE','PAYABLE')`, próprio e não estorno (`checks/rm_finance_sector_margin.checks.js:28-32`, `:45-46`).
- **result_center_id**
  - (a) Exigido **só para RECEIVABLE** (`financial-entry.service.js:86-88`). **PAYABLE não exige** (`:83-85` cobra só o centro de custo), e nenhum fluxo automático de despesa envia centro de resultado: medição, compra, seguro, garantia, repasse e BCP (conferido nos chamadores de `createFinancialEntry`).
  - Excedente de recebimento classificado como receita: nasce com `resultCenterId: null` (`modules/finance/domain/ledger-movement.js:152`) e vira `RECEIVABLE SETTLED` sem centro (`classification-pending.service.js:76-82`).
  - (b) **Pode ser anulado** por PATCH, inclusive em RECEIVABLE PENDING, sem nova conferência (`financial-entry.service.js:269`). A tela não apaga (`useEntryEdit.js:38` envia `undefined`).
  - (c) Só para RECEIVABLE: `lancamentos/novo/page.js:126` e `:331`. Para PAYABLE só se cobra o centro de custo (`:125`, `:316`).
  - (d) M4:81 ("Centro de custo obrigatório para despesa") e M4:83 ("Centro de resultado obrigatório para receita e análise de margem"). O livro **não** exige centro de resultado na despesa. Margem por setor: M4:312, "Receita realizada - custos atribuídos".
  - (e) `max_nulos_pct.result_center_id` (1) em `quality.settings.js:25`, e na tela em `biQualidadeGroups.js:97-101`.
  - **Risco: alto.** Toda despesa liquidada fica sem centro de resultado. Se as despesas forem mais de 5% das liquidações, o resultado é BLOCK.
- **competence_month**
  - (a/b) Nunca fica nula pelo serviço: é a informada ou a derivada do vencimento, ou de "agora" (`competence-guard.js:32-44`, `domain/financial-entry.js:57-60`, `financial-entry.service.js:78`). No PATCH, `null` também cai na derivação (`:224-225`). As baixas filhas e os estornos copiam a do original (`ledger-movement.js:120`, `:192`).
  - (c) N/A. (d) M4:41-42 (FIN-007, competência x caixa). (e) `max_nulos_pct.competence_month` (0) em `quality.settings.js:25`, e na tela em `biQualidadeGroups.js:90-95`.
  - **Risco: baixo** (só legado ou SQL direto).

### 16. finance.financial_entries.due_at em PAYABLE/RECEIVABLE PENDING próprios (`finance_health_due_date_completeness`)
- Consulta: `status='PENDING' AND nature IN ('PAYABLE','RECEIVABLE')`, sem dinheiro de terceiros, sem estorno e só linha do ledger (`checks/rm_finance_health.checks.js:19`, `:118-122`). Limite: 0%.
- **POST /finance/entries manual**: (a) não exige (`financial-entry.service.js:39-40`, `:126`); (b) o PATCH aceita null (`:270`); (c) a tela não exige (`lancamentos/novo/page.js:127-136`).
- **Cobrança de perda de estoque (lossCases)**: (a) `chargeDueAt` é opcional (`lossCases.service.js:277`, `:293`, `:483`). Gera `RECEIVABLE` próprio, que **entra** na conta. (c) A tela **nunca** envia vencimento (`estoque/perdas/page.js:189-190`). Toda cobrança de perda pela tela nasce sem vencimento.
- **Repasse ao proprietário (owner-repasses)**:
  - (a) A aprovação grava `dueAt: (payload && payload.dueAt) || null` (`owner-repasses.service.js:273`), e a tela não envia `dueAt` (`FRONT/painel/financeiro/comissoes-repasses/page.js:222-224`). Todo repasse aprovado gera PAYABLE sem vencimento.
  - Porém o lançamento é criado com `isThirdPartyFunds: true` (`owner-repasses.service.js:277`), e a verificação exclui `is_third_party_funds` (`rm_finance_health.checks.js:19`). **Ele não reprova esta verificação**, nem a do item 14, que é só RECEIVABLE.
  - O dado continua sem vencimento: o repasse também fica fora de "contas 7/30/60".
- **Achado extra, fora do pedido**: o excedente de recebimento classificado como **despesa** vira `PAYABLE PENDING` com `dueAt: null` (`ledger-movement.js:161` e `classification-pending.service.js:76-79`, que não define vencimento) e entra na conta.
- (d) Implícito. M4:310-311 (contas e recebíveis 7/30/60). (e) `max_nulos_pct.due_at` (0) em `quality.settings.js:25`, e na tela em `biQualidadeGroups.js:83-88`.
- **Risco: alto** (lançamento manual, perdas e excedente).

### 17. occurred_at do Centro de Comando (`command_events_occurred_at_completeness`)
- Consulta (`checks/rm_command_events.checks.js:22-29`), com três partes:
  1. Contratos em SIGNED, ACTIVE, SUSPENDED, TERMINATED ou CLOSED sem nenhuma assinatura `SIGNED` com `signed_at`, em qualquer versão.
  2. Oportunidades WON sem `closed_at`.
  3. PAYABLE DEBIT SETTLED, não estorno, sem `settled_at`.
- **Contratos**:
  - (a) A transição para SIGNED exige todas as assinaturas SIGNED das partes obrigatórias na versão vigente (`contract.service.js:214-243`, chamado em `:478-479`). A máquina de estados obriga a passar por SIGNED (`contracts/domain/contract-state-machine.js:10-21`).
  - Toda assinatura confirmada grava `signedAt` (`signatures/signature.service.js:131-132`). O fluxo manual também grava (`signatures/framework/signature.manual.js:18`).
  - Aditivo é entidade separada (`contract_amendments`) e não entra nesta consulta.
- **Oportunidade WON**: o `closedAt` é automático (item 9).
- **PAYABLE SETTLED**:
  - Liquidação total: `entry.settledAt = settledAtOf(options)` (`receipt.service.js:72-74`).
  - Baixa parcial que zera o saldo: `receipt.service.js:174`.
  - Baixas filhas e estornos: `ledger-movement.js:121`, `:194`.
  - A migration de reparo usa `COALESCE`: `ledger-ddl-m4lr.data.js:176`.
- (b) Nenhum destes campos é editável.
- (c) N/A. (d) Não há campo explícito; o Centro de Comando está em M9:771-773.
- (e) `max_nulos_pct.occurred_at` (0) em `quality.settings.js:32`. **Configurável só pela API, não está na tela** (ausente de `biQualidadeGroups.js:3-40`).
- **Risco: baixo.** Só legado, importação ou SQL direto. Contrato legado em ACTIVE criado antes dos gates pode reprovar com 0% e passar de 5% se for uma parcela grande.

### 18. real_estate.property_price_history.old_price (`price_changes_old_price_completeness`)
- Consulta: **todas** as linhas do histórico da empresa (`checks/rm_property_price_changes.checks.js:8`).
- **Quem grava e quando o old_price fica nulo:**
  - Só `recordPriceHistory` (`API/features/properties/propertyPriceHistory.service.js:13-36`) grava, com `oldPrice` ou null (`:22`). Ela é chamada em dois pontos de `propertyOffers.service.js`:
    1. **Criação de oferta** (`POST /properties/:id/offers`, `properties.routes.js:27`): grava a linha com `oldPrice: null` e `reasonCode: 'OFFER_CREATED'` (`propertyOffers.service.js:117-127`, em particular `:122` e `:124`). **Sempre nula, por desenho.**
    2. **Mudança de preço da oferta** (`PATCH /properties/:id/offers/:offerId`, `properties.routes.js:29`): grava `oldPrice: offer.askingPrice` (`propertyOffers.service.js:225-236`, `:230`). Fica nula só se a oferta não tinha preço, mas `askingPrice` é obrigatório na criação (`:60-61`).
  - O read model trata a linha sem preço anterior (variação só com `old_price > 0`; `read-models/comercial-imoveis/price-changes.js:24-26`).
- (a) N/A: o próprio sistema grava null na criação de cada oferta. (b) A tabela é append-only, sem edição.
- (c) N/A.
- (d) M3:143 ("Alteração de preço gera history + event") e M3:75 (a tabela existe). O livro não fala da linha de criação.
- (e) `max_nulos_pct.old_price` (1) em `quality.settings.js:28`, e na tela em `biQualidadeGroups.js:22`.
- **Risco: certo.** O percentual de nulos é (ofertas criadas) / (ofertas criadas + mudanças de preço). Só ficaria abaixo de 5% com cerca de 19 mudanças de preço por oferta criada. Na prática a verificação dá BLOCK permanente.

---

## 3. Padrão encontrado: a verificação mede mais do que o indicador usa

Em vários casos a consulta de completude tem um escopo maior do que o read model que ela protege. Por isso ela reprova com dados que estão corretos pelas regras do sistema:

- **Item 13**: conta todos os contratos, mas o KPI é só locação.
- **Item 14**: conta todo recebível pendente, mas o KPI é só locação e só dinheiro próprio.
- **Item 11**: conta todas as vistorias, mas o KPI é só de contratos de locação.
- **Item 5**: conta chamados abertos, que ainda não têm causa por natureza.
- **Item 18**: conta a linha de criação da oferta, que não tem preço anterior por definição.
- **Item 4**: conta obras canceladas e em planejamento.
- **Item 3**: conta etapas PENDING.
- **Item 15a**: cobra centro de resultado na despesa, que o livro não exige (M4:81-83).

Como a severidade só vira BLOCK acima de 5% (configurável), estes itens dão BLOCK em produção assim que a fatia desses registros passar de 5%. Nos itens 1, 6, 7 e 18 isso acontece desde o primeiro cadastro feito pela tela.
