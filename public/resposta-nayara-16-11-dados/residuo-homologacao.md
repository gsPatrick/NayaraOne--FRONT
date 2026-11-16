# Resíduo de teste na homologação que trava indicadores do BI

Gerado em 16/11/2026, 19:16:33 (horário de Brasília), empresa A (`110723f9-4ad2-45fb-b6ec-1f2631821f32`), **somente leitura**: nada foi apagado nem alterado (decisão do Patrick, 16/11/2026: "não apague, só documente tudo detalhadamente").

## O que está acontecendo

O BI do Marco 9 roda verificações de qualidade a cada atualização dos read models (M9-D696/D697). Uma verificação de completude **crítica** reprova quando a parcela de registros de origem sem um campo obrigatório passa do limite (por exemplo, `maxNullPct` 1% e bloqueio acima de 5%). Reprovada, ela **bloqueia a atualização** (`ANALYTICS_QUALITY_BLOCKED`): o read model mantém o último retrato bom e os indicadores ligados a ele ficam "conclusão adiada" no Centro de Comando. É a regra do livro: dado ruim não vira número para decisão.

Na homologação, os registros que faltam esses campos foram criados pelas baterias de teste e auditorias de setembro e outubro (quando parte da suíte ainda rodava contra este banco), pelas contas de teste `@nayaraone.dev` e por rotinas do sistema. Nenhum foi criado por usuário real da Nayara.

**Atenção:** o bloqueio só ocorre acima de 5% de registros sem o campo (`analytics.qualidade.max_nulos_bloqueio_pct`); entre o limite do campo e 5% a verificação só avisa. Os limites são parâmetros do administrador (Configurações > BI e Centro de Comando).

## Resumo

- Verificações de completude reprovadas: **21**
- Registros de origem sem o campo obrigatório: **1938** (a quantidade listada bate, em todas as verificações, com a contagem gravada pela própria verificação)
- criado por conta de teste: 579
- resíduo de teste (marca no nome): 1300
- sem autor (rotina/seed): 59

| Verificação | Read model | Campo que falta | Registros sem o campo / total | Indicadores afetados | Classificação |
|---|---|---|---|---|---|
| `command_events_occurred_at_completeness` | `rm_command_events` | occurred_at (data do fato) | 79 de 185 (42.7%) | Contratos assinados, Oportunidades ganhas, Pagamentos acima do valor relevante (Centro de Comando, bloco "O que aconteceu") | 79 criado por conta de teste |
| `crm_lead_daily_lead_source_completeness` | `rm_crm_lead_daily` | lead_source | 119 de 119 (100%) | Leads por origem, Tempo da primeira resposta | 119 criado por conta de teste |
| `crm_next_action_next_action_completeness` | `rm_crm_next_action` | next_action | 44 de 100 (44%) | Carteira sem próxima ação | 44 criado por conta de teste |
| `crm_outcome_closed_at_completeness` | `rm_crm_outcome` | closed_at | 2 de 19 (10.53%) | Oportunidades ganhas, Motivos de perda, Taxa de conversão | 2 criado por conta de teste |
| `finance_health_due_date_completeness` | `rm_finance_health` | due_at (vencimento) | 335 de 506 (66.21%) | Contas a pagar/receber em 30 dias (e, por bloquear o read model, Inadimplência e Contas a pagar em 7 dias no Centro de Comando) | 210 resíduo de teste (marca no nome); 121 criado por conta de teste; 4 sem autor (rotina/seed) |
| `intercompany_due_date_completeness` | `rm_finance_intercompany` | due_at (vencimento da perna de saída) | 1 de 1 (100%) | Caixa livre (operações entre empresas) | 1 resíduo de teste (marca no nome) |
| `sector_margin_center_completeness` | `rm_finance_sector_margin` | result_center_id (centro de resultado) | 185 de 317 (58.36%) | Margem por setor | 169 resíduo de teste (marca no nome); 16 criado por conta de teste |
| `sector_margin_competence_completeness` | `rm_finance_sector_margin` | competence_month (mês de competência) | 23 de 317 (7.26%) | Margem por setor | 23 resíduo de teste (marca no nome) |
| `inventory_health_item_cost_completeness` | `rm_inventory_health` | item_cost | 16 de 44 (36.36%) | Valor de estoque, Abaixo do mínimo, Perdas de estoque | 16 resíduo de teste (marca no nome) |
| `legal_cases_risk_risk_level_completeness` | `rm_legal_cases_risk` | risk_level | 24 de 24 (100%) | Processos por risco | 21 resíduo de teste (marca no nome); 3 criado por conta de teste |
| `legal_values_estimated_amount_completeness` | `rm_legal_values` | estimated_amount | 24 de 24 (100%) | Valores dos processos | 21 resíduo de teste (marca no nome); 3 criado por conta de teste |
| `postwork_cost_root_cause_code_completeness` | `rm_postwork_cost` | root_cause_code | 121 de 124 (97.58%) | Custo pós-obra | 121 resíduo de teste (marca no nome) |
| `project_delays_ends_at_completeness` | `rm_project_delays` | ends_at | 354 de 358 (98.88%) | Atrasos | 82 criado por conta de teste; 272 resíduo de teste (marca no nome) |
| `project_nonconf_cause_code_completeness` | `rm_project_nonconformities` | cause_code | 15 de 15 (100%) | Não conformidades, Reincidência | 13 resíduo de teste (marca no nome); 2 criado por conta de teste |
| `project_occurrences_cause_code_completeness` | `rm_project_occurrences` | cause_code | 15 de 15 (100%) | Reincidência | 13 resíduo de teste (marca no nome); 2 criado por conta de teste |
| `project_progress_planned_end_date_completeness` | `rm_project_progress` | planned_end_date | 436 de 441 (98.87%) | Avanço x cronograma, Linha de base x realizado x previsão | 361 resíduo de teste (marca no nome); 75 criado por conta de teste |
| `price_changes_old_price_completeness` | `rm_property_price_changes` | old_price | 51 de 53 (96.23%) | Alterações de preço de imóveis | 51 sem autor (rotina/seed) |
| `rental_arrears_due_at_completeness` | `rm_rental_arrears` | due_at | 37 de 73 (50.68%) | Inadimplência da locação | 33 resíduo de teste (marca no nome); 4 sem autor (rotina/seed) |
| `rental_contracts_total_value_completeness` | `rm_rental_contracts` | total_value | 23 de 226 (10.18%) | Contratos de locação ativos | 23 criado por conta de teste |
| `rental_insp_keys_contract_id_completeness` | `rm_rental_inspections_keys` | contract_id | 8 de 34 (23.53%) | Vistorias e chaves | 8 criado por conta de teste |
| `rental_repasses_reference_month_completeness` | `rm_rental_repasses` | reference_month | 26 de 33 (78.79%) | Repasses, Repasses pendentes ao proprietário | 26 resíduo de teste (marca no nome) |

## Resíduo de teste ou falha do produto?

Não é só resíduo. A conferência campo a campo do código (`campos-obrigatorios-bi.md`, mesma pasta) mostra três situações:
- **Defeito já corrigido:** contas a pagar geradas pelo sistema sem vencimento (medição aprovada, recebimento de compra, resolução de garantia). Agora nascem com vencimento de parâmetro do administrador (padrão 30 dias). As contas antigas listadas abaixo ficam como estão.
- **Bloqueariam também em produção** (a API ou a tela deixam o campo vazio no uso normal): risco do processo (o livro exige e a tela não tem o campo), causa da não conformidade, origem do lead, preço anterior na criação da oferta, e outros listados no documento de campos. Esses estão em correção.
- **Só resíduo de teste** (a API já exige ou grava o campo; sobram registros antigos): próxima ação, data de fechamento, mês de referência, mês de competência e data do fato.

## Lista completa por verificação

### `command_events_occurred_at_completeness` (rm_command_events)

Campo: occurred_at (data do fato). Última execução: 10/11/2026, 19:17:23. Contagem da verificação: {"pct":42.7,"nulls":79,"total":185}; limite: {"field":"occurred_at","maxNullPct":0,"blockAbovePct":5}. Listados: 79 (bate).

Origem: `legal.contracts (contrato assinado sem assinatura com data)` — 79 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `8650fd92-800c-4da0-9d4a-225f1e88e8d1` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `00e856b3-2a22-4b98-b9b7-aaa4c6dd9a87` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a7a38d02-cc40-434e-b386-4cc3c0c6e4a4` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f11c30b0-ca37-4623-ab7a-dc5ebff308be` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `01f53b20-2945-4e84-b7b9-090f781c372c` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2ab055b9-df76-404d-b668-ada8c8a46538` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1db6fa86-f260-4b03-8335-9ee9d1fed7c4` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1cd45898-bf62-4587-b16a-14b94f28ce6e` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5b70e35e-0f63-43e8-b23f-69d9176df10d` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `580f82a0-eceb-46d9-bf06-e5c6d7a9bffa` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3b8cf80b-bc54-43b5-92f7-254e36f77c1e` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `875588ff-b1cf-43c0-a124-176b4036f348` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0d30fc06-7f51-4bd6-8f89-1501712cb7bd` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `317ac67c-bbdb-4c69-a565-ac41945568d6` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6da77b3a-03f5-4cc0-a02b-f064d3076918` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f5a17b51-7062-432e-a71e-f811d2e893f8` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `02d884f4-f9f8-4bef-9eac-590774008e41` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4173e7d6-6e0e-4462-855b-914318b7c9b0` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `056ad9fe-1888-485a-861e-6fcc1e5b92f7` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bd8be6d4-3f1d-4b5a-8bf6-f616ee06601e` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fefa3175-b8a1-4224-ba64-c5bfa88d7bef` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a86e1ddf-a200-4890-bee4-059af6be5702` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6dda878a-4472-4c43-8978-6c89df9df2c4` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ae5e8653-e790-464b-9536-0a6b0852bbd3` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2a99b404-003a-405b-af63-8863f0a6ece4` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4ca4e39c-a654-4144-97dc-d562ec8ac875` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `40a68595-89c6-4659-8b39-97399c24ef97` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `89089d9a-7034-4063-911e-69091cc8f78c` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `af240ec8-368c-43d2-aa94-5597a1138da1` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cd8d9c04-e5e1-4548-b8d1-66a47eab2e06` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d65804c3-9906-4e91-9888-45e808e279ab` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `91da13d3-4943-4983-a1e8-3213d53a7465` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e74e5f3d-a03c-4980-8177-3a37672a77ff` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a4568f88-853c-4a3b-9eda-e5221c164afb` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c72e2b3e-8911-4886-9d57-5a71a66ead06` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a1b71c2f-313f-4aff-a1b6-2328d3a4bd05` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `61c78a51-950a-45bc-a768-cdfbeaa3c7d3` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `97871318-093d-4616-b758-b1f3d07172ad` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `900f00f9-f6ae-4a4f-9dab-07b62a900fb9` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `de5c7004-74ec-4645-9a46-c06b0224bd1a` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `35058b15-9d3f-4486-872a-d1d1bc61555e` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `151532c7-31c3-426a-8192-6f3085a7d6c8` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ca740fe4-a591-46d1-804b-78a265443431` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `34051ba4-0db6-41a5-a980-633d2a92a8a3` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `11106ae7-8ad5-4e57-a708-3bcf18708ba8` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a9950c03-c6f2-4fb1-ad86-e17b83a08df1` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f8d34058-2bbe-4bf8-87f6-1a3f6d92b947` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `90f5a719-4d21-4c1b-a3b1-90ef0935c4b7` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3d746423-80a1-440a-9e04-8d22e935e109` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f61e243f-5a00-47b7-865b-46dccffe4e18` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e0237b9f-a2c8-43cb-817b-39e0a060c242` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4d8a7af9-4cc5-41d7-b489-80fae8037e10` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6b08c80a-5abf-4883-9a37-ff7aad706bf5` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4714d8b0-28f6-48c5-8b50-ca202c4e809b` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6e5d7f86-8707-4edb-b3f3-2d77553996b1` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b5bef846-9f94-405a-b697-b574062e27d9` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b8caa051-2d68-4955-9ca0-e63405876463` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d6c4906b-3862-4d2e-a04a-0bb25de3bcd1` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b97156dd-9ca1-4816-8ba0-6174cafa2109` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4ff822c5-5c20-4ae8-9fd3-5307fd7246c6` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `98f5c810-6c9b-43b4-9d89-3f27ddd7da52` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2e6c5495-b73c-4b66-bb06-f83dadaae0cd` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0303fb1a-abfd-439b-ad65-e974c43833dc` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `30bace1e-1a54-47b5-a7f8-7118d67310c0` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f8bdee99-5be8-4e48-95cc-428366a6c22a` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `50b9b5f6-adc4-4553-97ed-50abd9b70067` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `edcbf376-6886-47a4-ae50-291161fd071c` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5cad2181-a2b0-417a-a233-7b77471caa89` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0c3708a7-06cb-4b3f-9e10-c52ef207e3d5` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `becb5148-29b7-49d9-a2a5-6e4b6e4b2649` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0be4ef1a-4abe-41c0-9536-34014e28e4cb` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7b11475a-f3c5-4e43-a604-796dcc6d2f8a` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c8055149-a5ab-4a4a-8836-abd8ff3d4a73` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `94b10f8b-39bf-4ddd-b2f7-61f54afea2bb` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e62197ca-ad27-4d98-99cf-7909c3daf056` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7b0ba4a3-e174-4f70-b7bb-e2665c67a2f3` | - | 23/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a460903c-6b15-41b1-bfb5-1ef2ff2a47f5` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `85a75c77-1b06-4633-8374-451d17fd219e` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `22994196-85cd-4ddc-867b-576183ca60ca` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |

Origem: `crm.opportunities (ganha sem data de fechamento)` — 0 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|

Origem: `finance.financial_entries (conta paga sem data de liquidação)` — 0 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|

### `crm_lead_daily_lead_source_completeness` (rm_crm_lead_daily)

Campo: lead_source. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":100,"nulls":119,"total":119}; limite: {"field":"lead_source","maxNullPct":1,"blockAbovePct":5}. Listados: 119 (bate).

Origem: `crm.opportunities` — 119 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `005535a2-3990-4b85-89c1-4b133766bed8` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `017b7ceb-5051-4854-a47f-bbefcbef271d` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `180258a4-025b-43fd-b277-b917c3c93d6e` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1db40ad9-33ec-4055-95b5-684640f34c13` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2522420b-3d74-4a9d-a24f-26428ab8a302` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `28c18f3c-2f89-476e-a693-b9bf5f4d3b15` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2b3cc0f7-f931-4c9a-8ded-3d5995c16686` | - | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `0b5b9ab8-ff95-44c5-b302-8f36170777f2` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0bfed436-86ba-4585-a5f7-5fa096782153` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `102f017f-c9f3-44ac-b8ae-8e4673839f1b` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `13fe6cd3-9810-4e71-a993-ef8daeb06825` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1412e9f7-cc45-43bf-a3e9-ad3c3fcb8f8e` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1fa9ae82-5551-4909-9178-be2b6728b193` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2f6dd12d-1eb0-47c6-a165-4332d3ea16e6` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `324d5533-e619-458c-a6c2-5b9672680a01` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `334075ec-278a-4598-90b4-e38aafeb6021` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4b53a889-3e21-4615-bb1b-0887edaadb5d` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7042c4b1-a162-42fe-93d6-849ae486f099` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0a10c015-e3c6-4083-8794-a21dd1a8d39a` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2845595d-6642-4171-96f0-c5eef0188925` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `35ea6dfa-5342-47c7-9e35-56cb0fb19fc1` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `41d94821-fe8a-4541-aba2-c2a802684ff6` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6467d1a4-57ba-44c0-9b00-a472552a931a` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7146bb6a-ab0a-42cc-8f89-2ac4c3ea655c` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `73469a47-d352-4f8f-91b2-8173cb5eb564` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8c1d7c69-6448-4d7c-8453-eae5d2ad4047` | - | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9759ccfa-0bf0-423a-a314-2d26aa77b430` | - | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `9ad397f5-a290-4cf7-8f29-b45e6136ab26` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9d861ba1-799b-47e2-8f60-32344f3f6f93` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a446e4f5-6bc0-4022-8e99-5f0a59c92857` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f2952903-79c3-4006-a1bf-711d08c2ed95` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fcbbffb6-ef23-4758-ab9b-eaad7a429189` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `107415aa-367a-4654-a426-3b6cf7f36c7d` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `10c46d50-26ab-433f-a049-23ae3cc8eaa6` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `12a7a6f3-1f9e-4131-866e-885e8717e9b7` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1712e6c3-05d2-461a-b65b-cd3c0722f35b` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `179decbb-e301-404e-a338-6221f7c71bb8` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1d4dcd13-5723-4e07-8543-fc10c1187859` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1f4defc4-0266-4d38-9136-e12afe9d43c0` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2586a43b-a9b2-4d63-b76e-21ca676a887f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2d8bdf55-2a30-4cb8-abfe-0847d597c199` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `306c1b48-5562-42d8-8edb-5ebc2384514e` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `329ce218-f664-46b3-8797-cb9eff915df8` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `391443be-6cc9-4ccd-a814-c141f923a30e` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3925917c-b1dd-43fd-abf6-1c1695562f46` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3a5165bd-4de2-4457-a3a2-6e290fe2f16b` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3ab685c7-a7b4-4720-a62d-7b7304d6c08e` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3bcbbf1f-f02a-4471-be90-afd89b322d78` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3be8f8a9-d0f2-4ff5-b347-47e73ebc21e2` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3c104fe7-bd5e-4fbb-b63e-a35279b93eba` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3c7bebd1-5c17-453c-a70f-ccfe6ca1ccb2` | - | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `40409a81-7614-4fde-9daa-d97bf3812a9f` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `43179120-6c8e-4fd5-a332-924a940df421` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `43d59cea-f6ad-4e52-9b20-056db9ff0521` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `451ef111-b45c-4d9b-907b-370f00d519f6` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4ddf3197-ad83-47a5-8f55-f21f535b5a3b` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5191b0e3-b80e-4ad6-95d9-832b7feb5a86` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `51a56f5b-1e76-4c34-ae35-2f428a7ca7e2` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5b0c4f29-3c44-4278-8bd1-9d1131dac970` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5e814252-3382-4f10-95fc-c8c9809ea1f6` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5fc14f0b-04ef-462f-931f-4854d64fcbe9` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5fdc173e-5362-41ad-8453-6658437feba0` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `62d12c29-4dde-4ef9-b227-84e680706633` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6602cd0c-7592-4f63-af76-29a0c0dd64bd` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `67b97087-d19b-4b08-b080-32e179ea134f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `69830f12-d9ac-4d6b-88be-9bc493f0a006` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `69a2886c-db0c-4748-bd34-d970747cf421` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6aff6ad2-f930-44f4-a61a-371d15e62563` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6b5606fe-44d3-4eb1-8be7-63da280886b1` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6d8336cc-9879-407e-8bc7-05f5f82f0341` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6fbe95f2-1886-479a-9fc1-61842d203716` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `73e358b9-6341-42b9-8d67-9b34611f3d65` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `779341a1-6c34-4b3d-98fa-d62508dae31a` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7f52f5c3-886e-4fa0-8322-86c1e8f82ca7` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8044fe63-2f94-4962-a099-5088636fff53` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `80b31170-a067-4feb-aa17-b78ea83cfc38` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `82e7c5bd-5ca3-4644-b1a5-8aed88a744cc` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `83c5be02-b6f4-4b5a-8546-507363c0fe96` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8400d3a3-a514-4828-82f0-5b0b050bf5cb` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8590c4a5-de92-43e4-8a95-c9d01ecc9097` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `863700fd-ecfe-4dfb-9305-87dd7264e5fc` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `92115347-0d34-4f7f-85d6-e5f8de428347` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9547f452-c822-4c82-afdb-edc915f97197` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9731923b-9d60-438b-8ad4-58ec0ee91c57` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `987831bc-f1b9-4545-9a8d-43836d382ddd` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9bdc03bb-6fcf-486d-a29c-ddcd6d6c6985` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a4328665-1f16-4d5d-ad68-70048b5c0e47` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a4c2288c-adff-49ad-9b06-b65ddd8f90f3` | - | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a4ff57f4-53c1-43d1-a153-6642464b435c` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a51246d9-8086-4d71-8b81-dc27ac0edbb7` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a59caa5c-dd77-4ccc-850b-9531c84afbd8` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a83d27a0-75fb-41bb-ac3b-6aa90437a434` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a8918df4-0279-4ffe-95cb-053a8bc66102` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a94ef462-01c0-4425-9f5e-dc53e92990a9` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a97dbff6-a40f-4897-affd-6b9312033f31` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bb4755f9-eaad-45a1-82e6-9ed8e3b0dee8` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bc369855-ecad-4a2d-8e42-cc5a09b9b89b` | - | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c1d181ec-c3db-49e5-8a31-ce666da6d9ef` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c7612fee-5902-4355-97e3-20c3df4e67a1` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c97f800d-978f-427f-8f0d-9f4b833b6bd4` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cad317d9-c790-4d15-a6ca-70df063b93eb` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cb51a389-4cd7-44a8-a1e3-29d3d015b100` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d08dab65-2d58-4e45-9108-7bf5471036a2` | - | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d16b3001-eda5-47ad-86ed-8ff1393e47fe` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d377b369-3cbc-4edd-ac37-56fb2e719810` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d929583a-57fe-4278-b706-8b3b279bb9a9` | - | 22/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e10c2d5f-f709-40d9-a282-7b14508642f2` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e3b35fbc-e281-4730-8ffa-af43a5cf82fd` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e5e3dd9f-ee63-4b8a-abdf-6a591b0402bd` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eb13f09b-5128-4b7c-aa3a-9f2159634fb1` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ebae0e2d-a130-4972-94d2-316cd6d706cc` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ed4cf6fb-2f83-49e0-8e6f-a935c02eb9f2` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eda859b6-4e9a-4b0a-968f-196de3a6c18f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ee29b31c-a728-4d30-9191-92bbceee73ea` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eeeb213b-2b9a-470f-87d7-f165c651d78f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `faa3bd3f-e773-4515-80c9-eb74931fefdb` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fbe1ae16-9a2f-438e-9ebf-738d4e470f06` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fc67a092-3b22-4fc6-9ea2-b6535caaf694` | - | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ff3a3a8f-f2ca-43b0-ae9e-bccb8df38aa4` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |

### `crm_next_action_next_action_completeness` (rm_crm_next_action)

Campo: next_action. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":44,"nulls":44,"total":100}; limite: {"field":"next_action","maxNullPct":1,"blockAbovePct":5}. Listados: 44 (bate).

Origem: `crm.opportunities` — 44 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `2845595d-6642-4171-96f0-c5eef0188925` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `35ea6dfa-5342-47c7-9e35-56cb0fb19fc1` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `41d94821-fe8a-4541-aba2-c2a802684ff6` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6467d1a4-57ba-44c0-9b00-a472552a931a` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7146bb6a-ab0a-42cc-8f89-2ac4c3ea655c` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a446e4f5-6bc0-4022-8e99-5f0a59c92857` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f2952903-79c3-4006-a1bf-711d08c2ed95` | - | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `107415aa-367a-4654-a426-3b6cf7f36c7d` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `10c46d50-26ab-433f-a049-23ae3cc8eaa6` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `12a7a6f3-1f9e-4131-866e-885e8717e9b7` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `179decbb-e301-404e-a338-6221f7c71bb8` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1d4dcd13-5723-4e07-8543-fc10c1187859` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1f4defc4-0266-4d38-9136-e12afe9d43c0` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2586a43b-a9b2-4d63-b76e-21ca676a887f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2d8bdf55-2a30-4cb8-abfe-0847d597c199` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `306c1b48-5562-42d8-8edb-5ebc2384514e` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `329ce218-f664-46b3-8797-cb9eff915df8` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `391443be-6cc9-4ccd-a814-c141f923a30e` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `40409a81-7614-4fde-9daa-d97bf3812a9f` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5191b0e3-b80e-4ad6-95d9-832b7feb5a86` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5fdc173e-5362-41ad-8453-6658437feba0` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `62d12c29-4dde-4ef9-b227-84e680706633` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `67b97087-d19b-4b08-b080-32e179ea134f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6b5606fe-44d3-4eb1-8be7-63da280886b1` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6d8336cc-9879-407e-8bc7-05f5f82f0341` | - | 21/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6fbe95f2-1886-479a-9fc1-61842d203716` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `863700fd-ecfe-4dfb-9305-87dd7264e5fc` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9bdc03bb-6fcf-486d-a29c-ddcd6d6c6985` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a4ff57f4-53c1-43d1-a153-6642464b435c` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a51246d9-8086-4d71-8b81-dc27ac0edbb7` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a94ef462-01c0-4425-9f5e-dc53e92990a9` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c7612fee-5902-4355-97e3-20c3df4e67a1` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cb51a389-4cd7-44a8-a1e3-29d3d015b100` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d929583a-57fe-4278-b706-8b3b279bb9a9` | - | 22/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e10c2d5f-f709-40d9-a282-7b14508642f2` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e3b35fbc-e281-4730-8ffa-af43a5cf82fd` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e5e3dd9f-ee63-4b8a-abdf-6a591b0402bd` | - | 24/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eb13f09b-5128-4b7c-aa3a-9f2159634fb1` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ebae0e2d-a130-4972-94d2-316cd6d706cc` | - | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eda859b6-4e9a-4b0a-968f-196de3a6c18f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ee29b31c-a728-4d30-9191-92bbceee73ea` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eeeb213b-2b9a-470f-87d7-f165c651d78f` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fbe1ae16-9a2f-438e-9ebf-738d4e470f06` | - | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ff3a3a8f-f2ca-43b0-ae9e-bccb8df38aa4` | - | 26/10/2026 | [e-mail mascarado] | criado por conta de teste |

### `crm_outcome_closed_at_completeness` (rm_crm_outcome)

Campo: closed_at. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":10.53,"nulls":2,"total":19}; limite: {"field":"closed_at","maxNullPct":1,"blockAbovePct":5}. Listados: 2 (bate).

Origem: `crm.opportunities` — 2 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `1db40ad9-33ec-4055-95b5-684640f34c13` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3bcbbf1f-f02a-4471-be90-afd89b322d78` | - | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |

### `finance_health_due_date_completeness` (rm_finance_health)

Campo: due_at (vencimento). Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":66.21,"nulls":335,"total":506}; limite: {"field":"due_at","maxNullPct":0,"blockAbovePct":5}. Listados: 335 (bate).

Origem: `finance.financial_entries (conta a pagar/receber em aberto)` — 335 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `7beb87fd-b503-428a-a01a-4a4b0d05c03d` | HOMO QA — teste de idempotência | 28/08/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e16b09b7-73aa-44bb-902e-1b1e96d970bb` | HOMO QA vencimento 0909 | 08/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c04676c1-3bc7-464b-996e-5e339f6bce11` | legado:c04676c1-3bc7-464b-996e-5e339f6bce11 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `d0c742d1-f264-42c0-aa56-b527db563815` | legado:d0c742d1-f264-42c0-aa56-b527db563815 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `9286e3fc-414e-4a5d-8dc8-b39abe1c64cd` | legado:9286e3fc-414e-4a5d-8dc8-b39abe1c64cd | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `27860f34-5ad6-439b-8758-e572cf8e0435` | legado:27860f34-5ad6-439b-8758-e572cf8e0435 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cf135f6f-4d92-430b-91b1-5259533dbc73` | legado:cf135f6f-4d92-430b-91b1-5259533dbc73 | 06/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2a725361-4a61-48c0-8894-6b4f563c0c2b` | HOMO QA INTEGRAL — despesa fictícia sem centro | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fe39fa60-9fc6-4cc8-a7bc-3c2ac5b8e9b9` | HOMO QA INTEGRAL — receita fictícia sem centro | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `37346287-9a1a-4786-b379-13fc14c902da` | legado:37346287-9a1a-4786-b379-13fc14c902da | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1f386cfc-96c7-4931-bf4c-cf701114cf04` | legado:1f386cfc-96c7-4931-bf4c-cf701114cf04 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `03a2642f-f5d7-4cd8-84ff-4d111029a94f` | legado:03a2642f-f5d7-4cd8-84ff-4d111029a94f | 06/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3b331e2b-b01c-4f90-a788-0cb104daf37f` | legado:3b331e2b-b01c-4f90-a788-0cb104daf37f | 29/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `f28d8db7-b93d-4ec0-a0ff-1458fa1d0688` | Recebimento conciliação HTTP 179232463836162739 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8fe606a6-422f-4986-960c-f7373678e25e` | legado:8fe606a6-422f-4986-960c-f7373678e25e | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2d5447eb-899f-4342-b62e-6f6ff6d0f7fa` | legado:2d5447eb-899f-4342-b62e-6f6ff6d0f7fa | 30/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `016f66e2-cc85-4a37-88c5-1b6db47db3ef` | legado:016f66e2-cc85-4a37-88c5-1b6db47db3ef | 06/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `86823006-380f-49d2-926f-d566edc78f75` | legado:86823006-380f-49d2-926f-d566edc78f75 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cec3f78c-0f0e-4a2d-8d3c-ce9439bc4562` | legado:cec3f78c-0f0e-4a2d-8d3c-ce9439bc4562 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `808face9-baeb-4d17-8e0d-aece4e1744c3` | legado:808face9-baeb-4d17-8e0d-aece4e1744c3 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `151ef1d4-17ef-48eb-8a02-d8c8bae6abc9` | HOMO QA HTTP recon 179182965387788262 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cbf35146-0c3e-4f07-8bc2-e58451ec695a` | legado:cbf35146-0c3e-4f07-8bc2-e58451ec695a | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4137bcb5-393a-4600-a6d0-0165aa831f57` | HOMO QA HTTP recon 17919286892737177 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4f77e48a-d6ef-4022-9806-f08bdaf997ec` | Recebimento conciliação HTTP 179217922917035333 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `39141159-cbd7-49df-89bf-4d407240b37b` | legado:39141159-cbd7-49df-89bf-4d407240b37b | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bbc250c3-b111-4d3c-bfe3-74df30dbdcd0` | legado:bbc250c3-b111-4d3c-bfe3-74df30dbdcd0 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0b4565d8-0f91-4182-bd44-e996c731f7d6` | Despesa HTTP 179176536320149470 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7c910c19-2d96-4d8b-a545-75a30eed4b3a` | legado:7c910c19-2d96-4d8b-a545-75a30eed4b3a | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `487cc0a7-ca82-48d1-b568-b773ad7ab192` | legado:487cc0a7-ca82-48d1-b568-b773ad7ab192 | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `30c87f9f-3b78-4afa-9c82-3cb2b5d0c63c` | legado:30c87f9f-3b78-4afa-9c82-3cb2b5d0c63c | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2859c84c-1c1d-4199-823a-936b56e8c176` | legado:2859c84c-1c1d-4199-823a-936b56e8c176 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a0b4c328-b31e-4439-a8fa-84198b7893dc` | legado:a0b4c328-b31e-4439-a8fa-84198b7893dc | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8caea370-0075-4e60-85c0-67e9516d199c` | Despesa HTTP 179177880220342668 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3927db29-808c-43c9-af43-830e5d01c2a4` | Recebimento conciliação HTTP 179183000874744879 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fe67f06a-3879-42cc-bd68-d439e305642f` | HOMO QA HTTP recon 179178000291857120 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c9eccb56-f75e-4e79-976e-1c8a951fd9fe` | legado:c9eccb56-f75e-4e79-976e-1c8a951fd9fe | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `89942f21-b437-4399-b277-30ecc8228b3c` | Despesa HTTP 179182998923092813 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `94d73662-4887-42fb-93e8-bda8ff82357f` | HOMO QA HTTP recon 179177935644576501 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4bd81b74-9c62-46ed-a1f6-32f374a68bce` | legado:4bd81b74-9c62-46ed-a1f6-32f374a68bce | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9619a50e-60e1-4301-9d41-ba37fbd48a60` | legado:9619a50e-60e1-4301-9d41-ba37fbd48a60 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b306ed8c-58f3-4db8-b824-beda759c0cf1` | Despesa HTTP 179177986127175490 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `11c47fa0-c1c5-416f-8888-eb003c2baeff` | Recebimento conciliação HTTP 179177992228111415 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d893f40c-3b17-465d-aa50-fda094beed39` | Recebimento conciliação HTTP 179177997237674044 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d26d868-2dec-4be5-b191-ba38da986964` | Recebimento conciliação HTTP 17917805153613983 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fd55b304-bd80-44bd-b723-bdc4864270bc` | Recebimento conciliação HTTP 179178138882028968 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0987b775-cd96-477f-93cb-eca01a89d3ae` | Recebimento conciliação HTTP 179199530417241126 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0dd74855-eefb-4d81-a8a6-a0ad0fe04a8d` | HOMO QA HTTP recon 179177879351634993 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `de910581-2aee-4cb0-b45e-cad1f1269e1e` | Despesa HTTP 179178049989087248 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1e7d16f2-5755-4836-9cb9-fd4af326f20d` | Recebimento conciliação HTTP 179178062780759692 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c476ffff-2344-459f-81f9-78b77a7cd948` | Recebimento conciliação HTTP 179181170660630886 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4c617098-d306-4c55-a0da-315c4cdb172a` | Recebimento conciliação HTTP 179216868481934920 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dd407fc8-7ad7-4ef2-89ef-26bea5e0192f` | Recebimento conciliação HTTP 179192896162495716 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0fcac864-2dd9-4ab4-88f5-8d5dbf51365c` | Recebimento conciliação HTTP 179234123764013214 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c276728f-0a68-4b4e-84cd-5f013ed1c93b` | Recebimento conciliação HTTP 179178087533691676 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6a7c56e1-98f4-4e67-99c9-baf4b0f5daaf` | legado:6a7c56e1-98f4-4e67-99c9-baf4b0f5daaf | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `db4ef6cb-dab7-47f9-93ec-d89f65c2c5ce` | Recebimento conciliação HTTP 179240924461249433 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e6977af-b0d1-4111-b4c8-b2e04f0cf85c` | Recebimento conciliação HTTP 179216764717369325 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0270438e-7a1e-4082-9ce0-e74b801a20dc` | Recebimento conciliação HTTP 179193090172137380 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `70e6ce37-2a1d-497e-81e2-029ce6e779a7` | Despesa HTTP 179177936871780939 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `47e2fb9b-4397-4293-a2dd-3348de2b5ee0` | legado:47e2fb9b-4397-4293-a2dd-3348de2b5ee0 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ff8fbb6f-b757-4aea-bdba-7ce1b6535995` | Recebimento conciliação HTTP 179216791969861191 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `494cbc3b-e966-4256-85ee-58f0dfd5759e` | Recebimento conciliação HTTP 179178003065017918 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bef34393-b61b-447c-9502-b2d0a8cead93` | QA contract gaps | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `09781171-4c8a-4e57-b813-6880df8fbbd0` | Recebimento conciliação HTTP 179216795758647699 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `25d97303-5e5f-4456-be64-bb9ec01534c9` | Recebimento de materiais — PO 6fcb9ec5-712f-4439-ac3c-e3bb9db74274 (NF AUDIT-M7FINAL2-NF-0 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `33f0e9f2-54ef-4fc3-a444-fb98df3b1566` | legado:33f0e9f2-54ef-4fc3-a444-fb98df3b1566 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9683a4e1-f9fd-48e8-8bd2-2a048e2e3e49` | Recebimento conciliação HTTP 179232530222020357 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `df501e55-3228-43e2-bdd0-7d9e81dd5e66` | Recebimento conciliação HTTP 179232614284274553 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `49231ead-f223-4dd2-a737-cab6c7048263` | Recebimento de materiais — PO eb5ecfe0-b39f-45f4-b5bc-55988b05e5d4 (NF AUDIT-M7COMPRAS-NF- | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `273e1028-f25c-4226-961d-b9a7384375c8` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7d10a3c-24ea-4324-ab75-c8e5c6370d4e` | Recebimento conciliação HTTP 179199654319277410 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `618e2b72-0e29-4f30-8e41-6888dcf28ec9` | Recebimento conciliação HTTP 179216782236156615 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `16b8d89a-0a8b-4279-91ba-44f797de12ea` | Recebimento de materiais — PO 8285aca8-6199-4509-a14e-e181470597f5 (NF AUDIT-M7RECONF-NF-0 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9d674826-ae7e-4ce9-b41f-1a5b5d30af4b` | Recebimento de materiais — PO 3bc3cfd5-ab43-45a5-94c8-9762e0963034 (NF AUDIT-M7FINAL2-NF-0 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e644edb1-0ff0-42be-9ad7-292f08e076ce` | Excedente de recebimento aceito (over-receipt) — recebimento 1da7eafb-71b6-41da-b14a-97e6d | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c80177a8-d3e6-462a-adf0-a487df4a98be` | Excedente de recebimento aceito (over-receipt) — recebimento 7990fff1-0842-42b0-89de-d9354 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b057a2e0-2317-4956-a19f-95bb51993839` | Recebimento de materiais — PO 1c544c3c-4e35-4e1f-880a-1c416e14f71c (NF AUDIT-M7RECONF-NF-0 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `62c405e0-f9ca-404f-b28b-6b3b1b98fb69` | Recebimento conciliação HTTP 179240702299135596 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1b316f79-9747-4a6f-a362-09133e1912a7` | Excedente aceito no recebimento — 5 UN de AUDIT M7FINAL3 Item E aceitar (NF nº AUDIT-M7FIN | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7e6135be-f5c6-4bd7-9ab1-3cfd87596ee1` | Recebimento de materiais — PO 1c544c3c-4e35-4e1f-880a-1c416e14f71c (NF AUDIT-M7RECONF-NF-0 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `add4072b-5662-4218-9ac8-fecc435cfe2d` | QA contract gaps | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `584368c0-b28e-4a9a-b52b-54cb1455a7d6` | Recebimento de materiais — PO 6d0743a7-fea4-45f8-a4ea-9c71b5964eec (NF AUDIT-M7FINAL3-NF-0 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `58e6a678-fb29-46d0-b78d-bd25db46f8f9` | Recebimento conciliação HTTP 179251467049537612 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ca2c196f-d59e-466f-9ede-abdfd73afd83` | Recebimento conciliação HTTP 179241122529453702 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5229c66d-7b5b-4b33-b3cf-8dedd28e5432` | Recebimento conciliação HTTP 17924318955629971 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ecd5caa6-e9e2-4ab9-ae09-b4ee056eeec0` | Recebimento de materiais — PO fa9641f0-2ebf-4485-ac2c-00d6a5ee9e81 (NF EVID-M7-NF-B-L1RXA) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c9f7dd69-8d55-4460-924c-cbfab8c4962c` | Excedente aceito no recebimento — 5 SC de EVID M7 Cimento KXNYA (NF nº EVID-M7-NF-B-L1RXA) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2a5c1b94-6cdf-4974-acd0-574672a72fb3` | Recebimento conciliação HTTP 179241736650432545 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7786e24-8ce4-4c26-a28d-102cd338dc40` | QA-M4-03 a pagar negativo | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b23092a3-0a54-49da-8cd8-fdcac9827eed` | Recebimento conciliação HTTP 179251324145391941 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `68796979-de87-4275-840d-f01fec125ed0` | Recebimento conciliação HTTP 179241183608423883 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f26615a5-181a-4ae9-8f2f-5d632c6f965e` | Medição aprovada — etapa "HOMO QA — pintura teste" (medição e1a1cce4-9fd5-42b3-bb24-394cfb | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05fe029f-4aaf-4bda-a288-6adfd654ad06` | Medição aprovada — etapa "Etapa HTTP QA" (medição 35e1b7b2-4e9e-4dc7-a793-97d1cc3b889b) | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5c6dce4a-118b-4636-8a34-2149804442de` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7c2569b6-8289-4e70-86d9-22e8e7d679a2) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a54eb79f-06b1-457d-a868-a87c30e980f2` | Medição aprovada — etapa "Etapa HTTP QA" (medição 9949bbce-3aa5-4cad-8691-1e0f192b9d8e) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eb8a6a66-72cd-44f0-9afc-6ec8c8bf4241` | Medição aprovada — etapa "Etapa HTTP QA" (medição 140b6dee-ad68-4a44-bfb5-195a6f62e406) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ff9872e9-4fa4-4619-ba90-824daa98e46b` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7b4f488a-9292-4277-8c30-65fd0486fbf6) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4d5c9de9-0560-4e6d-9ba3-464109f257ef` | Medição aprovada — etapa "Etapa HTTP QA" (medição 91ea1821-d026-4265-acd1-66bc4f80dcde) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `572a8bd9-0ee3-4dfd-a7df-dbec07903e0d` | Medição aprovada — etapa "Etapa HTTP QA" (medição c9490ef8-1e31-4a1f-acb5-be12ad40f96b) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c15a7cf8-00ad-493e-b55d-f89d1928686f` | Medição aprovada — etapa "Etapa HTTP QA" (medição 1f8784d6-283a-4a7d-b3f1-737c3e834b92) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `62e30c52-ed58-4362-bab2-c7111b3e1a5d` | Medição aprovada — etapa "Etapa HTTP QA" (medição ca8764fd-89d5-42d8-9078-992cc370c030) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f95183fe-7a7d-49d3-8bca-313e2ea42a22` | Medição aprovada — etapa "Etapa HTTP QA" (medição 63a7aeb7-b15d-4d6f-8f14-8c6de8d1e084) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9c1af7c0-f33e-43b5-9d44-2f384bb8a46a` | Medição aprovada — etapa "Etapa HTTP QA" (medição 19871d28-67fc-4367-9d20-020fc9c4cc6d) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8b1630f6-c717-44ad-b930-e3b313047516` | Medição aprovada — etapa "Etapa HTTP QA" (medição 62e74b9f-cf33-4322-a634-59c58412893a) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0d179b5a-58cb-4a7e-975c-93276b6a0b9b` | Medição aprovada — etapa "Etapa HTTP QA" (medição 05abbe5f-7538-4b1f-8e9d-cc582bbcf68d) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b9078379-e0d7-48ac-8780-91cbb3a70270` | Medição aprovada — etapa "Etapa HTTP QA" (medição 3be10301-f025-4d26-a5f1-a78e4417690a) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31a307cf-96f9-48f1-8d76-b4896c06ef44` | Medição aprovada — etapa "Etapa HTTP QA" (medição bd00f416-2060-46c1-9418-458664fa4240) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `847688a8-77ac-421e-86ab-3b1996d2a66a` | Medição aprovada — etapa "Etapa HTTP QA" (medição a3313d9d-b11d-4076-bfa0-2b838c51e760) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e273b5a-e3e2-4f70-9215-aa6827edbf3f` | Medição aprovada — etapa "Etapa HTTP QA" (medição 4c6589e1-d705-45d8-a10b-82c480cf1720) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0f0fe460-9d9d-41cf-9296-731beb305093` | Medição aprovada — etapa "Etapa HTTP QA" (medição edd62aed-0761-4124-8fdd-119073abd439) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9e19475f-69bd-4ff4-a8b0-f7bda8a84812` | Medição aprovada — etapa "Etapa HTTP QA" (medição c9b46b36-933f-4024-9036-283f77921106) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7cb55bda-5b95-462e-b0a7-fbd07deea681` | Medição aprovada — etapa "Etapa HTTP QA" (medição aef12d3e-5e3d-4484-96ba-0d9bbc85d18b) | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8bcb9345-c503-4457-ac5e-9f3a05a4f1c0` | Medição aprovada — etapa "Etapa HTTP QA" (medição 58b7bb86-805a-44f5-a19c-e8e945a71ed3) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eaab2108-03e8-4f22-b7c1-725d59c2a452` | Medição aprovada — etapa "Etapa HTTP QA" (medição 1f81ee89-b963-450f-96a2-4fdce65c0e32) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b0ce48a8-56f3-40d7-ac45-61ba47d83fd4` | Medição aprovada — etapa "Etapa HTTP QA" (medição 505e727d-72a6-4c6d-a6f8-aa889bb0c03b) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `743dde3c-a42a-4d33-a19a-1fa4a338ecfa` | Medição aprovada — etapa "Etapa HTTP QA" (medição c9edd3b0-37d2-43f2-9544-271dc1bb0848) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `32cdb2a7-45f8-4fa0-b4f9-24ab307d5e4a` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7965c31c-a5d6-4ae2-b9dd-da8fa197f4c9) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `89f23d6c-abc8-49fe-9c6d-c2ec0b61d128` | Medição aprovada — etapa "Etapa HTTP QA" (medição 737e434a-d922-41d1-8d6f-1d34931889aa) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `683923ed-6529-412b-a063-8218dfc910b7` | Medição aprovada — etapa "Etapa HTTP QA" (medição 9726d49f-6e98-4b87-b98b-72b458cd337d) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8870d33a-beba-4099-80b4-cb9fd4cf2ae8` | Medição aprovada — etapa "HOMO QA — pintura teste" (medição eba99557-55ef-4a83-8742-36554d | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d2989cd1-4e6d-475b-9982-e832de234f65` | Medição aprovada — etapa "Etapa HTTP QA" (medição e5df39b1-813e-478f-8aef-28dd51e90289) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6737ba97-70e7-4278-930d-4a9330c07272` | Medição aprovada — etapa "Etapa HTTP QA" (medição ed0743a6-00b1-4dee-b9b8-0f0b6b663a16) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da8ec986-da58-4c34-b73c-fe24917ebeba` | Medição aprovada — etapa "Etapa HTTP QA" (medição 5662628f-8298-4d5c-8322-4f383bc79b58) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `40a0158b-5083-44a9-8849-32d37d93ab27` | Medição aprovada — etapa "Etapa HTTP QA" (medição af02ba8f-763f-4704-aa2a-0ed717b14dac) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3ba64624-a085-40d9-a6e0-93057a74a984` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7ca65ca3-d2a1-4941-bf29-90ef077c0d31) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4be51166-a267-4bb1-b6b2-6650b49768a2` | Medição aprovada — etapa "Etapa HTTP QA" (medição ccd48ab7-9e29-485d-abdd-da86bad9f75d) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3a9bedd4-0295-4681-965f-5cb810ee63d2` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7c93a7a2-d75f-4466-8470-78a71654723f) | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8a02d5ec-2191-4006-a84c-bbd2380eb808` | Medição aprovada — etapa "Etapa HTTP QA" (medição 1fd4e417-6e3a-4976-ad01-e9f2ebd1000d) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d3163926-0bc5-4f59-9224-c989d054e769` | Medição aprovada — etapa "Etapa HTTP QA" (medição 871de12c-a74c-42d9-854d-2c6b76d0b9d1) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6a12e7d1-80e7-453d-b872-9d34ddc51487` | Medição aprovada — etapa "Etapa HTTP QA" (medição 6fa8c4ab-e6c3-4beb-afda-5015ece62f3e) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f8088ed8-0dc0-4a04-8723-3852f54d9b1a` | Medição aprovada — etapa "Etapa HTTP QA" (medição 0306b01e-2bf8-475b-925c-4d63dd85a1c5) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f2b058ef-c009-4000-b42d-fc4432f9fb77` | Medição aprovada — etapa "Etapa HTTP QA" (medição 0c0f5abb-1658-4d83-acaa-593b5eb24e44) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7477f83b-9de0-47f5-8d90-c8b8dd1c35cd` | Medição aprovada — etapa "Etapa HTTP QA" (medição 5252d384-2d9c-465a-a2dd-2e42d98a6e46) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e46a095c-fd2e-42b4-9612-49c975a1ead9` | Medição aprovada — etapa "Etapa HTTP QA" (medição 95860e7b-becb-4331-bacf-f10d4fc8db05) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a3bfcca5-6f39-4e39-b0e4-93fa53dada70` | Medição aprovada — etapa "Etapa HTTP QA" (medição cd3e2ebd-490c-46a2-8f06-f77502811ae0) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `10fd65a5-c87a-4e37-b730-0c630587d68a` | Medição aprovada — etapa "Etapa HTTP QA" (medição 58e0f834-814b-4420-a339-7bb39bd58d0b) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e282f4c-0677-464c-9175-140702a5ced6` | Medição aprovada — etapa "Etapa HTTP QA" (medição e0a25117-fe1a-468f-8e91-3cfe7f3c1702) | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ea7279dc-2076-4162-ab7a-43724c4ebf33` | Medição aprovada — etapa "Etapa HTTP QA" (medição b15a032d-720f-44b4-a9e9-6721a2fd586d) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `55022c0c-3ecc-4da6-90cb-a7b58742525a` | Medição aprovada — etapa "Etapa HTTP QA" (medição dbf463f0-98fa-4b40-9263-bfcf48a6e8d4) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `82b5007c-5f09-4b13-8311-839e28a0133b` | Medição aprovada — etapa "Etapa HTTP QA" (medição 5df4f896-ddc2-48d8-94fd-d4a88cd28c04) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7b39bbd9-653c-42cd-b353-f939fdb8f0e9` | Medição aprovada — etapa "Etapa HTTP QA" (medição f80ca729-003d-4406-bd15-5021da19bc23) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ac17af58-2f68-4562-b309-f653e4f39067` | Medição aprovada — etapa "Etapa HTTP QA" (medição adea0c0c-6c88-449b-973e-dceee6985268) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4b6625e4-8bdb-4d22-8f11-578717718620` | Medição aprovada — etapa "Etapa HTTP QA" (medição 986feed0-8f09-4324-ae46-7fd672f254e0) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7853d3f8-dc02-4cc7-aa6e-99785835c93c` | Medição aprovada — etapa "Etapa HTTP QA" (medição d100a16f-2227-4eb7-8611-51afe6dc18d0) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7e2d93e7-b542-4ddf-a2c3-c4e94ea04014` | Medição aprovada — etapa "Etapa HTTP QA" (medição 863aabd7-6ad9-4e77-89e5-f38da07444f6) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `af2b1fa2-0abd-4ec8-a592-2dc8e6b18c4c` | Medição aprovada — etapa "Etapa HTTP QA" (medição feaf4317-5b96-427b-a9ba-1047d5b19ef3) | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7dec5bd7-9c37-412e-b58a-dba4aa3b0405` | Medição aprovada — etapa "Etapa HTTP QA" (medição 77dc3318-a2f9-4a12-830b-3e61de8e4eb6) | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5949756a-a04a-44b9-8892-3b1df9a7b30d` | Medição aprovada — etapa "Etapa HTTP QA" (medição ca923440-da2e-4543-a43d-00467b5a33ff) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8d0c2505-7da3-4d58-b407-3044e41de449` | Medição aprovada — etapa "Etapa HTTP QA" (medição ab369013-3adc-4071-bbe8-24c23794cea2) | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `01eefa9b-9421-4c58-bc57-dd5333f5b6e1` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7d04919e-be64-4c96-9478-60ceaf1d55d9) | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `90199a0d-8bec-4b50-b2e1-b49e8f384214` | Medição aprovada — etapa "Etapa HTTP QA" (medição f971af7b-bcd2-465a-9712-67178c73da15) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cb57b38d-101a-4f6c-aa71-f042f88247e3` | Medição aprovada — etapa "Etapa 179217839703541863" (medição 9affc73b-d7e1-41c7-82e0-94e68 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `475e6184-f17c-4f4a-abd2-d4ffa0822cad` | Medição aprovada — etapa "Etapa HTTP QA" (medição 67e6e4e0-6c20-42f4-9896-4367166bb213) | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ff2abf1e-33d8-4e55-b42f-2c279263d477` | Medição aprovada — etapa "Etapa 179218004882716758" (medição eb481709-85d5-4760-b899-9c49b | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `40e4d3ff-5513-4b44-9afa-3afb6fdd4763` | Medição aprovada — etapa "Etapa 17921785134751706" (medição 53bd125e-fa21-44e1-9a7e-12ed2b | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `da0395be-ef19-4392-b38a-5f781b6792fa` | Medição aprovada — etapa "Etapa HTTP QA" (medição 2f32c386-d78d-447f-a553-5613cad8e1f9) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dd7c160a-ee41-4a25-999e-0c135b747dd2` | Medição aprovada — etapa "Etapa HTTP QA" (medição 33da3064-1ca0-437d-a08b-f143efed0e60) | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1d933af1-6f17-41c6-ad38-fa804c5471b7` | Medição aprovada — etapa "Etapa HTTP QA" (medição 27fd71bc-1115-4ad3-8ba1-b99c04fcaa72) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `739f2dd4-2e07-418a-bec7-80ca8529eb5c` | Medição aprovada — etapa "Etapa HTTP QA" (medição 9e9a052b-a8a1-47f3-b125-65d3daa7157d) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `50ce1e06-62fa-422f-8be2-dd82c9762b2c` | Medição aprovada — etapa "Etapa HTTP QA" (medição 52fd5af9-3345-43b3-a5ac-6363ab4c5400) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0eb065b3-d2d3-4484-a619-b5c88efeab2f` | Medição aprovada — etapa "Etapa HTTP QA" (medição 5500c772-40ee-41aa-83ff-b0f1551d5425) | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7d42f088-f950-4a9f-bcbd-f7e6839919bd` | Medição aprovada — etapa "Etapa 17921804920183195" (medição 1c12b164-65bf-44e7-a8a2-79e9e2 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0d0e1ac4-0776-44c1-b164-7a2cd8db7e44` | Medição aprovada — etapa "Etapa 179232314508261911" (medição 0204df22-7121-4450-8b54-15a1a | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `09923ae2-8e4d-4a79-a9c0-6826aff4eba0` | Medição aprovada — etapa "Etapa 179216779918238682" (medição e1461807-b807-48c4-866d-ddd11 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `77f80b32-fbf0-4698-b990-c94289bc98ca` | Medição aprovada — etapa "Etapa 179217925528756162" (medição 1f56433d-4dd5-4052-ae6c-8ba0e | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7ab57b3a-abf3-4db8-90a6-113e6914003f` | Recebimento de materiais (valor após decisão das divergências) — NF IA-RETESTE-M7-EXCEDENT | 28/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a019bc8e-7b2c-478d-ba31-5cc1f678c6de` | Medição aprovada — etapa "Etapa HTTP QA" (medição 203bc325-faec-4794-a491-82c6000af5c0) | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `91582bad-2d37-4386-a8c6-392eec86b08e` | Medição aprovada — etapa "Etapa HTTP QA" (medição 02f8b9ca-e6de-42a7-a678-66c0a4e47d47) | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f9cf1c9e-6815-47b5-b4c1-97eefb8cdada` | Medição aprovada — etapa "Etapa 179240612644214880" (medição 6905c115-34d6-4d29-b619-70cd5 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9fd10e4d-2627-45b9-9a5c-5b5b3d598afd` | Medição aprovada — etapa "Etapa 17924096988639286" (medição 510b0faf-4656-4882-876e-d201e3 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2c309380-0670-43ce-b95d-9db579212b37` | Medição aprovada — etapa "Etapa HTTP QA" (medição e4736801-b76b-4359-9dbe-c8f1321baa01) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6bf0151f-6387-41c9-a203-fb0c61c7261b` | Medição aprovada — etapa "Etapa 179241360334437628" (medição 6ef4ecb4-6e1e-4136-b5aa-5e577 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ae93fb18-47bd-4f14-90e4-39c618690568` | Medição aprovada — etapa "Etapa 179297371937876214" (medição e0768b2a-fd3a-43e7-8a1a-64be6 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e14808d5-06d9-4277-a2ab-ebc0ba2b1ae6` | Medição aprovada — etapa "Etapa 179241345181133741" (medição bef928cc-9581-4318-bbca-d404d | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e09a542e-3e90-434b-bf48-d133a27b86d5` | Medição aprovada — etapa "Etapa 179244075213666400" (medição e3249116-1af5-41a7-8270-3c662 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0925d36b-668b-4522-9a03-eaf4d868a3d8` | Medição aprovada — etapa "Etapa 17925142423419131" (medição e34bb988-814c-43e2-a8c3-7bd10a | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `73c2f164-1483-4092-aff9-083e2b002e44` | Medição aprovada — etapa "Etapa 17925189504531879" (medição 2d4b8ac2-beaf-46de-803d-8be243 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7ca70c07-1e30-4cf1-a72a-12ee2d3b4653` | Medição aprovada — etapa "Etapa HTTP QA" (medição 97804629-fa21-4c77-87fe-45056a871df9) | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `30acfc2c-58fb-4ba1-92ca-e1629454f108` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7bd5e32a-ee4a-433d-90db-212f3d9d571c) | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8afefc0f-7294-4aa8-902c-80063ac76b06` | Medição aprovada — etapa "Etapa HTTP QA" (medição 8fc4655e-71c2-4c3e-aca0-66a6e0166cfe) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `888440d7-19f4-4191-8d68-18b2cdc89a7d` | Medição aprovada — etapa "Etapa HTTP QA" (medição 9852e92a-022f-411a-96a9-f45247ab68ce) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d253b302-03bc-4cd2-adb5-915e3e07fb15` | Medição aprovada — etapa "Etapa HTTP QA" (medição e9dea44a-fa91-4614-972d-f31ca9cecf88) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3f7a8fc9-95eb-451e-8bf4-8a2ab963f625` | Medição aprovada — etapa "Etapa HTTP QA" (medição 7e84e270-d155-46b2-a47e-5bd6f1cf5b0a) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `78d1a838-2c79-4832-b545-b14be112e834` | Medição aprovada — etapa "Etapa HTTP QA" (medição 290ff5d6-580f-45a8-98bd-0becea1e20a0) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `993a25f1-f62e-47f9-8788-74b27d76b769` | Medição aprovada — etapa "Etapa 179297352222541619" (medição b5af7d04-6cd7-45da-8a49-e7983 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5d4ad610-dcdc-4578-bf42-f7063e090984` | Medição aprovada — etapa "Etapa HTTP QA" (medição 9567bafb-0932-4255-bdcf-d33c0cfd6522) | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7aad9b89-385c-4e4d-a689-376d1ac6f2ec` | Medição aprovada — etapa "Etapa HTTP QA" (medição 74df7ff0-940c-46d2-84ca-7fd7ee7fb519) | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f1c6c42b-016e-4e94-bfd7-cc2ec77219fb` | IA RETESTE M4 28-10 — recebimento fictício 0,10 + 0,20, sem movimentação real | 28/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9448c561-4fa9-4a2e-b069-2d878ac3ff98` | legado:9448c561-4fa9-4a2e-b069-2d878ac3ff98 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `7e3cc0ce-b5da-4a74-93d8-c72720e76f6a` | legado:7e3cc0ce-b5da-4a74-93d8-c72720e76f6a | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `218d55de-9616-4629-8b4a-4b22a11bce63` | legado:218d55de-9616-4629-8b4a-4b22a11bce63 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `c3622b71-3aab-4e06-9f72-b96be7a81305` | AUD reteste data inválida 92026 | 16/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f0e36eaf-e595-4dfd-9567-f1586edc0ef3` | legado:f0e36eaf-e595-4dfd-9567-f1586edc0ef3 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `45395ada-cbcc-4adc-9a48-d51cdd22104c` | legado:45395ada-cbcc-4adc-9a48-d51cdd22104c | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `211320fd-0d9c-459f-ba2e-89963a12336b` | legado:211320fd-0d9c-459f-ba2e-89963a12336b | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `5f2e4176-c7b5-4520-9246-6918e63dab58` | RETESTE DATA INVÁLIDA 92026 | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b7c4c2f7-4ac4-43ae-a8fe-d0842783ea41` | legado:b7c4c2f7-4ac4-43ae-a8fe-d0842783ea41 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `3e5ed493-ff2a-482a-a10b-86b0d3ca40a2` | legado:3e5ed493-ff2a-482a-a10b-86b0d3ca40a2 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `9d2f33f0-8bae-4900-80e4-1733fb96a261` | legado:9d2f33f0-8bae-4900-80e4-1733fb96a261 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `160cc4f0-8068-481b-9c48-39185af26a71` | legado:160cc4f0-8068-481b-9c48-39185af26a71 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `47784414-a923-47d3-8a3b-aa2b406c2666` | legado:47784414-a923-47d3-8a3b-aa2b406c2666 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `4e183bc4-8f10-4990-b9f4-22b85593508c` | legado:4e183bc4-8f10-4990-b9f4-22b85593508c | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `16a11ac8-54df-4b8d-85c5-3ede7f5c572f` | legado:16a11ac8-54df-4b8d-85c5-3ede7f5c572f | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `7f3f3e0c-b86a-433b-b74e-2c699c68dda3` | legado:7f3f3e0c-b86a-433b-b74e-2c699c68dda3 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `1f4a6cfe-7065-478e-ba68-cb6057c03e8a` | legado:1f4a6cfe-7065-478e-ba68-cb6057c03e8a | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `b44595a7-8b20-43e8-b69a-790cf36589ef` | legado:b44595a7-8b20-43e8-b69a-790cf36589ef | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `19c23a82-33f4-48b2-a32b-22064ff4f73e` | legado:19c23a82-33f4-48b2-a32b-22064ff4f73e | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `24dae8a3-2577-4b7c-8c82-5036f68d8df6` | legado:24dae8a3-2577-4b7c-8c82-5036f68d8df6 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `57fb630e-885a-419f-a6d6-32e59957c619` | RETESTE BLOQUEIO DATA 92026 | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2c48bb7e-aa62-4968-9803-86c2b805036b` | legado:2c48bb7e-aa62-4968-9803-86c2b805036b | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `973dd504-3584-4914-8b13-df09f322fe07` | legado:973dd504-3584-4914-8b13-df09f322fe07 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `6ee772ab-af84-4bce-9671-31b2d30be457` | legado:6ee772ab-af84-4bce-9671-31b2d30be457 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `fb9fb23f-0221-4c41-b14e-761787c72de1` | legado:fb9fb23f-0221-4c41-b14e-761787c72de1 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `19122ca1-9dc7-4772-a837-58e0523225fd` | legado:19122ca1-9dc7-4772-a837-58e0523225fd | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `4a71038e-2dae-4347-b8eb-1ecb77f3f8b8` | legado:4a71038e-2dae-4347-b8eb-1ecb77f3f8b8 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `af128948-bfb5-4cb0-b7d8-73929b6a8cab` | Despesa HTTP 179216866917854194 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `362c990e-cdb8-4b36-941f-390ca52e3996` | legado:362c990e-cdb8-4b36-941f-390ca52e3996 | 18/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `c418870f-f051-496a-a3b1-1c74cb281930` | legado:c418870f-f051-496a-a3b1-1c74cb281930 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `ea175faa-b8fa-4e85-9c2a-69af611a8bda` | legado:ea175faa-b8fa-4e85-9c2a-69af611a8bda | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `e515a36f-cc28-4523-8bfd-fec56b35f86c` | legado:e515a36f-cc28-4523-8bfd-fec56b35f86c | 24/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `84eafe21-b173-41c1-9642-28aed16a1aaf` | legado:84eafe21-b173-41c1-9642-28aed16a1aaf | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `35d49d67-9e6a-4fb5-9721-551ef4db8d27` | legado:35d49d67-9e6a-4fb5-9721-551ef4db8d27 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `16eabed6-e968-49a9-9e08-8731aafbe9cd` | legado:16eabed6-e968-49a9-9e08-8731aafbe9cd | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `b92b93f5-83b8-43fc-b809-81024b15e517` | legado:b92b93f5-83b8-43fc-b809-81024b15e517 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `10481736-3804-40c4-b05d-ff4c541680c9` | legado:10481736-3804-40c4-b05d-ff4c541680c9 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `457356df-78b7-48cc-ba26-dd01ae4ff47d` | legado:457356df-78b7-48cc-ba26-dd01ae4ff47d | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `758926c8-2459-48b3-8f58-fb90af1d7732` | legado:758926c8-2459-48b3-8f58-fb90af1d7732 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `f7342cc7-fd34-4e35-ae36-b55f1708f51b` | legado:f7342cc7-fd34-4e35-ae36-b55f1708f51b | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `5623104e-66e3-4b43-b103-9959df5d86bb` | legado:5623104e-66e3-4b43-b103-9959df5d86bb | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `d044989c-11d9-45f9-8959-bc42f5515e12` | legado:d044989c-11d9-45f9-8959-bc42f5515e12 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `92cfde3e-4b62-407a-bd21-46176e021cbc` | legado:92cfde3e-4b62-407a-bd21-46176e021cbc | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `73fa89db-d437-41c2-b648-23776f23d674` | legado:73fa89db-d437-41c2-b648-23776f23d674 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `d2c28523-ec65-448a-9ac0-0f1901311a04` | legado:d2c28523-ec65-448a-9ac0-0f1901311a04 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `73c1aba1-7f8e-45ab-9964-36e4bfe3d563` | legado:73c1aba1-7f8e-45ab-9964-36e4bfe3d563 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c0a72982-cbc9-45b9-a756-e44bf61c1226` | legado:c0a72982-cbc9-45b9-a756-e44bf61c1226 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `f4cccc4f-fa13-4653-99b9-3f247105bc8d` | legado:f4cccc4f-fa13-4653-99b9-3f247105bc8d | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5c64ec7d-84cf-4e63-96a1-b5cf8b6a7930` | legado:5c64ec7d-84cf-4e63-96a1-b5cf8b6a7930 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `899895de-8d83-440c-94bf-92ca20c8e828` | legado:899895de-8d83-440c-94bf-92ca20c8e828 | 29/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `44c332ec-4033-4c7b-9e58-090311691635` | legado:44c332ec-4033-4c7b-9e58-090311691635 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e538423b-6fda-4e9b-85d7-1de990283cad` | legado:e538423b-6fda-4e9b-85d7-1de990283cad | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `09075021-d968-44df-a1d1-55b3614438c0` | legado:09075021-d968-44df-a1d1-55b3614438c0 | 23/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `7577a2ac-0cf1-4732-b011-7b8636db0bae` | HOMO QA HTTP recon 179177866264237982 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eacdba8b-4eb8-4b32-93d6-a678b63cad29` | legado:eacdba8b-4eb8-4b32-93d6-a678b63cad29 | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3c7610e9-a549-439a-ba12-0960f64412b0` | legado:3c7610e9-a549-439a-ba12-0960f64412b0 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `97119eaf-c676-4a30-8751-9f25b385107d` | Despesa HTTP 179232528878012536 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `78b73cac-8974-487a-96a0-705a8ff9a38a` | legado:78b73cac-8974-487a-96a0-705a8ff9a38a | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d4e6765b-30ca-4f4a-b254-2495ae2fc54c` | Despesa HTTP 179177835525832115 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `52240abb-bf2a-482e-b5be-7ed72d5c2fd1` | legado:52240abb-bf2a-482e-b5be-7ed72d5c2fd1 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `98659635-c0f5-4fad-bb60-a251ba4cc727` | HOMO QA HTTP recon 179177848108062176 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `aeeb9d38-24d3-4a32-81d4-064e43769e88` | legado:aeeb9d38-24d3-4a32-81d4-064e43769e88 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `75166cd9-29da-478d-842c-a5a1ffa08372` | Despesa HTTP 179177752330678325 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2699086d-b376-4c49-b351-f511637ac756` | Despesa HTTP 179177990673876765 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d9e75be-5403-4f40-af11-221a636636b3` | legado:6d9e75be-5403-4f40-af11-221a636636b3 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2f6191cb-c3ba-497d-b371-45aa61288548` | legado:2f6191cb-c3ba-497d-b371-45aa61288548 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `560b2a16-190e-4b1b-9884-1c5e12b37121` | legado:560b2a16-190e-4b1b-9884-1c5e12b37121 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `80636e93-3b05-422f-acd0-30526dd69745` | Despesa HTTP 179177848991023724 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0fccb68c-41bd-4ea5-a17d-fbe2c6fb77ac` | legado:0fccb68c-41bd-4ea5-a17d-fbe2c6fb77ac | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `58d9de6e-13a5-465a-95a4-ff21b647df2c` | Despesa HTTP 179176564848580683 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `abba78f0-73d8-4722-b2ed-139c8e868f72` | legado:abba78f0-73d8-4722-b2ed-139c8e868f72 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b58fef37-b613-461b-b36e-909640b5a2e7` | legado:b58fef37-b613-461b-b36e-909640b5a2e7 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ee55fae5-63c8-492d-862b-c1d17a589ed9` | Despesa HTTP 179177904281082958 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `340a7762-1311-4536-a3fd-2c88f48b5d56` | Despesa HTTP 179176363175339827 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2f07e3af-b234-4a2d-87e7-af3ceeeb0907` | Despesa HTTP 179177995702118593 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8263d0e6-a694-467f-b6d3-677ea39b7e6f` | legado:8263d0e6-a694-467f-b6d3-677ea39b7e6f | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `297482f3-ece6-409d-9cd0-2e586496b331` | Despesa HTTP 179176372962998437 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `63711be4-b301-4a00-9528-405e9eca8d1b` | Despesa HTTP 179178137344974183 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `78bc4483-8173-4df8-b55e-d3a469dfe53d` | HOMO QA HTTP recon 179177823877816587 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6fd5bac7-dae8-4865-a3bc-05711ea59f0c` | Despesa HTTP 179199528870686285 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ddaf076b-4c50-4293-b054-8a1d156bc5f3` | HOMO QA HTTP recon 179193083445968713 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `72b56de6-b448-4fb2-aace-0fd03f0ab9de` | Despesa HTTP 179176292493893933 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2af2dd97-bc03-481b-b4c1-c3f9b0aa0bb7` | Despesa HTTP 179178061252890336 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2f207301-fc0a-446d-b2a5-ebf93c448ff5` | legado:2f207301-fc0a-446d-b2a5-ebf93c448ff5 | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8f204bed-3e5f-4465-a734-e524ebb7106c` | Despesa HTTP 179177908426941770 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f5e13bd3-8c81-4c58-9329-d36a6b72530b` | Despesa HTTP 179181169101069524 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cf7b1b9b-7b09-4fbc-9f5a-e048bf38c936` | Despesa HTTP 179177382641262203 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d83f349e-1d95-4e5c-9a36-70909a92f440` | legado:d83f349e-1d95-4e5c-9a36-70909a92f440 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8ce5ccae-f65f-4859-aa8d-770624703184` | legado:8ce5ccae-f65f-4859-aa8d-770624703184 | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2fea073f-0de5-44e0-beb5-cd3c8c84d5e3` | HOMO QA HTTP recon 179177834646234598 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `813655ed-66b3-46d4-a829-0cc1335ac87f` | HOMO QA HTTP recon 179177924332852953 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `283bb3ee-f0a2-462d-a0b7-8d8820706cd2` | legado:283bb3ee-f0a2-462d-a0b7-8d8820706cd2 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eeb7541c-3e5e-459c-9ee9-e0574a1b8bbd` | Despesa HTTP 179176581388066148 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `108503a1-3583-473a-8c8c-0a7b93a732d9` | Despesa HTTP 179177925576683697 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `80018d19-1ec7-4bbd-b704-99613f5e95c7` | legado:80018d19-1ec7-4bbd-b704-99613f5e95c7 | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5ac792d5-9961-46f9-b80c-d7d1e263d11c` | Despesa HTTP 179199652755984535 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `96235e83-1b07-4669-b1ea-05ed9378056f` | Despesa HTTP 179192894678489897 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5d9c758b-fb54-4f23-92a4-a9ba1c32367e` | QA ADV-F21 179234046198237920 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9bbfa4c9-cc84-4359-b3c9-aef01997299a` | Despesa HTTP 179240923118537119 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9bf814c4-073c-42ce-8448-0242d7120f3d` | legado:9bf814c4-073c-42ce-8448-0242d7120f3d | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1ce1f076-2817-4523-95f7-5cce8e173520` | Despesa HTTP 179216780705037033 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d9651d76-3a68-4684-a306-bce43d74e78e` | Despesa HTTP 179178085982558157 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `37c49ca4-54e1-430a-9582-1c070c16e278` | HOMO QA HTTP recon 179199394443629594 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `33a6e8e7-328d-442b-887b-5fc4948832a1` | HOMO QA HTTP recon 179216778873830108 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3471dcc4-f436-412e-8449-65cace4ed7ee` | Despesa HTTP 179193088673739260 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `567b7c79-018d-4a4d-ab9a-34e9ceb793b8` | HOMO QA HTTP recon 179199502264481831 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `98c71bf1-33b0-4f53-bb08-e641def6562b` | Despesa HTTP 179216790426257362 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `593c2b98-fd2c-4ca0-91c4-7b63a0be560b` | Despesa HTTP 179178001528969971 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fda44a30-9276-4b19-a94a-aed38a9ac4ab` | Despesa HTTP 179251464978983831 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dc60cf85-82ca-4a20-b442-991714eb2a7b` | Despesa HTTP 179216794209290679 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b9b06b32-3ed2-484f-9764-9daa295597bc` | Despesa HTTP 179232612903052709 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d394ad90-b460-4f7a-ae1b-90e7849039f4` | Despesa HTTP 179217921319741843 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c54ba07b-63f1-4480-a779-549f4d7c3b4a` | HOMO QA HTTP recon 179199666030323494 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `daef3c6a-325b-4202-b375-0a1572244b79` | legado:daef3c6a-325b-4202-b375-0a1572244b79 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2bd434cf-753f-4da9-9889-8e842ff91610` | HOMO QA HTTP recon 179216819137258681 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4e466aba-19de-49d1-baee-3e9332faa104` | legado:4e466aba-19de-49d1-baee-3e9332faa104 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1310606f-d8ea-4f56-8d41-09a3a0009980` | HOMO QA HTTP recon 179216761303125573 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c29e5652-064c-425d-8472-bc92ccc68b7a` | legado:c29e5652-064c-425d-8472-bc92ccc68b7a | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2b781691-65f2-4d99-9974-6da93fb5b674` | legado:2b781691-65f2-4d99-9974-6da93fb5b674 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0a9f20dd-bbfe-40a8-98c6-17b4b697a5bc` | Despesa HTTP 179232462264958224 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `366be09a-1873-451f-99ad-bc067a80ab7b` | Despesa HTTP 179216763137944537 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8f9cbf27-984c-40da-8a28-d3a57cd7d2ec` | Despesa HTTP 179234122428133044 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `035d0d0a-8e1b-4103-b9e8-c258dc398d4e` | HOMO QA HTTP recon 179199650886994947 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2bc2c8f4-ecd5-45e1-b20a-06ae4b5b13d8` | HOMO QA HTTP recon 179216799042141793 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f6151f2c-4629-4b91-ba90-ca7f7a96ce4c` | HOMO QA HTTP recon 179217892814998130 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3c8084d3-166f-413d-a330-b79aaa62e591` | Despesa HTTP 179240700940425595 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1c4d5b28-8294-44ed-979f-a3bdefa5c266` | QA ADV-F21 179234036862658072 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f1d572d7-f867-49d5-bf8e-50747c8714e7` | HOMO QA HTTP recon 179216811300184775 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d62971f-5b8e-418d-b2b3-4e3745c9f91d` | HOMO QA HTTP recon 179240644001557304 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5233bcfd-9a3e-4cb0-ac42-235d92b0216b` | legado:5233bcfd-9a3e-4cb0-ac42-235d92b0216b | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `506f4ff0-14ac-47b4-949f-c7c8181022ff` | legado:506f4ff0-14ac-47b4-949f-c7c8181022ff | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `559c7bda-ad5e-487b-bb9d-1b3d2080264f` | legado:559c7bda-ad5e-487b-bb9d-1b3d2080264f | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `98bd4453-98f4-4866-9ddb-c4ca7aeb91b1` | HOMO QA HTTP recon 179240901693191768 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `302e9b8b-6cd5-4a17-b768-3a8d473c78db` | Despesa HTTP 179243187573397242 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3dbcfa5a-cc12-4c69-b1fd-618836185d07` | Despesa HTTP 179241734636788185 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `19ad1d03-d1f6-4100-a321-af98ebaa1d89` | HOMO QA HTTP recon 179244027751135572 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4a475d83-8a43-49a2-b5fe-7ad9b6ed7db2` | HOMO QA HTTP recon 17924335032792293 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `885a8582-da24-454a-aafa-55bfafbaccc3` | Despesa HTTP 179251321887887457 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f7d6b359-c17c-4c42-98d0-daf4d6f57d24` | HOMO QA HTTP recon 179241488027381827 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `16cde374-2b8d-49ce-90fd-f16d8406274b` | Despesa HTTP 17924118159217789 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `88cdd636-a599-4ec3-b4c2-c0797ab89588` | HOMO QA HTTP recon 179251441666893657 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ccd97d24-f47d-435e-8a06-13788281585f` | HOMO QA HTTP recon 179251258772674019 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b3569839-e4e4-4974-9255-f006133c7f9a` | HOMO QA HTTP recon 179297788727046713 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bfbd6ac0-8bf3-411d-9346-0bb8470fd7ef` | Grupo 179251292027330475 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `af84df51-4824-43d1-b21a-345c7c5b7233` | Grupo 179251292027330475 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `61b100ab-51f1-4956-aabb-25b6dd7c5bbd` | Grupo 179251292363597847 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `4b803484-d5d9-480b-a433-4c8a2ad2682b` | Grupo 179251292363597847 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |

### `intercompany_due_date_completeness` (rm_finance_intercompany)

Campo: due_at (vencimento da perna de saída). Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":100,"nulls":1,"total":1}; limite: {"field":"due_at","maxNullPct":0,"blockAbovePct":5}. Listados: 1 (bate).

Origem: `finance.financial_entries (operação entre empresas)` — 1 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `a0977ab7-a040-41bc-ae87-4c0de906b2ef` | Transferência entre empresas: QA-M4-14 transferência intercompany | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `sector_margin_center_completeness` (rm_finance_sector_margin)

Campo: result_center_id (centro de resultado). Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":58.36,"nulls":185,"total":317}; limite: {"field":"result_center_id","maxNullPct":1,"blockAbovePct":5}. Listados: 185 (bate).

Origem: `finance.financial_entries (liquidado)` — 185 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `9960d036-582d-46d5-8dc8-c6d6e7c6fceb` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7bb5e5a-687e-40d2-8dd7-8ea77cbf3642` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `29650fd4-496f-4d5b-a73b-4749a03f8378` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `992ce432-8b11-4a26-bd9e-09672b035c82` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b23cf6b7-7fe6-4014-8e09-3d3156b5ba91` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `611641bc-1b9d-4c87-a540-5c7bb7d36a09` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0374c6dc-8496-40a8-820c-b0c5691ae778` | TEC-09 concorrência (teste automatizado) | 24/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fc267f69-c667-41a9-b2fb-16d10585bc59` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9c4ec00e-883c-4b21-99b5-1b9fda0638b5` | TEC-09 concorrência (teste automatizado) | 06/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e5c277a9-1e8d-41a9-8bd8-45c719457d43` | TEC-09 concorrência (teste automatizado) | 30/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6a3e20b5-58d2-45d8-9d5e-2bfb40120d38` | TEC-09 concorrência (teste automatizado) | 06/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `34557251-33a1-4954-8c2f-4b93c1d43cd0` | TEC-09 concorrência (teste automatizado) | 29/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `11c6b8d5-3359-4735-a40e-551cd6b7ef94` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d8992cc9-1738-4657-bb49-b1cb1935ff97` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d3810820-65b3-40d4-90c5-830707c1cb75` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2712af2b-2a27-442d-9fae-2f91029814f3` | TEC-09 concorrência (teste automatizado) | 06/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cf51a6fd-f21b-4c62-91c0-563d7db57bc3` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `307123d5-8800-4626-acd8-90e8648907fc` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9e4372ae-8206-4182-8482-1d4c1b7d8faa` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d4ecbad-0a94-4c79-a390-e9e07ca18d27` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6c319355-f19a-4f07-a854-a9a6d1f2f50c` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d2d33fe-cbe6-4fda-a083-59ef20b1075f` | QA contract gaps | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a44d0c4e-c4f0-4abd-9461-77bf95bc5ef6` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a93d1a8f-be12-41d4-b88a-2d8d9c74d9c9` | QA contract gaps | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c48f3d87-718f-4d45-b831-2b8574acd01e` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `281e0abb-4dc3-43be-ac01-6caaed38bfd5` | QA contract gaps | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c3df23f5-f5a1-4a83-a696-7e0cd5580c4b` | CONF1810 pagamento 179234032661516397 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ebc68e67-0d4f-49b8-9701-6736243169be` | QA contract gaps | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `927e303a-5e89-4a98-aba6-266fe59d78c9` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eb4999c9-87d9-4e96-a1f8-8e510fa30986` | QA contract gaps | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9a72da8c-876e-49ef-b173-705645474614` | PAY1810 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9a4da28c-78c0-4ed2-bb8d-ff9fc9b0792a` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e9c5fbd6-6048-4201-9e33-d15cbb88a7ea` | QA-M4-07 baixa manual | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `77db8e36-3aa8-45a2-af91-467675fafc0f` | QA contract gaps | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `70d1b33c-ea71-4e95-916d-deab702238c8` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `300038e1-fc7c-4608-98ee-f10c8cbf0d52` | HOMO M45 — pagamento sandbox em trânsito | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `97978ed0-2fe8-47e9-9757-7488a5d31e2d` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f6b22502-bf50-4f96-a30a-25bcae141503` | HOMO M45 — pagamento sandbox em trânsito (rodada 2) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2438bec8-cfa4-47c1-b2fd-463ee160d4ee` | HOMO M45 — pagamento sandbox envio incerto (rodada 2) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cff3bd21-7206-4910-8449-0f6c28b098eb` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `337ead31-d3d8-44e3-a98e-10ec4b1917f3` | HOMO M45 — pagamento sandbox envio incerto | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `312c3151-4dbe-43e6-aaf8-87d55a0e8336` | QA contract gaps | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `51ecdfe7-50b7-4c87-8af8-9f584f4d78db` | HOMO M45 — pagamento sandbox em trânsito (rodada 3) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e5a25e59-2992-44ca-bef0-f75d85d180ca` | HOMO M45 — pagamento sandbox em trânsito (rodada 4) | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `60bacc9e-7cbc-4433-af0c-1a8ccc1a1297` | QA contract gaps | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9f52a9f6-e130-4512-be43-0b06c1bfbdcd` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ef2d27a-c2c0-45fb-9d06-c9521b034b79` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `023fa0d8-6381-4584-a40d-481dbb5f69f4` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7d1dd83f-a82d-43f4-be0e-e5674f1095a3` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e30be955-769a-4e4f-a3c0-0e962dc6ad62` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d853c034-c0f2-4d45-9661-ec8c22a421cc` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `63b5c175-dcd6-4459-a838-706d82dcc176` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0c0eba03-687d-4473-b8eb-a1aec8706555` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7436a177-798c-496a-93b3-2346caa3a57b` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `91f9350c-59f9-461d-a866-5b85571ff39b` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `428eb7e4-f256-4444-9a1e-ac0f45105048` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3f5923d8-0998-4a5b-9e52-4c28335db08e` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ed4fe716-1c69-4120-a5e9-7cfd3810cdaa` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0b78f85f-662d-4f54-83de-5db6f0eb5c1b` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eadcb0cf-6d3b-4278-bb97-8823edba60b4` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31927ba4-a0d9-4651-9219-f115c87f88ae` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4c88d979-8d96-4ebc-b7b8-8bbf68aceac6` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `91fe4357-de0d-42a3-b0c1-6536b821f60e` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bb40e4aa-fefa-457c-91a4-283c9905843a` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6445f72a-5e97-4ebb-b462-23ce9d3e5cce` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cd704a86-d4eb-4472-bb55-66af828404c1` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `38becfb1-2f2b-4948-8df6-09f61b511850` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f45d2503-4d23-4ffe-9373-80f873de3383` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6e5d130b-5bfc-46bb-8d3b-122c98c128c1` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2b3184a6-1495-481a-b3b9-96bcabbd8f92` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c4e8b3cd-53b9-4f82-bdc8-a81f47ed395f` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b25cef3f-faaa-4cfa-9798-0ce48cd848ae` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5b3eeb84-db02-49a4-b299-4abc099ef277` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ac4e813-7491-47c4-9307-5c1ced012933` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `13abb278-a47c-4988-96e9-d504dae3b91b` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dd8e552a-45e0-4a7a-8e7e-b57e6a4f3eef` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6274827b-07c5-4852-8366-5aeb5a8fb89f` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ceb2072b-7fcd-41eb-9a08-929f8adfc150` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `54b6c779-8305-4324-a57e-8e474b7e2ba2` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9b06af37-0ffb-4253-b02f-0dc65f76f417` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a3df51f-d9aa-47bd-8795-e98800961d44` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `98283ba4-115e-4b48-a7bd-489227b7b2ff` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d718a78f-2c9e-4196-b0b2-a70b63fca188` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ea37b517-ecd9-4832-bd8a-ea9333e5903a` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `759dc2c8-21fe-4949-ab21-cf9658dc0567` | TEC-09 concorrência (teste automatizado) | 29/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d3dfcc11-3d2f-4d8b-87b4-00f312531b3a` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8d837901-c1c0-4094-a036-8314140ab574` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da0baa0c-fc4f-42e9-a502-35d3f1e2b2e4` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8bc2f8e8-c10a-4a18-9a94-43fb2777062c` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1e4833db-38cc-4f4c-b947-3c730a6789b7` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a0de1c4a-2da2-4d5e-bd97-63a87a5a292d` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b962076e-5a5a-4deb-babc-b5e8e0458fe9` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `618fe0f8-78d6-4b22-8635-ea9af2f3048d` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0c3ecc36-520b-4ce1-a1d6-b9bcb2d15b7f` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `acac04bb-7f78-49c2-a630-5b5444c6f82b` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b070b6ab-620e-42fa-88d4-29c8ee92d62f` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `458c1d49-d486-4739-9bfe-01983350341e` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cfdb1807-199c-432d-913e-3c1971bd9df0` | TEC-09 concorrência (teste automatizado) | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6ea270a5-82e1-4475-9575-a0e89e6225a2` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d176dbf-7930-4193-9de8-2501f0f1f2a8` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2c6878f2-14f1-4582-907e-136a9ac79261` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05a48dc3-dfb4-43d8-8d9e-5fc221a38f0e` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f8ff9e2b-9da5-4a75-a0a3-f59cac7998ce` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `507e36ce-29ab-4386-96d0-9e5ab668ee33` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `309dd563-0755-4795-9e74-cc3e3f9822dd` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a2fd6e3d-104a-4bb6-9649-48cc79733679` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9b6c7144-15b1-4ee9-b06c-9e37cad7caa3` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `983d0b43-52a9-43ff-8d78-3381148a3059` | TEC-09 concorrência (teste automatizado) | 23/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ea62678-83c3-47b2-98f1-f8b57a1c0cab` | Baixa parcial de 40.00 do lançamento fff1a15f-7b4a-4328-98c6-f8660568c411. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1365cd37-1f03-464a-b00a-994d90f4da76` | TEC-09 concorrência (teste automatizado) | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f2a8f5b3-21ff-4e14-bd9c-e37dc3979e2e` | QA ADV-F21 179216804775850968 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `99fb629c-46dd-45c1-99ae-01a8c932d7fd` | Baixa parcial de 60.00 do lançamento f2a8f5b3-21ff-4e14-bd9c-e37dc3979e2e. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d557ac91-09a6-4a8b-ab5d-792cb5973eaa` | Baixa parcial de 40.00 do lançamento f2a8f5b3-21ff-4e14-bd9c-e37dc3979e2e. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dba2bab6-1d27-4bc6-9c49-c7b378b2cd9d` | Baixa parcial de R$ 60,00 — QA ADV-F21 179229818700423303 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c1c67d66-6e44-4ca7-a2f0-dcb189ae8135` | QA ADV-F21 179217925051269151 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6f722cf1-9f6c-42b4-b880-51093d591a1a` | QA ADV-F21 179218041994782025 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1ae463f5-35c7-4d17-b7fd-9130d6fd397d` | QA ADV-F21 179218075066861950 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ee148e28-0124-49c0-a812-8fa69a30a2bd` | CONF1810 pagamento 179234022842733762 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c60d7d22-c41c-4789-9a81-e04a5dcc07fb` | QA ADV-F21 179217960758987168 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `331c7c56-da43-46c2-b6ce-6b8cebd3d697` | QA ADV-F21 17921676657176950 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e179ed88-069f-4e2a-9344-a871947fa445` | QA ADV-F21 179217820972053553 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `705b454c-15d8-476c-95f1-85879322a54b` | Baixa parcial de 40.00 do lançamento c60d7d22-c41c-4789-9a81-e04a5dcc07fb. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7bbc2987-69ab-486d-a860-a8d657c79482` | Baixa parcial de 60.00 do lançamento e179ed88-069f-4e2a-9344-a871947fa445. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fff1a15f-7b4a-4328-98c6-f8660568c411` | QA ADV-F21 179216816305264966 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e9da455-a6e7-43f5-87e3-73e6d86374f5` | QA ADV-F21 179216783900974143 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7162077-42e7-4482-be12-0b67bc648f1f` | CONF1810 pagamento 179234340026987998 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d4248f09-be90-4a02-a38e-8e3b65ee424a` | QA ADV-F21 1792298696160823 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `295c23d9-5800-4aef-839f-e12cc213e087` | CONF1810 pagamento 179234198435723741 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ca130265-1753-4ee6-bf9a-9fdfd3e983ae` | QA ADV-F21 179234073945231432 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `241719aa-278b-44d3-abb2-0140416a9aee` | CONF1810 pagamento 179234363827815028 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9e046e39-b2e1-43d0-ab6e-e1eebb131986` | QA ADV-F21 179240881716335367 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1ad83a59-977c-4132-83e5-84375bc0baec` | Baixa parcial de R$ 60,00 — QA ADV-F21 179240881716335367 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4aea42f6-91d9-4087-8d0a-fc3887d6081c` | QA ADV-F21 179240580435353421 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `75318330-ad0f-4449-8895-3688180c74cc` | CONF1810 pagamento 179240977110130679 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `42dbb7f0-b2c0-4638-9cdc-d0e59090239a` | CONF1810 pagamento 179251377491268694 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `952cd152-6e8e-4db6-bf39-3c745a15c6be` | QA ADV-F21 17925135310625369 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6eefad5c-43f6-4d27-bcce-0b83a9779d3c` | Baixa parcial de R$ 60,00 — QA ADV-F21 17925135310625369 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `11b66676-6759-4da4-8400-cc7c8da59cca` | CONF1810 pagamento 17924182020184085 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ba8325f5-efa4-4451-9056-43bdca7a1061` | CONF1810 pagamento 179251516974377035 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7995a349-a99d-4d39-96c4-20dd9c3b71b5` | QA ADV-F21 179241235943083154 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4ed8e2a2-9f73-4ee8-8b16-780b1254b9f5` | Baixa parcial de R$ 60,00 — QA ADV-F21 179241235943083154 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `304eeb29-e98f-4805-bc18-ca1341cdb594` | CONF1810 pagamento 179242770031038291 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3137d4fd-45cc-4013-b5de-c4aec24f0582` | CONF1810 pagamento 179244165180356450 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `152b8897-8ff3-4b2b-902e-85266f0963d1` | CONF1810 pagamento 179241082846864969 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4f43dfe1-3ed5-4f15-bd22-6e26bc8f2c05` | CONF1810 pagamento 179242796910092345 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `633eb789-c66b-4971-adf3-a69c0e80645f` | QA ADV-F21 179251383833040025 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `40f50b24-9f75-460b-963d-25a095222d2d` | Baixa parcial de R$ 60,00 — QA ADV-F21 179251383833040025 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4be4ae76-3ada-4a65-bbe1-036388b163ee` | CONF1810 pagamento 179251347518275297 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `19404c49-ab03-41f9-b3e2-12a9215ff2b9` | QA ADV-F21 179251245414134541 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5b63d637-b2d5-4387-a78e-8131fddc67ae` | QA ADV-F21 17925126933442271 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `26d8582c-18ca-4ae5-bb41-862e76d08895` | CONF1810 pagamento 179251297914948769 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `578f792f-cddd-4849-9f23-bf560f0af245` | QA ADV-F21 179251394301264767 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a2d14782-719c-40f2-89de-a07a2530938c` | QA ADV-F21 179297216685892104 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9098cd89-a95e-4e7a-8149-211884136e06` | Baixa parcial de R$ 60,00 — QA ADV-F21 179297216685892104 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `520079d2-0d5a-461b-a0a4-a32f88e87b13` | Baixa parcial de 60.00 do lançamento fff1a15f-7b4a-4328-98c6-f8660568c411. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e01893f2-9ac8-49b3-a8f9-e13f26a2e25e` | Baixa parcial de 60.00 do lançamento c1c67d66-6e44-4ca7-a2f0-dcb189ae8135. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `635b1466-0f24-43be-905c-dd7e570653e6` | Baixa parcial de 60.00 do lançamento 6f722cf1-9f6c-42b4-b880-51093d591a1a. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d84bc6c7-592c-428f-b9e6-c62e6fcd143c` | Baixa parcial de R$ 60,00 — QA ADV-F21 179218075066861950 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bb355b61-5eb4-4c1e-be6f-b85ea951613d` | Baixa parcial de 40.00 do lançamento 6f722cf1-9f6c-42b4-b880-51093d591a1a. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1ac0d81d-9419-449d-9659-84229eaa072a` | Baixa parcial de 40.00 do lançamento 331c7c56-da43-46c2-b6ce-6b8cebd3d697. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bd2ab11d-39f5-42d2-9ab7-0bc183865422` | Baixa parcial de 60.00 do lançamento c60d7d22-c41c-4789-9a81-e04a5dcc07fb. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `064cda41-9365-42de-85ac-e7fee6562f89` | Baixa parcial de 60.00 do lançamento 331c7c56-da43-46c2-b6ce-6b8cebd3d697. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `727acde5-14f3-4336-b476-09df4611bad5` | Baixa parcial de R$ 40,00 — QA ADV-F21 179240580435353421 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e222e38b-2333-4162-af1a-958e485b8a31` | Baixa parcial de 40.00 do lançamento e179ed88-069f-4e2a-9344-a871947fa445. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e35dae3f-52e7-4bbd-accc-f676ddcf7d79` | Baixa parcial de 60.00 do lançamento 8e9da455-a6e7-43f5-87e3-73e6d86374f5. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `15020e37-73d0-4a4a-82d1-d3e284ec244a` | Baixa parcial de R$ 40,00 — QA ADV-F21 179251394301264767 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `028c8101-3d90-4348-bc7d-fbd10b019b2b` | Baixa parcial de 40.00 do lançamento 8e9da455-a6e7-43f5-87e3-73e6d86374f5. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8f3f470c-0c07-4640-9892-11458988e958` | Baixa parcial de R$ 60,00 — QA ADV-F21 1792298696160823 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b9419898-cec4-4ecf-a482-81b3a1e29a4f` | Baixa parcial de 40.00 do lançamento c1c67d66-6e44-4ca7-a2f0-dcb189ae8135. | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a1b40ff0-9267-4832-9255-1d0b4bc747b2` | Baixa parcial de R$ 40,00 — QA ADV-F21 1792298696160823 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `97cd538e-7814-472a-9838-6724321d5908` | Baixa parcial de R$ 40,00 — QA ADV-F21 179218075066861950 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `39ce6edc-cc3d-46c4-9bca-9733d42782b2` | Baixa parcial de R$ 60,00 — QA ADV-F21 179234073945231432 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7e1c8f30-a65a-489f-8060-653f7772c340` | Baixa parcial de R$ 40,00 — QA ADV-F21 179234073945231432 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4dcd0cc3-7d85-4caa-b1ea-af71146e7bc0` | Baixa parcial de R$ 60,00 — QA ADV-F21 179229798098959609 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ee11fb00-86f4-48f9-8307-6411c467f5d3` | Baixa parcial de R$ 60,00 — QA ADV-F21 179240580435353421 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `17ffd440-6de0-478c-bf7f-04fed86841a2` | Baixa parcial de R$ 40,00 — QA ADV-F21 179240881716335367 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ce872ccd-cc4e-40bc-9c5d-c9d3a8f56fec` | Baixa parcial de R$ 40,00 — QA ADV-F21 179251245414134541 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bb827094-a253-40a8-8f03-64d49a173f4b` | Baixa parcial de R$ 40,00 — QA ADV-F21 179241235943083154 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ee8c8732-00aa-4970-9cb5-02591e9fbf73` | Baixa parcial de R$ 40,00 — QA ADV-F21 17925135310625369 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `565017aa-a5d8-44da-8262-4671a8fec456` | Baixa parcial de R$ 40,00 — QA ADV-F21 179251383833040025 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5b3b5ffa-e5e6-45aa-81d2-66fe019c9f56` | Baixa parcial de R$ 60,00 — QA ADV-F21 179251245414134541 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c780491f-7d02-4438-af47-f85a783ab9dd` | Baixa parcial de R$ 60,00 — QA ADV-F21 17925126933442271 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b0b59360-b062-47ba-a908-51f61a605ebd` | Baixa parcial de R$ 40,00 — QA ADV-F21 17925126933442271 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae3ad3ea-c37b-42fb-a57a-8345ac0d0a88` | Baixa parcial de R$ 60,00 — QA ADV-F21 179251394301264767 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `87a259d5-50bb-4fd8-8a9a-b96c1686ce67` | Baixa parcial de R$ 40,00 — QA ADV-F21 179297216685892104 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `sector_margin_competence_completeness` (rm_finance_sector_margin)

Campo: competence_month (mês de competência). Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":7.26,"nulls":23,"total":317}; limite: {"field":"competence_month","maxNullPct":0,"blockAbovePct":5}. Listados: 23 (bate).

Origem: `finance.financial_entries (liquidado)` — 23 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `9f52a9f6-e130-4512-be43-0b06c1bfbdcd` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ef2d27a-c2c0-45fb-9d06-c9521b034b79` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7d1dd83f-a82d-43f4-be0e-e5674f1095a3` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d853c034-c0f2-4d45-9661-ec8c22a421cc` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7436a177-798c-496a-93b3-2346caa3a57b` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `91f9350c-59f9-461d-a866-5b85571ff39b` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `428eb7e4-f256-4444-9a1e-ac0f45105048` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3f5923d8-0998-4a5b-9e52-4c28335db08e` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ed4fe716-1c69-4120-a5e9-7cfd3810cdaa` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0b78f85f-662d-4f54-83de-5db6f0eb5c1b` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eadcb0cf-6d3b-4278-bb97-8823edba60b4` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31927ba4-a0d9-4651-9219-f115c87f88ae` | TEC-09 concorrência (teste automatizado) | 14/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4c88d979-8d96-4ebc-b7b8-8bbf68aceac6` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `91fe4357-de0d-42a3-b0c1-6536b821f60e` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bb40e4aa-fefa-457c-91a4-283c9905843a` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6445f72a-5e97-4ebb-b462-23ce9d3e5cce` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `38becfb1-2f2b-4948-8df6-09f61b511850` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2b3184a6-1495-481a-b3b9-96bcabbd8f92` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b25cef3f-faaa-4cfa-9798-0ce48cd848ae` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ac4e813-7491-47c4-9307-5c1ced012933` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ceb2072b-7fcd-41eb-9a08-929f8adfc150` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `54b6c779-8305-4324-a57e-8e474b7e2ba2` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d3dfcc11-3d2f-4d8b-87b4-00f312531b3a` | TEC-09 concorrência (teste automatizado) | 18/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `inventory_health_item_cost_completeness` (rm_inventory_health)

Campo: item_cost. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":36.36,"nulls":16,"total":44}; limite: {"field":"item_cost","maxNullPct":1,"blockAbovePct":5}. Listados: 16 (bate).

Origem: `inventory.inventory_items` — 16 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `b1c72b49-42de-47ef-9ca9-5f8f1c0fa46d` | HOMO QA EST-TS-02 179148546833837575 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `728583c9-50ce-44af-893f-e49b0b307140` | HOMO QA M6 08-10 — consumível fictício | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `04ed00cb-650b-4df1-9293-808dd9efab48` | EVID M7 Item B 179243786782490163 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a250ceb5-9983-4b52-9d75-5f97d0327e36` | EVID M7B Furadeira NIKE8 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9fdf324b-6a7d-4ec4-a384-488613bb0ccc` | AUDIT M7 Furadeira ficticia | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4486fb54-b4f0-47b0-add1-ab7c1709554c` | EVID M7B Cimento F NTSA1 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `65192905-c09f-43d1-adb8-30bbc10bb8b1` | EVID M7B Ferramenta tela U3KVW | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ceeef157-399e-460a-b3ae-6ffba9ed0b06` | EVID M7B Furadeira NTSA1 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a5913545-ea62-4fa4-9b3b-6bce17d590b4` | EVID M7 Serviço KXNYA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `46743e0b-1f04-43b3-a4a7-ecbb901894c7` | EVID M7 Furadeira KXNYA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `997e44a4-3931-4f3e-a4db-c317cffe579e` | EVID M7B Ferramenta tela BP8ZY | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `23226f86-1cf3-4648-aea3-455ad29d886d` | EVID M7B Tijolo TI0DL | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `89c63ac3-ed4e-42d2-8598-2f10e25dc7d1` | EVID M7B Cimento F 2A9M0 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `19c33146-553c-4ebb-a028-e59ee57876f8` | EVID M7B Cimento F NIKE8 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5269b125-bb04-41c8-b1df-8561872ee571` | AUDIT M7check teste SKU caixa | 15/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8c564847-a697-44a8-ad4e-aa7ec97f5e15` | EVID M7B Ferramenta tela YJMOV | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `legal_cases_risk_risk_level_completeness` (rm_legal_cases_risk)

Campo: risk_level. Última execução: 16/11/2026, 17:57:45. Contagem da verificação: {"pct":100,"nulls":24,"total":24}; limite: {"field":"risk_level","maxNullPct":1,"blockAbovePct":5}. Listados: 24 (bate).

Origem: `legal.legal_cases` — 24 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `e67e23a6-289e-4d4a-9794-9163ccccdce0` | F06 dossie 17924062603898837 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `39341eab-e288-46dd-8680-ef45cf8491cb` | - | 14/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `6e79eb4b-eeae-406d-8ca8-657cb9f19a79` | - | 14/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `3b0ed627-3372-4cb1-8b48-c87cc95ee462` | F06 dossie 17929774104694930 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7bbd4dc6-776d-40c0-ad4c-a51a454b60ae` | F06 dossie 179240883313738503 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e17f9d7c-14e0-4164-a32a-1ae8bf4dcf33` | F06 dossie 179241460980966033 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3c295018-363c-4aa4-b3fe-ff5578cf6ba2` | F06 dossie 17924148902212985 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f696d473-4474-499f-b42a-f4e27d0df3c2` | F06 dossie 179241493383765356 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7eb86fa3-2fac-49ec-b603-7312409660b0` | Processo de teste QA 1790129099210 | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `524a6758-3f28-486d-ac31-caf0df802c21` | F06 dossie 179241501040061290 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d5fba198-fde5-4b46-aef4-421af7258cfc` | F06 dossie 179234011801846302 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d38c1c29-b5ce-4e2e-910a-04473bb1bc06` | F06 dossie 179234016396756838 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d342cad-37d4-471e-b578-566dcc08ee6b` | F06 dossie 179234117062870615 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ebfd0279-682e-4918-8340-7b7e534d5cd7` | - | 14/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `2d3217ce-6a9f-41d0-ac37-b575aef2a8e4` | F06 dossie 17923412007408495 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a1fcc71-06f2-4b7f-a202-0e5548733a6e` | F06 dossie 179234159451876234 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `68be3734-c136-4073-b48a-3f196286eeb9` | F06 dossie 179234322887165479 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f131476b-febc-4d2e-a5b8-42c2bd932db6` | F06 dossie 179234333806748060 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3744dd63-e3cf-4757-8b09-a0e38dfeac2d` | F06 dossie 17923434494348885 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `87af88b2-96ae-417b-b102-3542f3466e5c` | F06 dossie 179234375471970118 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5370eec5-73f6-48db-9f69-88656c25fba1` | F06 dossie 179234383841759452 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b004107d-4857-497c-82a7-0151b86534c8` | F06 dossie 179241981788746795 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05d9cc30-3426-405c-bd1a-646d170652a2` | Auditoria fictícia do gate de prazos, sem processo judicial ou cliente real. | 28/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e484060e-81f9-436e-bb02-f3cd8c6d1c05` | ACEITE-M5 processo fictício para o reteste de prazos (2026-11-16) | 16/11/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `legal_values_estimated_amount_completeness` (rm_legal_values)

Campo: estimated_amount. Última execução: 16/11/2026, 17:57:45. Contagem da verificação: {"pct":100,"nulls":24,"total":24}; limite: {"field":"estimated_amount","maxNullPct":1,"blockAbovePct":5}. Listados: 24 (bate).

Origem: `legal.legal_cases` — 24 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `e67e23a6-289e-4d4a-9794-9163ccccdce0` | F06 dossie 17924062603898837 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `39341eab-e288-46dd-8680-ef45cf8491cb` | - | 14/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `6e79eb4b-eeae-406d-8ca8-657cb9f19a79` | - | 14/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `3b0ed627-3372-4cb1-8b48-c87cc95ee462` | F06 dossie 17929774104694930 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7bbd4dc6-776d-40c0-ad4c-a51a454b60ae` | F06 dossie 179240883313738503 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e17f9d7c-14e0-4164-a32a-1ae8bf4dcf33` | F06 dossie 179241460980966033 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3c295018-363c-4aa4-b3fe-ff5578cf6ba2` | F06 dossie 17924148902212985 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f696d473-4474-499f-b42a-f4e27d0df3c2` | F06 dossie 179241493383765356 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7eb86fa3-2fac-49ec-b603-7312409660b0` | Processo de teste QA 1790129099210 | 22/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `524a6758-3f28-486d-ac31-caf0df802c21` | F06 dossie 179241501040061290 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d5fba198-fde5-4b46-aef4-421af7258cfc` | F06 dossie 179234011801846302 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d38c1c29-b5ce-4e2e-910a-04473bb1bc06` | F06 dossie 179234016396756838 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d342cad-37d4-471e-b578-566dcc08ee6b` | F06 dossie 179234117062870615 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ebfd0279-682e-4918-8340-7b7e534d5cd7` | - | 14/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `2d3217ce-6a9f-41d0-ac37-b575aef2a8e4` | F06 dossie 17923412007408495 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a1fcc71-06f2-4b7f-a202-0e5548733a6e` | F06 dossie 179234159451876234 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `68be3734-c136-4073-b48a-3f196286eeb9` | F06 dossie 179234322887165479 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f131476b-febc-4d2e-a5b8-42c2bd932db6` | F06 dossie 179234333806748060 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3744dd63-e3cf-4757-8b09-a0e38dfeac2d` | F06 dossie 17923434494348885 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `87af88b2-96ae-417b-b102-3542f3466e5c` | F06 dossie 179234375471970118 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5370eec5-73f6-48db-9f69-88656c25fba1` | F06 dossie 179234383841759452 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b004107d-4857-497c-82a7-0151b86534c8` | F06 dossie 179241981788746795 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05d9cc30-3426-405c-bd1a-646d170652a2` | Auditoria fictícia do gate de prazos, sem processo judicial ou cliente real. | 28/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e484060e-81f9-436e-bb02-f3cd8c6d1c05` | ACEITE-M5 processo fictício para o reteste de prazos (2026-11-16) | 16/11/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `postwork_cost_root_cause_code_completeness` (rm_postwork_cost)

Campo: root_cause_code. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":97.58,"nulls":121,"total":124}; limite: {"field":"root_cause_code","maxNullPct":1,"blockAbovePct":5}. Listados: 121 (bate).

Origem: `construction.maintenance_cases` — 121 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `ff23c133-c159-42cc-8d94-d87d6963e959` | HOMO QA M6 — chamado fictício de retoque de pintura 07-10 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b59f4cd2-666b-44e2-a60d-81e56ab72ab8` | QA chamado editado 28321 | 25/08/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e0eb83e-32b9-487d-9eec-713424e59d78` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d0a97081-92f3-4188-98f4-d11d9d35566d` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ab17bf65-455b-4c65-8e9c-1f00fcfaafde` | HOMO QA RETESTE 07-10 — pós-obra fictício para testar atendimento e encerramento sem evidê | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8d0d4931-8fb7-4a7d-b00f-7c069689d015` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `be1395c5-837b-477c-acdd-0711e16b272c` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c6c7e33a-b3f1-47c7-9309-9d1a9de7f883` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `95ddf326-e76b-4bad-93e4-5411b8f27451` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2d8d61ae-3a87-45e1-b252-de44728fc357` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae2dd432-7d1f-45b5-b472-aca847b2afbc` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a9b3c07-c290-4323-988d-5f45becff0fd` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1331f9ad-7957-45e9-a2fb-9fe76bdd4c4b` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dd5d154f-65f5-4c5a-8c9b-ad78a06e263d` | Infiltração no teto da sala — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5102c35b-91c1-4829-957a-a445f06dfece` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c738df79-066c-4ede-9640-3a285909bbd4` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6a803e91-12b1-47c2-bbb8-5e26f7353893` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `65b7d3f1-5a81-4533-9ed5-b55c5715343b` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `631cecec-45fc-4002-9183-e15ba30f27dd` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `42b67fb8-811f-4b3d-968a-08541a408783` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `61a10444-ad4f-4fe2-a706-7d814c6fd285` | Teste de paginação — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c845aaa1-f82b-4dcf-8dfa-e9b1b594e6ed` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `00d16558-2253-4a3b-a70c-3a6b0e605a8f` | Teste de paginação — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `485ad8a7-e531-4900-928d-589dcd8a23a4` | Teste de paginação — HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `71784b7a-50cb-431b-b264-f3f30de7e0e1` | Infiltração no teto da sala — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eeb531c0-1e4b-4fb0-a388-764b4a5ed1d3` | Infiltração no teto da sala — HTTP QA | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `11ef17c3-d8c4-42b9-8c9f-403afe4523fc` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `71ead9eb-16c4-47b8-807e-21a66ac5ee77` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c1f8e830-5de7-408f-8675-5eae959aa40a` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f4c1522d-c81c-4812-9412-dbb79a3cb408` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae9777a2-3a9a-4475-859d-222cb0e7beda` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1dfa506b-006b-4ede-8a59-f2f8e282ef4a` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `44fc5625-02ea-4d21-9230-80997c125a3e` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `56753876-eabd-4fd2-ba81-337990acd937` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `91bc973f-7ced-46b3-9fc9-998a0ad1082d` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0abc564b-98ed-4e99-be12-86b77b500f99` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ce404328-c6bb-49ab-9ffd-6115dc747eec` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c641c873-8367-4de3-9b05-3c37c1202d21` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2c2af579-2f02-4f0f-98b5-fb5f43616cde` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d101e517-cac8-4d04-bad1-f26e7125f11b` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4573f773-97e4-4666-9abd-621e365ef003` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b0641488-7fdc-4b30-9948-fd82ebbd36ab` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1ab33bbf-5497-4cd2-a550-0484232e27f4` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `64925dde-c7c8-464b-97f9-121c4fa6b803` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e490f2e6-8ab6-4f23-83b6-175702068094` | Teste de paginação — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `36ff2585-9533-45bb-b22b-c94fa4ca2957` | Teste de paginação — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2bfdc4f7-ef1d-4a1e-a458-d7492adc73a2` | Teste de paginação — HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `25554738-50d4-48e1-bd42-8bbf5e778bf5` | Teste de paginação — HTTP QA | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bebb88f8-4fc8-451f-bb4e-0eddd3f22f3b` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d73e249-6d0c-48b1-a2db-ffb5e2ac8952` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fb68f69e-963a-4b25-bf39-23c67f53ba7a` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7024c9f4-fc8b-4059-8765-9c897974bdcb` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e74aeff3-64a0-4c78-a791-6b311113414c` | Infiltração no teto da sala — HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a85cd262-9f2f-41c4-8ce5-9d59c694f068` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da88d14c-e9c1-40d8-8aa8-db6f3e7a4116` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `937fd8b6-0801-4067-b5ef-2e8b20329874` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4007e7e4-a11b-48b1-b83b-156f0a1a5e29` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b0e59f43-511c-4d45-8141-1300c312e765` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ff1c1ca4-1087-4d93-b47a-4f3304218313` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c8e86e00-b655-48ac-bbaf-e1ee05af007e` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8c2d93e9-b37e-464b-80c0-6155f545d2ba` | Chamado de pós-obra — teste E2E Marco 6 (1791403395559). | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f04ade4c-8a6c-42d0-b388-9063482ecb16` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3dc363a9-7f87-4850-8c4c-24f202a21d81` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eea17876-0eca-46fe-8782-a2a33ec10533` | Infiltração no teto da sala — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d6b7fc1d-7602-4747-a44e-292d3a38266d` | Infiltração no teto da sala — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `be5e71dc-68a3-4d68-a3c7-906d1094363a` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e9408110-151b-4771-a171-9e33aff999e7` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b9140d26-42ff-4628-b262-4ff965d7f267` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1264fc01-de75-4879-9953-f16016176800` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `821027e5-af3e-41ff-8455-b00dc7dedab8` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f1bedc6d-33f9-4663-b1d2-6a403ba71bae` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d1ff840-ba58-4315-9d19-245c4f409e0c` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `450581ac-7316-4fa3-8724-3241772678f7` | Teste de paginação — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0a638839-535b-468c-821c-ab8a2a182fab` | Teste de paginação — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a3cb8a77-68c6-4598-aaa4-48214d32eaf0` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5459e7a8-62ae-455f-b78c-cef635579e0a` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `913e745b-93b5-4ddb-86e5-d700cc6f6624` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0c514631-b988-4611-9a69-1b5fe3d31ee6` | Infiltração no teto da sala — HTTP QA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `59a5327c-bcbf-4436-bb64-9c2d015e7637` | Infiltração no teto da sala — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a3cffa6-c178-487f-9f2b-13a03e87561e` | Infiltração no teto da sala — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6e9e403c-e16e-4a8b-bc9c-89a980b58d09` | Infiltração no teto da sala — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3a36b261-08f6-43bb-bc08-9a7c2d08dc52` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6addfb23-7b5d-4a24-8687-5f4e7d959628` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `29789060-fbfd-439b-9606-9033af71ca64` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `16525db9-c6ee-4afb-ad63-d8764f7b1a67` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fc86f113-fc32-4958-9614-be15ddb43cb1` | Infiltração no teto da sala — HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bdd5a68a-a99c-42b3-a5a5-a55d8f0a1bf5` | Infiltração no teto da sala — HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9ac6f786-7d43-4a3b-9000-7e0feb8655fd` | Infiltração no teto da sala — HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a1d676f9-09ab-48ca-892c-ac89e73cc842` | Infiltração no teto da sala — HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `07865751-650c-423e-924a-dcb87ed5f00f` | Infiltração no teto da sala — HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1680b23c-8e2a-49cb-8d57-28d611709ff4` | Infiltração no teto da sala — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b3d38edd-00ca-49a3-864b-3b489ec062f6` | Infiltração no teto da sala — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `70090597-469c-44a5-842e-467e59219a6b` | Infiltração no teto da sala — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0382253c-6e44-4b6e-87ea-a5d9f6b07312` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7d90be9e-7c19-419f-8902-e0f484f7609b` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31ce5025-3f4f-4ce7-a905-41fe352b968f` | Teste de paginação — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `58517722-2c86-45f0-b1af-a6f2f092212f` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `df330764-1803-46d8-b2cd-185fb2e189b4` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `712ddd9f-352f-4b57-8c08-46be0070fe5f` | Teste de paginação — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3d41c68d-85a6-4a59-b8ff-f4327ba6607b` | Teste de paginação — HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a1450468-0ac6-4f2c-bd66-05b849f162d2` | Teste de paginação — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `aad0c37e-5818-47f0-96d3-51f94a7ca2d1` | Teste de paginação — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a59948ff-11ab-4ac5-8e12-12a6fa0a840b` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `41dcd1dd-752e-408e-80ee-fc611bf0eabc` | Teste de paginação — HTTP QA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d71f417e-2f75-4198-8f9c-5f5fbbed674e` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3e4752bc-844e-4051-97b4-df8a7078b6c4` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4b574bbd-1083-413b-9ee9-46fe5de6d2d7` | Teste de paginação — HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4ea491e2-5c91-4e5b-900d-8a3ca1da2db0` | Chamado de pós-obra — teste E2E Marco 6 (1791937586218). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `23327238-f0f5-4df7-b834-d7e5cbe93f68` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `77248d9d-c696-4768-a7d7-dc61d1db0448` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a0618593-5d9e-4234-9156-f4b91967f32b` | Teste de paginação — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `74d63788-7bc8-4a5e-8e70-313f10c7d51c` | Infiltração no teto da sala — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `78cc0d04-e1e3-42a4-9b0a-a72a1d10390c` | Teste de paginação — HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7d3587cb-a857-4c10-bc63-3682abc4053f` | Teste de paginação — HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ac8eca9e-4a14-4cba-bc25-d0acce7d868d` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7b7d2c38-474a-48ec-992a-fc752c460f00` | Infiltração no teto da sala — HTTP QA | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6aef88d1-8274-49be-bf4f-03ee9141f241` | Teste de paginação — HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `02d8d8c2-1915-4823-a30f-baed179c3b7e` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f86fc96c-8576-4562-b22b-5a9f1f55305f` | Teste de paginação — HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0661c34c-c5fa-4c23-ae98-8e639a6a8592` | Teste de paginação — HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e5d94399-98d6-4ad7-b5e9-628ff3de134c` | Teste de paginação — HTTP QA | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `project_delays_ends_at_completeness` (rm_project_delays)

Campo: ends_at. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":98.88,"nulls":354,"total":358}; limite: {"field":"ends_at","maxNullPct":1,"blockAbovePct":5}. Listados: 354 (bate).

Origem: `construction.project_stages` — 354 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `8e22a276-b910-4179-87d0-f706e891ac77` | Etapa 179150119230258883 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a501c5b2-536b-41c1-b1bf-ed271206f17c` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fa4ccd06-c3ad-4521-8644-3e78f55c81a3` | Fundação QA UI 44304 | 25/08/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ca525c21-2250-49a2-8fa3-64f8c44faac4` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b708305a-9b87-4a01-8ec2-5edab93131dd` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b625d93b-9a4b-41c2-8b37-13b7e43db57f` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e5758ed4-48be-42dd-9931-947be66fbcb7` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7ea1437c-ab01-48ef-8f2c-903571ed6f3b` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9c9ecb0a-ae75-451c-8fb2-595fae2109ad` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d35015fc-006c-463e-a4a7-a368081c2bb1` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e6f6ba24-e4b5-4549-833e-ac2058a621ba` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `68021b7d-b88d-41fb-ae62-c8a12c58ff04` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `adbabdbb-2903-4100-a582-414261ee6523` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0ef6d4fd-14f0-4405-a0b1-683f2f70fb59` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fa93e76a-c727-40d9-a1c6-640a7b35144b` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b45409c4-5dc1-4cfc-9e3e-21a919cf4efd` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5ec4beb1-970c-43b4-8167-4b78bbbc6e1b` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ecc33271-1a0e-46f1-8c2f-405abba112ea` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `409a8029-6939-4ec8-b7f8-0edd20479579` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `634228be-1ddf-41e5-a43f-d6b5ed1a7e29` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d03acf40-9c9b-4251-98d1-56dedfdda72a` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `600c240c-08f3-40b5-b192-a896a8441f88` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f53e917a-2954-4c39-aac3-c6573d93d261` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c1fc8354-0855-4d6c-9c9e-6da450930f95` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3dac8123-3f80-4b2d-8c53-02dcc678515e` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e086f883-18d1-4793-bd0a-4fbba78c5ac2` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0ff19c14-443d-410a-a075-81272c0e8956` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d15ed39e-59ec-4e19-82f5-abd461e6368b` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3e26389c-3dc9-4d5d-888c-12d88d9c8b7c` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `07ee3bd6-2b8f-49eb-b52c-e124627c21b8` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f7a687b4-8cef-43f5-b953-4eaf55f8b7d1` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `875ad58b-f2e0-4186-b3d5-11604ba61d66` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `aef5a648-2ed5-4d8d-b71c-917621350aa2` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c8b1e1fe-cad6-48f2-a75b-8988121263f9` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `38d57bb3-5784-4eab-905c-0f616c4020dc` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `980b0443-8550-4dcd-8138-cb8c5b436892` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b1b9caa8-6581-408e-b9d4-054550fcfb0c` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9036cba6-c96f-4698-9855-fa2671eab67a` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b18e14d2-eb6b-4196-8e0b-d8c67574454a` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `413a5c60-2d0a-4ca7-a75d-fad35c5083b8` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `06bb60b0-f19d-4f82-9655-685c239fabc1` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d28d00ed-29c1-4787-bcf2-10438611f5ad` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `52dfa628-64e5-474c-938e-cfbb0c91585f` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `33cad5e3-ccea-4f97-9ce9-9bddf5fc2c0d` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `35ddb423-7779-4d81-966e-1399a3669188` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9685aafa-8e6f-4a22-a976-caea5367760d` | Etapa 179152675333469239 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d9787c20-e537-424f-bc1d-ab2ca8298cdb` | Etapa 179157891659194931 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f17f4467-bf69-4be1-9bd5-63076b1467a1` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `96d737cc-fe05-4452-816d-245441009eac` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `50e3b0bd-0125-4f89-819a-79f30371cd2e` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `48d03d36-0458-4adf-bc08-43df790d1610` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0d921bb3-e4f5-4960-996c-903fba5afb24` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `870029b6-ce3d-445e-9e90-95e0a04f1831` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f67bbd95-c05b-4ee1-9947-7a9ac1dbd2f5` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4edc927e-46d9-47fb-9147-892309381078` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d22c4371-6231-4ae7-9058-9ba816770aff` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8c61a129-e4b4-43bd-a1e1-79e2ee125278` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `09941dc5-4b1c-42bd-b571-c3762086016c` | Fundação e estrutura | 07/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `478f1376-f5b7-49ff-981d-fdd311ebd285` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ce6e9371-02b8-4c25-bac7-602a50e8d61a` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b67a7490-0af3-44a9-a188-44436506f3b7` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `536ffe7a-ec67-4865-b58a-fbb3c96eabd6` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e0a5f18d-4a02-40ce-bef8-7046e5b0a607` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3c03484b-ab40-4d94-9df8-968855446c07` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `46c5bf32-2a1a-4cab-9f37-027bf52077ac` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ad3c842e-5d2e-4826-a1bf-ee3a4f565af1` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `04bbfff9-ff86-44a4-b8d2-a747824571fc` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9303345c-37ea-4a9f-9a64-e06b24ca26ab` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c67c27a7-f772-4822-a2e9-04749d47e23f` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c96de684-68f7-4dae-b7fd-d722ccb29f89` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6fbf13f7-92db-411b-9660-c731b965c651` | HOMO QA RETESTE — dependência B 07-10 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `874a8442-b40c-45d9-bdcd-87fc45fdcff6` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b6d88953-ac61-4d23-aef5-91dd7819dca5` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2d6dbfe0-1c55-41ba-ad4f-1bc7c38b692d` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1f462b02-dac3-4a8d-a75c-26b3afd458ca` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3e6ae458-a0df-47b9-bd0a-e168e8b18d76` | Etapa HTTP QA | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a28ffc41-aba2-44bb-a635-70b3d59474ca` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a7cfcf42-3c3d-43ef-8ab6-818ef6d22d4c` | Etapa 179149256532348667 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `53f7ea43-ce03-48f6-993e-47992c8dcbb4` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `81e82b3a-4641-47b9-886e-29ae63b2548b` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b7459cdd-f7e6-41d5-9a19-4949dde5346e` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `132f8e7f-86c8-49c9-8f14-54b774bcd788` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cfa40857-9c0f-4b48-88e5-ee10d01960ca` | Etapa 179149263998029491 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9a99b40e-c8ff-4e87-a95c-65276a78d1a0` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5538782b-4fd3-487e-9f53-af8486ed2ed2` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `accf0dbc-4943-48ed-a078-22c85c6a0fdf` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6124d7bc-3e43-4411-8ccf-93c835b79a82` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d164674-06a8-4767-b511-70fd5fcafcb5` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b0a1d1af-f418-4921-919c-70c0f5216c72` | Etapa 179151957322473988 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `febceb00-be61-48ec-acec-59e97b6d65e1` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `94ffa47e-5306-44c0-974a-4db1d0c3c5c6` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8bfdc3ff-90c9-4535-b938-d72d9fe67836` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da09f8cc-bbb3-44c5-b1e7-edec883a8106` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `24a07a8a-7d43-45fb-9a19-f12108a1e788` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a52d82f0-20da-4d33-92ba-9b16e816f2c3` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eda19f65-ba8f-4336-8f5d-57b429349d91` | Etapa 179149373373934620 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c9c144d8-38e6-4971-9493-69fa6333946b` | Etapa 17915195863284807 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5e7a8825-57b1-4e9f-8e2c-0d9e7beba6be` | Etapa 179157897361173861 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ec0f4ef5-47d4-439d-96e5-310b26205839` | Etapa 179175002641974091 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9fe651fb-a2c9-42cb-b537-f920d8cdfa0f` | Etapa 179192812633179975 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `49b8cbba-0c7b-4802-b7fa-0f0cb1f04076` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `674c8d6f-f5af-401b-900a-b3ea56402958` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ceda44fe-0726-46ac-a710-5d7335ec5c60` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `906a4e44-a228-42aa-92d8-553fbdf9b74a` | Etapa 17914936850739262 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3e22498c-3d98-4708-a96f-8fc9a7e20f16` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e92686e5-7814-4f44-89cb-d2ac9dd4c78a` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1c97e5dd-1c8f-46ab-b2a1-52ce981d8f13` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `730880fb-55a0-4289-8bc4-ac5b40090a3d` | Etapa 179192818011247717 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dceb3a0f-5678-4dd8-89d4-d988b322888b` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0f8f672f-6b9d-4958-a4d1-d52ef7da38a2` | EVID M7B Etapa | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `58a7d8bf-f1b5-4cab-b5c7-cc3238b85da1` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `85b392a3-7686-4047-9c97-be48f2953929` | Etapa 179149153824414398 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `87b457ee-d9b7-4514-9e3f-57fbf1c58506` | Etapa 179152678972053651 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `9c933bd2-1c5b-4bb5-a7fc-90f979b8cd71` | Etapa 179149154700258510 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `445405c7-d419-4c7f-be1d-fa1e3335b89f` | Etapa 179149160435556811 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fbf40557-3f30-4543-afcc-0c40312d3400` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e632b7bc-70cf-4e12-a9eb-d41df92622cf` | Etapa 179149161743576861 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `66403a71-7e49-40ab-be7d-8fc99e7c5513` | Etapa 179149176505548444 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0c51031d-9051-4367-b01a-95d6a43f6573` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `452cb647-5c84-4893-85c2-57f3644d98c4` | Etapa 179149179175481929 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8b575ad6-cf91-4710-8929-a7a830a3c28f` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5b4eaeac-c2d3-40fa-92f0-51e14e053b57` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `707a0213-a38c-4d8d-bfa6-70f56ad7ab5c` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dfbec891-d81f-44f4-9300-b30b6497c503` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `28fbd488-53fe-4c06-acb2-220886e236bf` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `580de0af-0745-4399-84cf-0a70c0299e79` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cc2a7fa1-5d14-4fe0-9bba-2f749ed403af` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `151cd314-5f6d-4c3b-9eca-f60bd8fbfd36` | Fixture QA — Etapa de fundação | 08/10/2026 | (sem autor) | resíduo de teste (marca no nome) |
| `224ff083-239c-4e17-833c-f8bebc05a5b1` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bd5192c3-9c4b-4623-96d9-28f4166c29a9` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `98d8878a-2c4c-4ac7-ab7d-9895f445134e` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5fe64403-5659-4644-8ea1-039690440900` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fa1c845d-4069-44d1-8024-026b744f17ad` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a9ca5b43-a2c0-4a1e-aec2-badd114bd5c7` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f5f80907-b05a-4a8c-b01b-ca7d30866030` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1e63f2a2-5db9-464b-a410-1f10e3c058cc` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `69c3b30a-40e7-4f89-8029-2139c1ab1d5a` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a17a2819-7a7e-4672-af95-c23592b5dc6d` | Etapa 179199329085165207 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `023caced-f430-4c4f-bde1-cf2038d66a40` | Etapa 179240968556655304 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `03ed462c-9607-4b70-a9ed-7adeb3f5fa78` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b1d24ff3-58cf-40bf-a825-1837acee86b4` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `52d66f08-09fd-4111-ac23-a72348eb5e95` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2b9d2cf2-dc1d-439c-b157-a22d9fcabe88` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `760de28e-0b4f-4dcd-b3f7-9beacdf7e273` | Etapa 17921804920183195 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4c386b38-fd28-4cd6-9989-ec7d45d16f68` | Etapa 17924096988639286 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4abfd459-23eb-4d5e-ac08-9258230ff58b` | Etapa 179216779918238682 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1c1e1e9b-f669-4268-acf5-4f59c13dd098` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cbca4bda-f9f5-454a-8199-952236dea084` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cc4ae7fa-153d-421c-9d1f-073dec806746` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b76ed60c-0e5f-4cef-a5e2-ae435d108645` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `17df8d22-a6a8-4d1a-bdf9-e46015d57d69` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `056d23bc-c2a3-4449-ae9a-f42b7d502b57` | Etapa HTTP QA | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `34f4fdb9-b5fa-4f7a-834a-4c46eca36ad5` | Etapa 179152073916570176 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `03c3b8e5-ffbb-413a-8ad0-9284260267fe` | Etapa 179152081549585767 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7dad1c42-4af1-4d1d-83ff-256708ee1001` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `927f5636-f3e4-4c07-9bd5-0744fd3f945b` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da5de658-646d-4b8c-9f76-32b63bb1004f` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `640b291a-fe55-4ab4-8abd-87c110ab8742` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `363ad82c-584e-47dc-a494-7319a9399d27` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a595c79c-a199-4f1d-a5c2-d2ef21bb4caa` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `848ac346-51a7-49dc-9274-05bf6d7ebe49` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c7e9f52a-6852-4787-b01e-382da04a8ca9` | Etapa 179182895403941982 | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `385c8206-c762-47e2-b017-e49deab6270b` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `246d9c63-0f2c-48ab-af19-00d182f57c4b` | Etapa 179182903982438337 | 12/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `00b671e0-44f3-4db1-9f7e-d9776214156a` | Etapa 179191140961895994 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `90b738b5-1170-4fc7-953d-560afc21507a` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `044db5a3-7116-4877-9673-50e761e69a13` | Etapa 179191150647245052 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `29e5f108-9af1-41d6-86f4-f6c85902ba22` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a52067a-bc7b-4cb9-9762-be4f481b7a1a` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `794bece2-0e55-4f28-9dcb-86c7078ae772` | EVID M7B Etapa A | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0c040e87-82ec-4540-94d0-1fda60afd49e` | EVID M7B Etapa B | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dd328562-d0e5-40a9-9bf7-8bad6feeeb62` | Etapa Fictícia R3 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `67202d73-75a0-4433-8d20-2091ef8ea0f5` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d1e14fac-7979-4833-bf97-0febcd6741cc` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f42e070c-7aea-4ed1-8a6c-695dca5be1d5` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `99d42001-af9e-48d9-a2c3-2947b5f5e590` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e45c5fcb-99f3-4b2c-b197-dce1faa2ed24` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `751fd733-85c4-48bc-be29-7fc4dbb7901b` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `80afd957-8253-44af-81c7-2874de87be1d` | Etapa HTTP QA | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ed0d743c-6916-449c-9cca-bc5d4063b0f8` | Etapa HTTP QA | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `66c0276b-1a9f-4f8c-8d3f-9dfd8713c6d6` | Etapa HTTP QA | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `77b68822-3d90-4872-bf8b-faac74d52fee` | Etapa HTTP QA | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `908f28e7-837c-41c3-ab0d-f4e003c2e62c` | Etapa 179189456165933110 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ca2f10b2-55d8-427a-96d7-9fcd3ffba5d2` | Fundação e estrutura | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a771b072-2655-4177-a9fa-65a80024ecf0` | Etapa 179189473524960996 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `240f8319-c538-4349-a435-69367178d76a` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2a1d8fc1-1113-4a84-bbcd-71d6853007cd` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `92e29c57-5b76-4446-93ea-128f9743f5c7` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `667e67c0-3e3f-473a-a763-14e4aabf4095` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3ee6f270-7d9b-4a99-8cd8-4446ffebd50e` | Estrutura (teste definitivo) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `92b0065e-1915-4e44-bb0a-54268f5af0c3` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ea785fc2-1261-4b81-8673-eba75f3ba41d` | Etapa 17921783075947945 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e6e2364b-b94f-479b-a714-6ac2ad5be213` | Etapa 179217839703541863 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `371c8d53-b8de-4550-b872-b52ea404b189` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4b312a13-fa68-4bb1-9544-ce4cbdd89f82` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `60113e58-7237-493c-8e2e-c0cf0952fd71` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2985cd51-c1fd-48de-911e-2c99ad867112` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `02b4a5ab-7fc0-4ddc-a1ea-21f9db80b3b2` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05fad480-e26b-4852-8c3f-583455cd4377` | EVID M7B Etapa A | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `63755329-4873-43e9-b4bf-f0c2e75bdfa7` | EVID M7B Etapa B | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8943ffdf-e115-4d51-82d1-f79656f3e67d` | Etapa 17915012721424963 | 08/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fd34a6c3-c09a-4074-9cb1-9f4747b1711b` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `76cdd06d-ae34-4031-9858-b101b4207ea5` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d58859b2-5109-43be-b503-56a8f2fc5411` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f7c328da-e58d-4c19-bfa9-1a2a32e2ee46` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3d821e3c-7ae8-4d85-a841-0fac3e8e620a` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `df2710ec-6b2f-44df-a0b5-b44303b7804a` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7456a898-0859-4a44-82e8-db0d11fc567f` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c87be3ed-15fd-48e7-ae02-09a13b9580ec` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `71675576-ec11-4f0d-9fec-132f05aac6e3` | Fundação e estrutura (teste) | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a61d2497-98b3-4329-8507-f671d4186503` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `32889818-afb2-438c-b4dd-47273e27be31` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `74976498-de9a-4629-a585-00a2c5fb5874` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `390c0f94-2ed0-4103-9a57-5aed5b6f2d8e` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ab1bc949-e738-4525-a9a4-2d732d72a856` | Etapa 179297350890683045 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4a76e082-a89a-4859-8534-6cb6fb673aa6` | Etapa 179297352222541619 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `78e4a9e2-9432-43f4-9929-b0edcbd94a59` | Etapa 179218004882716758 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fd5ba82e-5b9b-4b68-9f17-160f3649e9dc` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e64e669-ee44-47d8-a865-10dd6ff67862` | Etapa 179153017109417203 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `42b4006c-44ca-4ce6-96df-80bd981b694a` | Etapa HTTP QA | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ee4769a1-b3f9-4af4-ae7d-f37cf138be69` | Etapa 179153024044138512 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6797869f-1934-48a3-a688-41ea47391c56` | Etapa HTTP QA | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `410c9258-40ae-4e61-88f1-f378327dcded` | Etapa 17921785134751706 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2bc0e567-66ea-46d2-a75e-745c8bdabc35` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `63e735f7-6178-4590-8c57-58646ad23786` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f5ff5c90-e1a8-4c2e-af79-1f0b560ac3ff` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `02be742a-aeff-4b15-a2d5-aa3ea5c4ab83` | Etapa 179152289749622488 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7720b8cc-d17a-49d5-a1ec-2d6f95eef808` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6de478a1-7df5-4c49-b65a-bfe6514ba32b` | Etapa 179152297317275048 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0a77bf27-c952-4fcd-994a-1efb0cbe81eb` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a73ab727-65fa-4702-99ac-1caeba7a75cd` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `01617717-1aa3-4f33-b257-9c25f9b0f63e` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `53da85ec-2774-4987-bd19-a25426951985` | Etapa 179189291291529839 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eb1bdbde-8a4e-4bb0-9ae1-15f1979cc879` | Etapa 179193913287637153 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1613f3ad-de08-4873-8600-f5eabd57a47e` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4dc0bebb-7555-4be1-9f31-28cd7ea88d86` | Etapa 179193920775679473 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d5c1741a-f6b1-4357-9b46-524b36a4905f` | Etapa 179189306741175358 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `00c723b4-b919-46ee-8101-46b1f36c7ab6` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9fa94827-b7d2-4fe8-830f-e11ee9eacdf8` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c378fbb1-abcf-40db-9402-ab51cc7158c6` | Etapa HTTP QA | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `444c2cfc-a7b7-444a-aa02-bd8f4ae94f66` | Etapa HTTP QA | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5786a5c5-6d2f-4d65-bbad-824add89b17b` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `086d25c1-3526-46b3-9a78-eefe57c589bf` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4902f61f-905f-4561-aefb-89010392e325` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f4a54eba-f55e-459f-b3aa-9907077d8fe0` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7b67c698-8c7f-4911-a6b7-29a4dd4a4c5f` | Etapa 179152815442663341 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cbf5ecf3-9096-4e1c-90bd-07670996c5b9` | Etapa 179152816825197396 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `78f1d444-40f0-4197-a9a8-877646cacb9c` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `832bcebf-c51e-4fd7-ae67-770720f3ba8a` | Etapa 179199322578028679 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `78014a28-a90f-439b-941e-37f58da14844` | EVID M7B Etapa A | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5576ac47-4fc2-4849-8d3c-491f00f71dc4` | EVID M7B Etapa B | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `30330f36-ca2d-4eb1-8663-6dbfaef44258` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `61172d0b-7bc6-4fa5-a42f-6b243b956297` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3a99b909-8269-4f1d-8068-9741b4d02c5a` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2579d275-07f0-4e11-9684-281016466206` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2821caf7-39ca-467d-931c-50af6f59e5f5` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a8ba1bf2-7128-482f-9d8d-3387f1e94ad7` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9ec2f4fa-8e76-4ba0-a1ce-0916c892f124` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5320d3fd-8b8f-4638-9912-5e52c28b476a` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `40b401c5-14f9-4dce-874d-851d6393bc74` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `98f7c882-cfdb-4b82-8fdc-e29a9352b91f` | Etapa 179199358549464831 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f97746de-64b3-486a-8dc1-83363e68fd70` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6a0f27f2-8848-4be0-b2fc-c38ddd833ffb` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `92609a90-72bd-4655-94fa-b7a5ac665fb7` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3227633a-8e34-4dc9-a3cc-03179342ec34` | Etapa 179199373103834806 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cdcabf70-41af-499d-ae54-4f6c97812c92` | Etapa 179199449511915026 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1a054729-6cb7-4ae7-b715-6895d879b671` | Etapa 179199455844992474 | 14/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `54ebb96a-ab98-4b92-a383-ba1e7559a97c` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `92d6bc05-576c-43b2-a18b-03937e722a55` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bce29a93-d5e5-4cc9-9f46-9b3969f7907b` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c8225802-a119-4ffd-a242-83c1fd8fac2c` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `045b037b-4dd9-4bc8-bb4a-c03071ba44b9` | Etapa HTTP QA | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `088ee10c-b084-4f01-9865-15dd2081c80c` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bf52754b-f870-40c3-9884-ea69a8223630` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `40308574-7dff-4343-9203-c902c2b4c0db` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8277ef27-8330-4564-9c20-b8d3f6df292c` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `094289f8-c6fe-4b5b-bd2c-09420a2b5e80` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a72c488e-7d76-4899-adc9-b37ecf596da3` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `364131b4-b344-4684-b548-f1c6d4e7d693` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `24e40410-6503-41b6-b995-57211b574708` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `306e228b-568e-43ce-a507-29730067fbf1` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ca38ead7-5997-4855-809d-a7df57244a63` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d5ae7053-df8d-45f8-809b-5a8901dc3d20` | Etapa 179241343862359447 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e31c68ea-7624-41ca-8a20-522e6215efa7` | Etapa 179241345181133741 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a6ac15b6-99db-41ce-bbe9-e37e381bc391` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0e88004d-bb67-478e-a636-4f98cab0717e` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2487b5b4-fa16-49ff-99c7-dde325120afe` | Etapa 179152184661780080 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `210b0e10-f846-478d-a525-b8579f782768` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6deca87c-a52c-4e60-b75c-ff00a54c1e28` | Etapa 179152192003278687 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `630ebffc-aef3-4934-919e-95405aa343dc` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ee77141d-ae77-4e8a-93e2-c71208af6ded` | Etapa 179193026384231731 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bcbc75e9-0aa2-4d14-8cae-607da1fb9347` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f3363091-b8ab-493f-a307-65c11b4e8484` | Etapa 179193033392087454 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `663f129c-0421-4469-8953-4ae17a9566ed` | Etapa HTTP QA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f2dc1d46-be57-4018-aa9e-922ac44379ca` | Etapa HTTP QA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `edc76520-ad10-4f1d-9b7f-c47e69bf03b7` | Etapa HTTP QA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `72143c30-361c-47f0-99f4-4c04279b0e77` | Etapa HTTP QA | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1a2d27ba-56ae-4b42-8203-ae4f374fe9c2` | IA Etapa A — estrutura | 22/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4a7ab1c0-f0b5-4206-b50a-ad24b3b471ea` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `422ea120-5610-49ed-8b37-ed08f0d8da9b` | Etapa 179217925528756162 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dad81427-d551-4cfc-8efc-af1f9ee98011` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d80f93f8-e043-4c23-99e2-023b58162aea` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4795c4a6-3427-4018-b5ed-fc5f83049d8d` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `354da8e2-504a-4862-ac0d-06492fb13851` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `13c3c1c0-62a6-48db-acf4-9335fe94f352` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4ef214ac-f67a-47ed-9892-d1424d885693` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `46f92f35-25d6-4b16-9a86-136bfb20473e` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c661192f-4bdb-4ce9-a168-d09fbe237961` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7d412105-5fef-4efc-a129-8ba62518556a` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f0066ba4-5c09-470d-9a74-7984fe572762` | IA Etapa B — acabamento | 22/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c30fee17-a36c-4f37-8bc1-97bd3290afac` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `585844a7-9843-4395-9618-733da124b0c8` | Etapa 179151867950886096 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6d55f20e-74e9-49b7-a652-8affdfd8407e` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5953d0df-0ca7-4f12-a7f1-a90728b898ad` | Etapa 179151875961938802 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6cad7e51-ce3e-470f-9374-7f73721e8355` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae2a847a-c8ef-4c42-9049-4da135e80d40` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `326b8ae7-353c-4182-95a6-7c9119a00fdc` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5502765d-f4b3-425f-a932-93bd05312015` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `24e8ecf6-fb32-479c-92e3-031c72c3dc07` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5a0a8c68-45db-4f51-adaa-0556d9cd9420` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b5d95450-e8cf-4357-adf0-8dcf6fb47aa5` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `48f9bfad-add5-4ac3-b7f3-e65e0652ce04` | Etapa 179176305837511816 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e9660133-e944-4a22-a976-d78afc63d1dd` | Etapa 179189176495748279 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d5ae482b-7cfc-4aaa-865d-8afcdee73d8f` | Etapa 179176313429911110 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4ef995d2-5c65-4607-ba29-55def7cf7b3b` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e2ff8e43-14ab-4423-9ba5-f244fe7747b0` | Etapa 179189192496226110 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `81db3c6c-7471-4baa-b766-b2ffb8b88656` | Etapa HTTP QA | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c54fe33f-5eb0-4755-a736-d3770d38f23a` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5bdca454-7acd-4a11-9261-c3f735c8425a` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2f8f83c4-e472-4dc1-aea7-ca94851edf72` | Etapa HTTP QA | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0b783618-02b6-49c2-8cbd-96be18acb843` | Etapa 179216754283637393 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dcbc3a99-e9bb-4a15-8c6c-2ed3d9df955c` | Etapa 179216759657752351 | 16/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `670557ed-3e93-455a-b44a-8d86ec1bc91d` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31be719a-9b16-430c-ba7e-10f4fe151b37` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `809e4217-a4a5-4822-8b17-17d64825c406` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1bb9c9d6-736e-420a-a9ea-44dcaf0ff528` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e884fc94-bf6c-48be-ade9-7e82b91377d0` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2438f1d4-aac6-459e-9050-ba92c6fb7108` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9b812da9-a315-4b0f-b7ac-d08775216c6e` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `908dc82b-767f-4ca0-bbd7-0bc63b020ac7` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1f8c9e1e-865c-447a-b417-89766a2c6f12` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a8465423-2068-4f64-a0e9-6b3ab75ea1ac` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c44ede37-6f21-4e5a-a6d4-742f949a1e2b` | Etapa HTTP QA | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a454caa1-690a-4a40-ba49-5ea68a5eab09` | Etapa 179174996470287797 | 11/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e4d93cef-cfbe-4130-bdee-a21569938904` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c53c3abb-f70b-494a-9ea0-aa4be6e45f6c` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `001ef01e-e0f0-41cc-acd7-99abeb780d30` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4256f3c4-daef-4bc5-bdc6-1f1c191e7f3b` | Etapa HTTP QA | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `181b54e7-b196-414c-b364-7abb593209ea` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2cf05e1d-aae0-4cd8-97fe-a4f68397ac5f` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `48bd3384-cd86-4798-a00a-5598e5ab5a88` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e4472fb6-0926-46d2-9f7a-e9c41439bc08` | Etapa HTTP QA | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `044751a0-6dea-4121-867d-2f7635889f70` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `14d7c938-5ab3-420c-948f-910ab42c020d` | Etapa HTTP QA | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `project_nonconf_cause_code_completeness` (rm_project_nonconformities)

Campo: cause_code. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":100,"nulls":15,"total":15}; limite: {"field":"cause_code","maxNullPct":1,"blockAbovePct":5}. Listados: 15 (bate).

Origem: `construction.nonconformities` — 15 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `27e83ab2-511e-41ea-85bb-2f4bbd30db42` | HOMO QA RETESTE 08-10 — NC completa fictícia com fotos; nenhum reparo real. | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `400cfb23-db1a-4313-ab69-757d3a9c62ef` | NC ficticia para teste de gate de entrega | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `00ec8c76-928b-4f09-91b2-57af1da4fff3` | Trinca identificada na fundação (teste E2E Marco 6). | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31847bb4-2c58-4327-a5d1-c1e10f06a819` | QA-DEPLOY2 NC | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c762ffe0-c49b-47d3-bd85-cc8078eb6dfe` | Trinca na parede. | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eecf4a43-d41d-43c6-985f-cb893a5a97c1` | Trinca na parede. | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5f29541b-ae2c-439c-99ce-06c53db70b06` | HOMO QA RETESTE — NC fictícia sem responsável, SLA e evidência antes; 07-10 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7a7b7b9-7377-47f8-871a-4c43cb7486e0` | Checklist de qualidade reprovado: "HOMO QA — verificar acabamento da pintura" — HOMO QA —  | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `868c289f-f0fc-46da-a404-8b3ba16e5c66` | Rodada final: NC média fictícia (teste de evidência). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ec59340d-27d4-4494-bd1e-53f98fbb1c48` | AUDIT NC crítica fictícia: fissura estrutural na laje (teste). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6c227917-0f11-4eaa-ae9d-7931a5447cc3` | Teste definitivo: NC MÉDIA fictícia (pintura). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cbd1c15d-fcd5-4941-b431-51642389dcd8` | Teste definitivo: NC CRÍTICA fictícia (viga trincada). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `607289d1-358e-493b-b0b0-34c902a9e502` | Pré-deploy: NC CRÍTICA fictícia (laje). | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0fd047c9-46d7-478f-9d1d-1cdb74de62f3` | QA-DEPLOY NC 01 | 23/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0c5ad9e4-c119-41eb-96b3-79f30432e346` | IA RETESTE 24-10 — NC fictícia para validar armazenamento e fechamento | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `project_occurrences_cause_code_completeness` (rm_project_occurrences)

Campo: cause_code. Última execução: 12/11/2026, 19:29:24. Contagem da verificação: {"pct":100,"nulls":15,"total":15}; limite: {"field":"cause_code","maxNullPct":1,"blockAbovePct":5}. Listados: 15 (bate).

Origem: `construction.nonconformities` — 15 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `27e83ab2-511e-41ea-85bb-2f4bbd30db42` | HOMO QA RETESTE 08-10 — NC completa fictícia com fotos; nenhum reparo real. | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `400cfb23-db1a-4313-ab69-757d3a9c62ef` | NC ficticia para teste de gate de entrega | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `00ec8c76-928b-4f09-91b2-57af1da4fff3` | Trinca identificada na fundação (teste E2E Marco 6). | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31847bb4-2c58-4327-a5d1-c1e10f06a819` | QA-DEPLOY2 NC | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c762ffe0-c49b-47d3-bd85-cc8078eb6dfe` | Trinca na parede. | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eecf4a43-d41d-43c6-985f-cb893a5a97c1` | Trinca na parede. | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5f29541b-ae2c-439c-99ce-06c53db70b06` | HOMO QA RETESTE — NC fictícia sem responsável, SLA e evidência antes; 07-10 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7a7b7b9-7377-47f8-871a-4c43cb7486e0` | Checklist de qualidade reprovado: "HOMO QA — verificar acabamento da pintura" — HOMO QA —  | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `868c289f-f0fc-46da-a404-8b3ba16e5c66` | Rodada final: NC média fictícia (teste de evidência). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ec59340d-27d4-4494-bd1e-53f98fbb1c48` | AUDIT NC crítica fictícia: fissura estrutural na laje (teste). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6c227917-0f11-4eaa-ae9d-7931a5447cc3` | Teste definitivo: NC MÉDIA fictícia (pintura). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cbd1c15d-fcd5-4941-b431-51642389dcd8` | Teste definitivo: NC CRÍTICA fictícia (viga trincada). | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `607289d1-358e-493b-b0b0-34c902a9e502` | Pré-deploy: NC CRÍTICA fictícia (laje). | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0fd047c9-46d7-478f-9d1d-1cdb74de62f3` | QA-DEPLOY NC 01 | 23/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0c5ad9e4-c119-41eb-96b3-79f30432e346` | IA RETESTE 24-10 — NC fictícia para validar armazenamento e fechamento | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `project_progress_planned_end_date_completeness` (rm_project_progress)

Campo: planned_end_date. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":98.87,"nulls":436,"total":441}; limite: {"field":"planned_end_date","maxNullPct":1,"blockAbovePct":5}. Listados: 436 (bate).

Origem: `construction.projects` — 436 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `cb0599b5-07b9-4b1e-96e1-dbf853f3019d` | HOMO QA HTTP Obra 179141779610732974 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0eb337e3-75a1-4b91-b5d3-a62a22e671d8` | HOMO QA HTTP Obra 179135845250044824 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `167f57db-1ed4-462a-b475-9fef0d19ba26` | HOMO QA HTTP Obra 179140309586447698 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d59c29b6-ddc9-4e3d-baf8-c76b080b4de1` | HOMO QA HTTP Obra 179136035175925829 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1c8c71b7-a353-42ba-8e9a-cb7d4b418fd5` | HOMO QA HTTP Obra 179141781536415817 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `86c07e5a-edaa-4fc3-9ead-15edaebc72c1` | FAILURE DRILL — Obra 179149179175481929 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1c8cd93f-392c-410a-9bd9-55fc71ab90d9` | HOMO QA HTTP Obra 179140316323851375 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7a1d21da-a0cd-41d9-a774-5a0d128ef33e` | HOMO QA HTTP Obra 17914811442672101 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `835eccf5-9481-49b8-9fa6-e48b9e008b71` | HOMO QA HTTP Obra 179135892312136572 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9f2740dc-1777-412f-9403-7e7a3f061bc3` | HOMO QA HTTP Obra 179135851376410352 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e4812921-e051-4205-985f-e0f95c1a9109` | HOMO QA HTTP Obra 179135894823578133 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `097934b4-4592-41cd-8e87-f11bb19ce812` | HOMO QA HTTP Obra 179138874748896733 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7b2f331-a70a-4eb1-80bc-61439d73b792` | HOMO QA HTTP Obra 17914138237649795 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6cec8a7b-50de-442a-8b2b-e80fa1c8220f` | HOMO QA HTTP Obra 179148114001770575 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d8c0804f-327f-49bf-9ac9-7853b2e55a25` | HOMO QA HTTP Obra 179148115476068664 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1300e14f-c2ec-4548-8a9b-b51a3ae96f55` | HOMO QA HTTP Obra 179138876975634880 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae2b7d0f-1139-4bc0-99aa-b1e2a7e452a9` | HOMO QA HTTP Obra 179138187437874541 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1d0ffd71-a952-4963-8281-26499ca90ec5` | HOMO QA HTTP Obra 179138312346171674 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `af22f251-9ec1-48de-be12-9f9af4a1ddd8` | HOMO QA HTTP Obra 1791358860706731 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ac9fe9a0-10f7-4c14-8705-c3af006545f8` | HOMO QA HTTP Obra 179138190657990899 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cda8c507-51a4-462d-98b8-907e41049ded` | HOMO QA HTTP Obra 179135785366347888 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae02628e-26f4-4876-8757-9632602e2d44` | HOMO QA HTTP Obra 179135785648558822 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2b416bc8-bb2f-4ae2-8c44-e7f69d8979d4` | HOMO QA Obra concorrencia 17913533671783061 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05bea638-1f15-48c6-bcec-6e47a3da6a58` | HOMO QA HTTP Obra 179135788969948569 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `07d83a02-6127-45d6-b2db-8bb2ea31f8b3` | TESTE AUDITORIA FRONT 1790781898767 | 30/09/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `60710537-9281-441c-a834-0722dcb662ea` | HOMO QA HTTP Obra 179135789293337012 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5446fa0b-771d-4dbe-b376-5f5283d7af9f` | HOMO QA HTTP Obra 179135888717867829 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5ecd5b57-f1d8-4a95-b078-da1fe37a7880` | HOMO QA HTTP Obra 179135827339459911 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0210fa48-2dd3-4a53-8188-4a02f46279e8` | HOMO QA HTTP Obra 179135830011118210 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31078ca4-3c19-4886-b96d-ef1007da6382` | HOMO QA HTTP Obra 179138836242699245 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2d4025e1-dc58-4a12-b556-702c9312ff05` | HOMO QA HTTP Obra 179141738377158016 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `aef6c4d6-f227-4033-97b3-e630482c23b6` | HOMO QA HTTP Obra 179141740491126236 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dbbb07d7-aa8c-499f-a168-ddc7f8913b21` | HOMO QA HTTP Obra 179142289760814748 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a3b3edf2-ef3a-4c6f-baea-cc9103ac9114` | HOMO QA HTTP Obra 179138314097437666 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `36eed7ac-77bf-4109-8f56-44b96ae766ea` | HOMO QA HTTP Obra 179149369237958672 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e3e379c1-fa8e-4384-9cda-5e0a5e92058d` | HOMO QA HTTP Obra 179149371606392919 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ad12855d-8460-430d-8c93-a40bd4eb1bd8` | HOMO QA HTTP Obra 179150075473823111 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `56329e7c-6fc1-48fc-85c3-ee32b4398506` | HOMO QA HTTP Obra 179149374355475238 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bef36a76-d683-4c6a-9b47-2a9b35311c4a` | HOMO QA HTTP Obra 179148117898123578 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `374c7832-bd4d-4a53-b250-578abc6de7b1` | HOMO QA HTTP Obra 179135982095560459 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `16e32d4c-87c7-4991-bf4c-a5758f8db44e` | HOMO QA HTTP Obra 17913603343839351 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4158f4b5-1466-4041-b325-3179fa850bde` | HOMO QA HTTP Obra 179148118222468801 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ceee3cdf-e739-40e7-8c58-9166f244cac0` | HOMO QA HTTP Obra 179148119124924716 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `55dae050-154c-4986-bffa-f958cac508e9` | HOMO QA HTTP Obra 179150076073793449 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a2982c9f-d8f0-49be-8a40-1a2f0c553170` | HOMO QA HTTP Obra 179135937439394750 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bce92868-a425-4ebe-92da-e265eb93bf39` | HOMO QA HTTP Obra 179138838430135691 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a439193a-244c-4689-84ba-1c00f8989d7c` | FAILURE DRILL — Obra 179149153824414398 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `63c5b977-b175-4f36-a2c2-bf9c479454bc` | HOMO QA HTTP Obra 179135942222776569 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d8f9fdd4-5bc3-4be4-bc91-c6ecd21baaf7` | HOMO QA HTTP Obra 179148194501674678 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d680e42a-f6f0-4684-9ea6-581605b7a291` | FAILURE DRILL 2 — Obra 179149154370949091 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7091f7ae-3647-46ea-a7c3-2bdfef5facae` | HOMO QA HTTP Obra 17914819482341874 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c121b06e-d077-421e-a4b9-9736e3b9017f` | HOMO QA HTTP Obra 179148195513352608 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `52e6f02d-8658-420d-b4fb-9aa5371ce0f9` | HOMO QA HTTP Obra 179135984097591727 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `49168371-7211-4c4e-ace4-6b567de0505f` | FAILURE DRILL — Obra 179149154700258510 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e513dc71-50d1-49a2-8d4f-b12a1f851838` | HOMO QA HTTP Obra 179149377830076469 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `965a1a1d-8afc-45f9-8206-684b745174e6` | HOMO QA HTTP Obra 179150077590451389 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3da07809-e208-45f1-a1d3-93e0cac93cf0` | HOMO QA HTTP Obra 179148196542492619 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c8f0a326-b244-43f3-8b72-47ec5cf7f783` | HOMO QA HTTP Obra 179150078294266121 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `71de218e-ea6e-4fe6-b296-c08033678fd8` | HOMO QA HTTP Obra 179139137549524430 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `25fa7e61-8628-4bb9-a09b-531c162f2287` | HOMO QA HTTP Obra 179147914284867311 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1db82dab-a7b0-4117-b9e5-ff3fa51aba5a` | HOMO QA HTTP Obra 179139658480755671 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4b1bc47f-f81d-4bb8-bb33-2e2c1d8ba70b` | HOMO QA HTTP Obra 179139661285228785 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0e1a54b6-5b17-4b50-b4ba-2d5783dc4d4c` | HOMO QA HTTP Obra 179147914607150711 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5b3d5954-c033-45ec-8882-387b590df075` | E2E Marco6 Obra 1791403395559 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9a02d1ba-5ec4-434b-8cd5-0d5f99d097eb` | Obra conc 179157753204745251 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `490fff8f-23d3-4552-b67d-fe0c09561869` | FAILURE DRILL — Obra 179149160435556811 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ad96c8b1-bd80-450e-868d-78bcc31eb913` | FAILURE DRILL — Obra 179149161743576861 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fab20fb5-1366-411c-9d01-c9a587b7a8dd` | HOMO QA HTTP Obra 179141689416391839 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7ba2e87c-f2be-43ea-a9fb-b240f045f5d5` | HOMO QA HTTP Obra 179141693634719109 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2783fb97-0eb5-4feb-867b-b7df96becab2` | HOMO QA HTTP Obra 179148120900652872 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `81145c7e-1f24-48f7-81a1-7134263f8d14` | HOMO QA HTTP Obra 179148121222473801 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `20c8acc7-d7a4-429f-b297-38f99593261b` | HOMO QA HTTP Obra 179148121894094704 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `84b41050-af1a-48d9-9ee2-3649c1ba906a` | HOMO QA HTTP Obra 179148122538558002 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c9ccea31-36f4-49c5-9082-06f119e7c4fd` | FAILURE DRILL — Obra 179151957322473988 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b98c10e4-31ab-4648-8fa7-3522357f0dd1` | FAILURE DRILL — Obra 17915195863284807 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `44bccf01-2f45-474f-ad7a-6d8e69565e6f` | HOMO QA HTTP Obra 179152297860099148 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bad0d582-c891-422b-9856-5ccc028d23d8` | HOMO QA HTTP Obra 179152300500575727 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `11dd99ad-ed56-4a06-8a09-cd90f1b3c8d1` | HOMO QA HTTP Obra 179148180309943121 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `80a31b48-d3ff-4d78-ba51-e41a4a5103ca` | HOMO QA HTTP Obra 179148180700167097 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `604358d9-1856-468c-8658-3a14c947b73c` | HOMO QA HTTP Obra 179148181825837378 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b0f83f80-1cd3-4157-8ac8-3a28bb860d76` | HOMO QA HTTP Obra 17914818254436812 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `44fe8c2f-a5b8-4dac-a99a-a6ff304aac87` | QA Restore Verify - Obra com Medições | 08/10/2026 | (sem autor) | resíduo de teste (marca no nome) |
| `3dc57be0-8f7f-4c0b-8eff-3ed6a40b0a55` | HOMO QA HTTP Obra 179147977181191069 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cf72f881-3f4f-4c0d-a849-52f9d6e6ce4e` | HOMO QA HTTP Obra 179147979888480680 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `05a8d06f-79c7-4cf9-ad07-0e0664001e62` | FAILURE DRILL — Obra 179152081549585767 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2dc419de-f0a1-4bd1-8203-f85df72c65ff` | HOMO QA HTTP Obra 179152402544182440 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `44bb78a2-5283-4bfb-bcc3-ccea73ebeaaf` | HOMO QA HTTP Obra 179152405079844456 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `493e45b4-653f-45ef-b99c-13559d97b0c1` | HOMO QA Obra concorrencia-loss 1791532806344 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2a33d7b0-b9b1-403a-ab02-9920475a505b` | HOMO QA HTTP Obra 179149268789977327 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dc67e2df-9e0a-45d0-b859-aafbab83a529` | FAILURE DRILL — Obra 179149373373934620 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b6f58e54-24fc-48b4-9843-45b6cd274f2a` | HOMO QA HTTP Obra 179148124712356591 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `62012b8e-641f-45ea-abdc-dc212b166370` | HOMO QA HTTP Obra 179148125031169756 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3e6837ca-7367-4d43-911c-d0be7448590b` | HOMO QA HTTP Obra 179148125702037612 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `897e35de-b6af-4a08-81b7-d152eb759226` | HOMO QA HTTP Obra 179148126409638030 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ff9b10c-78ef-4526-ad96-e2c360aebc88` | FAILURE DRILL — Obra 179149256532348667 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `54bb2e9f-6462-4801-aa2e-5c8304322cbd` | HOMO QA HTTP Obra 179142288127237902 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `451157d0-fc4c-4592-afc9-baef9b7f2f79` | FAILURE DRILL — Obra 179149263998029491 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `18433e03-0203-43e9-ac73-49c0674d1429` | FAILURE DRILL — Obra 179149176505548444 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7687c3ad-3ff5-4cd2-a8ef-338a59ae0ed8` | HOMO QA HTTP Obra 179152405739656927 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1145c014-9bc1-4c0b-afff-1a4cbf8f36ce` | HOMO QA HTTP Obra 179152406422292706 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fa5ba83f-a045-4574-bba3-abded0ef298f` | HOMO QA HTTP Obra 179152579613490644 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b6cc021d-f6ed-4cf5-b761-cf3c29b6acea` | HOMO QA HTTP Obra 179152582127081192 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `adb42eaf-edf4-40f9-9a33-fb849659659d` | HOMO QA HTTP Obra 179152582774745947 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e406b5d1-2035-4283-8ff8-ac62ab34baa5` | HOMO QA HTTP Obra 179152583460974289 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `66a5fe1b-e795-41e2-a75a-ac28630f05fb` | FAILURE DRILL — Obra 179152815442663341 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2bc5e3ff-5d46-493f-9308-75c5be0eee84` | FAILURE DRILL — Obra 179152816825197396 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2ff61e2b-048d-4d02-b36d-d5fc5cb10775` | HOMO QA HTTP Obra 179139444137589779 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b744469b-56dc-442d-8445-4ba3b202b075` | HOMO QA HTTP Obra 179139446514635700 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `125208ac-138b-4958-b7ac-8580bfaaac68` | HOMO QA HTTP Obra 179142386105910705 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dc4ebb60-ed8f-4df0-9c4f-e5e5dea7c6a2` | HOMO QA HTTP Obra 179141384484427827 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8881fc2a-7422-4462-9e1c-09037ffe4f39` | HOMO QA HTTP Obra 179142387734930916 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a5547e94-1103-402a-9146-ac02a3d8c9be` | FAILURE DRILL — Obra 179150119230258883 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f41186ab-4b96-44eb-acdf-ea5a4ea8f015` | FAILURE DRILL — Obra 17915012721424963 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `37e4108f-be1e-4cb8-9b2f-c41afe4fded1` | HOMO QA HTTP Obra 179148359531481139 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `295a7ace-b308-4d14-84b2-fe33fb4bd652` | HOMO QA HTTP Obra 179148380272273321 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `97fb5c90-2b2b-43ca-9c52-e9c8f8ea4c93` | HOMO QA HTTP Obra 179148365994865546 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `79620494-9770-4fe6-b7d0-2c7ecbabac2e` | FAILURE DRILL — Obra 17914936850739262 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a9f81bbe-5bd5-4446-8a56-c33ed3114619` | HOMO QA HTTP Obra 179148373603260261 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a50d5802-9e49-4203-b083-3d01ed743826` | FAILURE DRILL — Obra 179151875961938802 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3b9d92ed-833a-4f8d-a2e8-715bb0f1ba23` | HOMO QA HTTP Obra 179152590651037324 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e3e824e6-e447-4351-a988-6666337f6945` | HOMO QA HTTP Obra 17915259094717854 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a91ccada-b18f-4c77-bcae-91f204db6e5c` | HOMO QA HTTP Obra 179152591595030896 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cffc42f1-3f1e-4c7d-89f5-8d0c934ded10` | HOMO QA HTTP Obra 179152592547466096 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4959ed19-7ce8-4d90-949a-d139528e3c01` | HOMO QA HTTP Obra 179152815624082515 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `06c00872-b8b2-42be-a7b0-342c51f578ec` | HOMO QA HTTP Obra 179152816062336294 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `01b11772-700d-4087-bb22-777d74792300` | HOMO QA HTTP Obra 179152816719795193 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `be18cd48-76f5-45e2-a2d1-5647d89ee2cb` | HOMO QA HTTP Obra 179152817682339819 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `834d2508-aee1-4bc0-abb1-67dd8dcc1fe8` | FAILURE DRILL — Obra 179153017109417203 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `be48786e-5dbe-495c-ae1f-a9e0ae43eb94` | FAILURE DRILL — Obra 179153024044138512 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `36a72f0a-702e-4b7f-8bb3-adb339eeee32` | HOMO QA HTTP Obra 179139330026984909 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3f6066f2-c1b5-41b5-93f1-21a61d3af84c` | HOMO QA HTTP Obra 179139135963594068 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `33b031cb-1698-415c-8b7a-8c8f219d1341` | HOMO QA HTTP Obra 179139332484563598 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d7223739-b3e5-4919-a345-8faf0447fb2a` | HOMO QA HTTP Obra 179139505316959887 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `097f6255-d016-47fa-ac4e-5cea7d0c32cb` | HOMO QA HTTP Obra 179139507385682633 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `48f8f49b-5d3b-4994-a942-add2428e7f61` | HOMO QA HTTP Obra 179140375521760192 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5e351ed8-5859-405b-862d-2296cf9ee405` | HOMO QA HTTP Obra 179140378045430545 | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `466d7b34-223b-4fd8-8e76-051e7271d6ad` | HOMO QA HTTP Obra 179149260079783107 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `67fe67d4-05e4-465f-89a0-3807451c1040` | HOMO QA HTTP Obra 179149263905682986 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a5413144-f46d-4d57-aa9b-54597c0e65eb` | HOMO QA HTTP Obra 179149266321995073 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1cb04215-17db-4099-8ae0-be394facf8a0` | HOMO QA HTTP Obra 179151871742322596 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ae389187-f14d-47c4-ba8f-a53dcc87f907` | HOMO QA HTTP Obra 179151875480832839 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bd8b245c-4f5c-4e5e-b8c5-6eae5fc78fd6` | HOMO QA HTTP Obra 179151878273775720 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `51bc4762-a223-443c-9101-7925229b99bf` | HOMO QA HTTP Obra 179151880289128998 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `21d9d743-a5d8-4692-b9c6-63350baf7ed2` | HOMO QA HTTP Obra 17915207785357247 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d0d399f2-826e-4e1a-8aa3-5a51ad46d3a9` | HOMO QA HTTP Obra 179152082018861490 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `61f7555c-fa4c-4ef9-b424-a8fbca96ce59` | HOMO QA HTTP Obra 179152084606549570 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c67a95e4-bb48-4c2e-813a-0973dc7ff754` | HOMO QA HTTP Obra 179152597563757443 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7ce62818-57ba-44e4-bc5b-e51c7fb34082` | HOMO QA HTTP Obra 179152597859624005 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `46b86940-ee6f-400f-85d6-12ba426ae4ca` | HOMO QA HTTP Obra 179152598508549730 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `893bd09c-bfe5-445d-a248-2e071f8ce3fe` | HOMO QA HTTP Obra 179152599460796776 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1746672f-862d-4a7d-8a55-4931bef3e4e9` | Obra conc 179157746022020476 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f2daf51d-fc18-4ed6-b4e8-de9ca5e4426a` | HOMO QA HTTP Obra 179153209921770558 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4f3744cf-8490-4b06-b464-7c24c8f5af1e` | HOMO QA HTTP Obra 179153214383828795 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `64ce9010-09e8-46b7-a07d-12363ce3c97a` | HOMO QA HTTP Obra 179153215606289438 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9d043c8d-9861-4667-9c89-727bef65bffb` | HOMO QA HTTP Obra 179153217373067577 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `89dec15a-9fa1-46ff-8463-84bb11b05e9a` | FAILURE DRILL — Obra 179175002641974091 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4b4738b3-6b8d-49c6-907e-95f6acfa7548` | HOMO QA HTTP Obra 17918290199488641 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c3199b8e-09d9-4882-ad7f-da32f999aa37` | HOMO QA HTTP Obra 179182906811156528 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bce63db8-dca3-4bb4-921e-5ba513830a66` | HOMO QA HTTP Obra 179150122967370802 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `17c69eb3-6809-4a2c-a49f-9469b6639345` | HOMO QA HTTP Obra 179150126730880037 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b192b63a-1964-4db1-aa31-9245f0d2bba0` | HOMO QA HTTP Obra 179150129497258520 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `79752ce9-e485-4adc-a802-738800fd52f9` | HOMO QA HTTP Obra 179150131520574782 | 08/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `82ef0264-fbf2-4be1-944d-c15ee6c6c61d` | HOMO QA HTTP Obra 179153017301052793 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a475bcd5-f3c0-47a1-b792-5701340f6ad2` | HOMO QA HTTP Obra 179153019253141673 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f603610d-7889-49a1-ae73-0ad889e65db9` | HOMO QA HTTP Obra 179153022897734123 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f4c8fbdc-008b-4dec-83ea-c70970f76230` | HOMO QA HTTP Obra 17915302493372768 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5935e8a0-35b5-4dec-b006-98c604f8e6a4` | FAILURE DRILL — Obra 179189306741175358 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e5d0e363-0738-49c9-86ed-b56cbb6b805c` | Race CO 179189389258391272 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0eb89ea8-87a0-46dc-b144-091418a12d30` | HOMO QA HTTP Obra 179152237948058437 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `29ee7fd1-5c97-4c8e-a7bb-dc56e76a7e10` | Obra NC conc 179157753915640566 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `94728382-673e-4fd2-b18c-4cd351870788` | HOMO QA HTTP Obra 179175002903548787 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8311e344-4223-48a9-ad62-2fa671433e8f` | HOMO QA HTTP Obra 179175005839464548 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b1328ecf-2b2d-438a-9927-9c8fe3f28096` | FAILURE DRILL — Obra 179182903982438337 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9151f3ff-eac0-46f6-b081-a0e3d058d2e0` | HOMO QA HTTP Obra 179152087273771980 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f996868c-96bd-4c7e-9629-46b5ff5dd884` | HOMO QA HTTP Obra 179152227552778120 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `76ced9db-4faf-4692-bc35-51c8203d7d19` | FAILURE DRILL — Obra 179157891659194931 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e2ed938d-cf1b-4482-951b-5240567840a3` | Obra conc 179157757881974662 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `1bd7c35e-5e7d-4190-aa18-91acfe557df1` | FAILURE DRILL — Obra 179157897361173861 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `07f720ce-b3f3-49b5-a2fc-923153ffc02d` | HOMO QA HTTP Obra 179176317116475401 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2d75fdea-d878-45d0-8787-822826049785` | Race CO 179189390295887870 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0657af18-8836-4d1d-a122-79aa07a72be4` | FAILURE DRILL — Obra 179151867950886096 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `39cfa1e1-4612-46f4-a54d-3694cc982385` | FAILURE DRILL — Obra 179152184661780080 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `866295f2-f54d-4e6a-b5bd-ea4553800690` | FAILURE DRILL — Obra 179152192003278687 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b346b78d-4e2c-4a05-9e92-cd94ec23a2f0` | Obra NC conc 17915775897327001 | 09/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `08e52028-edad-4ec2-be4b-8b8e7d43f66e` | HOMO QA HTTP Obra 179189194041195584 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d312e295-a47d-4949-8794-d29cf69f1788` | HOMO QA HTTP Obra 179189203114916974 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da0f0fb7-5c37-4a77-b11b-65085cb4b849` | Race CO 179189393464526777 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5faa211f-e7e9-40a2-9653-46c431caa0b8` | FAILURE DRILL — Obra 179152073916570176 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `67b62505-2fe5-4230-81c1-137bd4e03a99` | HOMO QA HTTP Obra 179152187700439693 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1ecb871c-f78a-4951-9b05-e0ac30df4656` | HOMO QA HTTP Obra 179152191887354843 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c3b25f81-b2bb-4f0d-9f5e-6cdd2db0ad98` | HOMO QA HTTP Obra 179152193723252726 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `613a2d26-d329-4e1c-942b-4e7ca7302f6b` | HOMO QA HTTP Obra 179152196193512411 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6f1bedf3-8bda-4706-b7cb-dd9710b74d69` | FAILURE DRILL — Obra 179152675333469239 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4774f54f-9d43-4223-8769-f07259936002` | FAILURE DRILL — Obra 179152678972053651 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `24e0da6f-ce08-4f9d-9276-c1f22f5d9ea7` | HOMO QA HTTP Obra 179157892049548982 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e45de6dc-0fb0-4ed5-b70f-2dc88efa179c` | HOMO QA HTTP Obra 179157895949731480 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6ff6d485-e51f-493c-bf6a-766ba6d52adb` | HOMO QA HTTP Obra 179157897601135503 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `74f12a08-53f2-40bb-adca-5d6c4e16eda8` | HOMO QA HTTP Obra 179157899536124638 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d76db31c-ecf8-45e2-862f-fe35bcb449c4` | Race CO 179189394007563716 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `88f82b73-6e5b-4390-a57d-bbd279e55361` | HOMO QA HTTP Obra 179199450403658254 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a3137f0e-e230-4b45-964a-9f6f3ed5eecb` | HOMO QA HTTP Obra 17919945257719236 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c47ddd2b-c8f8-4aee-a5f2-7789646721c6` | HOMO QA HTTP Obra 179199456498930462 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `20f91962-f2f6-4ef8-b0af-d1c016dbd72e` | HOMO QA HTTP Obra 179199461510863339 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `84ed22a5-abe5-4e6f-9c6e-a1865a68380a` | HOMO QA — Obra medição 179217925528756162 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3bec816d-88d4-41cc-9337-dd3286c69b54` | FAILURE DRILL — Obra 179152289749622488 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fc2637d2-8885-4789-af1e-80f0020f011b` | FAILURE DRILL — Obra 179152297317275048 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3e2b6143-b2cb-4d49-acaa-a1b8ae6f12ff` | FAILURE DRILL — Obra 179174996470287797 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da99c2dc-7b41-41b9-aa40-c9c7c2adb18c` | HOMO QA HTTP Obra 179189302145740447 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9e6373aa-a385-4205-86f2-7fd425ebc869` | HOMO QA HTTP Obra 179189307898440047 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b54ab085-8a4c-4947-aaa6-751d09303baf` | HOMO QA HTTP Obra 179189310693923134 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5df03380-2890-4941-9abf-2f7a0767917c` | Race CO 179189394673631118 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `353ceea3-b32e-4e0c-a863-77aba7bd81bd` | HOMO QA Obra concorrencia 17919116975167367 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bd4dd5b3-3c3e-4777-b3ea-c5039ca45fa9` | HOMO QA — Obra medição 17921785134751706 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8f602af8-8038-48c8-9b53-d5eab4aa3870` | HOMO QA HTTP Obra 17915229454933068 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `42a696b1-703e-4adc-92fd-d153a5170f54` | HOMO QA HTTP Obra 179152296668968958 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7e84dfda-3012-41ab-a658-3bebf2329eb2` | HOMO QA HTTP Obra 179174998540242940 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4ebd11d2-2cfe-48b2-9ccf-1533669b1c73` | HOMO QA HTTP Obra 17917500027095123 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `64924554-d014-4842-bda8-d9a6597b2c11` | FAILURE DRILL — Obra 179176305837511816 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ccbb83e1-9ef6-4e67-8768-5e5122262f4e` | FAILURE DRILL — Obra 179176313429911110 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `74fd1bf8-5dd7-4b66-8891-b64154c79344` | Race CO 17918939534806731 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0397cb75-74cc-4f76-8eaf-42efdf32f59a` | FAILURE DRILL — Obra 179189473524960996 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c3c5e5dd-1343-4f96-8e60-348ea5e3ecd4` | HOMO QA HTTP Obra 179176309220879797 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4c7b9b6f-0541-449c-9d9c-55f7ec2ee21e` | HOMO QA HTTP Obra 179176311553243198 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c6cab216-4b27-4263-b72e-0dc9ec662946` | HOMO QA HTTP Obra 179176314054153488 | 11/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `962a7519-d14b-4c9d-83c9-2bbfdd25345f` | FAILURE DRILL — Obra 179189176495748279 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dcbff9d2-9281-4950-9578-6020a6a27b28` | FAILURE DRILL — Obra 179189192496226110 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `44b1e3b3-8e61-4d52-ad1d-8904f88ee4e4` | Race CO 179189395871017458 | 13/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `13cc93a7-1a47-4152-aced-07d56967a127` | HOMO QA HTTP Obra 179217923019536712 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d73c6307-f890-4db2-b895-48b0a0dd7097` | HOMO QA HTTP Obra 179217925766948412 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5ff3aeb4-9099-4b13-95d8-69723cdc99cc` | FACL Obra vínculo 179241060530425870 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2f066675-48ab-48b7-b8a4-fdc48546b17d` | FACL Obra 17924106095525265 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d11446ef-41ab-441c-9e2e-8d92c0a070c2` | FACL Obra vínculo 179241061310028090 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `aa626ea8-b43c-4473-b759-b60ce98d3fdd` | FACL Obra vínculo 179241061748028530 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `50ddff76-3194-4974-b7be-e63864dc3949` | FACL Obra vínculo 179241062113497215 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `5e71dbe3-7ccf-4a8a-8102-5985b7867719` | FACL Obra vínculo 179241062515810238 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `05d17a4e-98f6-4095-ad09-d46033783f28` | HOMO QA HTTP Obra 179193919170624402 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e78ead48-188e-4752-bd0a-19827d74f827` | HOMO QA HTTP Obra 179193924182633607 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e093bda1-f7be-4f2f-b63f-e4ac502e128b` | HOMO QA HTTP Obra 179193926452175741 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `58cb1760-c37e-4601-9bb7-731d922b1421` | HOMO QA HTTP Obra 179193929271096073 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `886b87a9-7ad6-4602-945c-4b6043e88d50` | FAILURE DRILL — Obra 17921783075947945 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b8fc067e-f183-4e22-9a14-3efd14b115c6` | FAILURE DRILL — Obra 179217839703541863 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a6ef6ef5-234a-4187-8dfc-13320fafc971` | HOMO QA HTTP Obra 179152222478753394 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `759ffaa5-76a6-4118-8f1f-67a6794d3609` | HOMO QA HTTP Obra 179189184617647135 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `da8f4711-8b0b-452b-ba8b-737edcffa0bf` | HOMO QA HTTP Obra 179189190828721841 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4d642cdd-bb89-4361-8ee6-b2b6d7715f6b` | FAILURE DRILL — Obra 179191140961895994 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f54c8c68-b97e-47bc-a36d-6d2468e5f1cd` | FAILURE DRILL — Obra 179191150647245052 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e2cc8a2-83e4-4beb-bae1-b00199ded7e7` | FAILURE DRILL — Obra 179192812633179975 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d0f4035c-6c9c-42b7-a605-a76d5c934fc6` | FAILURE DRILL — Obra 179192818011247717 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a5b2b9c6-b6eb-4939-b56f-3b37cb7481e4` | E2E Marco6 CO 1791940703673 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5429cd5d-b5e7-40a9-a62c-986d42320ffb` | HOMO QA HTTP Obra 179217999697418517 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1cbead45-5075-4463-953a-6272a981469c` | HOMO QA HTTP Obra 179284539879597365 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1c18de69-03e3-46cb-86d6-5c268e574f00` | HOMO QA HTTP Obra 179191142636655300 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0d501eca-acad-4165-918a-d5c939896ac0` | HOMO QA HTTP Obra 179191145662438392 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bcd2ff77-031b-4216-a5d4-f23664f59189` | HOMO QA HTTP Obra 179191150900664324 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `640526c6-5080-49b4-bac9-af36b5be6602` | HOMO QA HTTP Obra 179191154432177523 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `56c5f18f-7d15-4baf-8aad-467bae5ccbe3` | HOMO QA HTTP Obra 179192813735888207 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `726ae4e7-38dc-4775-a3ce-f756b1abd131` | HOMO QA HTTP Obra 179192815978997482 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6a07131a-b7ed-4189-ac2b-74a96ef8ff9e` | HOMO QA HTTP Obra 179192818736760922 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `842a3c09-4132-4c32-a9f1-2852b62bc2b2` | HOMO QA HTTP Obra 179192821647616748 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ba20d877-8764-4eb2-864c-c08e80cb0bce` | E2E Marco6 CO 1791937270413 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `61aa7772-3bac-4e0b-aec6-4e38eda3821b` | FAILURE DRILL — Obra 179193920775679473 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `55d9964e-5a36-40a0-817e-a99bf6ecfa78` | E2E CO default 1791940841416 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `04d8d931-785a-43a3-bcf0-94637cfea19c` | FAILURE DRILL — Obra 179199322578028679 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ba616d9a-8b51-4f72-9cb0-5b6d830238cd` | FAILURE DRILL — Obra 179199329085165207 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1c5c66a7-0154-40c2-bdab-b00ff8c73ee8` | FAILURE DRILL — Obra 179199455844992474 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `678843e8-0a93-438f-b73e-c2d533b85bde` | HOMO QA — Obra medição 179216779918238682 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `25e48a9a-c264-4fb9-9d4d-8aaab035c764` | HOMO QA HTTP Obra 179217831713442281 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b561b817-99e0-4508-98c1-1483611957ca` | HOMO QA HTTP Obra 179217836168990608 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fd2ea53d-476b-41ac-a88a-9707438a8748` | HOMO QA HTTP Obra 179217839741167706 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3f63ea2f-a9ab-485e-a810-f19028b6f4e1` | HOMO QA HTTP Obra 179218000051644655 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `76cfbfc7-91eb-4be2-af5d-f50b05880faf` | HOMO QA HTTP Obra 179218000726185589 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6f377fb9-6435-43b3-9a22-f64747605230` | HOMO QA HTTP Obra 179218001726791028 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `944f0469-8351-49a9-af33-37b06b975dfa` | HOMO QA HTTP Obra 179284540419668 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eefe5dc6-6ed6-4678-8fb2-4e8c88156d12` | HOMO QA HTTP Obra 179284541384897680 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `110269f6-8984-4b12-aa81-19984ed70144` | HOMO QA HTTP Obra 179284542558691882 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f640c4a5-d5c6-4035-9d2b-41f765638fe2` | HOMO QA HTTP Obra 179287218596860010 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a50a11d7-2344-4a6e-bf0b-cb638e10664b` | HOMO QA HTTP Obra 179189476366623213 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3d7f7c28-c5fe-4090-a68a-8d9870f9d8f3` | HOMO QA HTTP Obra 17918948446966294 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bc1f9894-12d8-4739-a6d8-b0f0d57a9573` | E2E Marco6 CO 1791937448909 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b9eec9a4-bb15-4e78-b45b-1a828c0d5ec1` | HOMO QA HTTP Obra 179199322871429967 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `552599f2-68b5-4028-8adf-b32941b98f60` | HOMO QA HTTP Obra 179199324814528527 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `66b35941-44b0-4893-94ea-aa141e1b460b` | HOMO QA HTTP Obra 179199327814657797 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `36f167da-12d2-445d-9d78-67bf2f26eef2` | HOMO QA HTTP Obra 179199331365459850 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `617db800-054e-4631-9dcb-c35e77f0bc35` | HOMO QA — Obra medição 179218004882716758 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `38cf8e5c-8f11-4fa4-8a3e-8282e89ab538` | FAILURE DRILL — Obra 179189456165933110 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `036aeae4-ccd3-41bf-83d0-7442c83f234e` | E2E Marco6 Obra 1791937586218 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f421c1e3-ec0b-4f98-881c-a5fb381cdc68` | FACL Obra vínculo 179241028092937832 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0eef31e1-16c7-4b1a-aecd-32f96425c7fe` | FACL Obra vínculo 179241029823333129 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d841c006-87bb-4a77-b6d2-32a021443ac9` | FACL Obra 179241030290787571 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dda1944e-cbff-4522-bdce-e18249207e01` | FACL Obra vínculo 179241030999990274 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `da73cd35-7c10-4d10-91e6-8e15abc84a14` | FACL Obra vínculo 179241031725297574 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `764720c9-8524-4658-bad6-2b492c3ff424` | FACL Obra vínculo 179241032064452822 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `8a69228e-9332-4119-a7d2-3bf2966a715b` | FACL Obra vínculo 179241032619384363 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `53c14a00-d180-4d8d-9dc1-b02ae184fe1f` | EVID M7B Obra A NIKE8 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `52e5287c-a27e-4b58-ad39-e0ba439c9ba7` | EVID M7B Obra B NIKE8 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f54a50b3-f569-43ec-99e4-6458d15967ad` | HOMO QA HTTP Obra 179287219181939245 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `74d76c5c-65b6-4006-b5ee-6efa2895f77e` | HOMO QA HTTP Obra 179152233403856644 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `43f703fe-c1ef-4bbe-a3b4-01bf71e55bf4` | HOMO QA HTTP Obra 179189462751046359 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2555e06c-7b08-4d4e-81cd-1050e45453b0` | HOMO QA HTTP Obra 179189468248434747 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0fbf33d9-bf25-4a98-808c-77c620f42486` | HOMO QA HTTP Obra 17919938351323584 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `841bad63-cfd2-49b9-ae32-67aa123896e1` | HOMO QA HTTP Obra 179199389917890586 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5346dd66-db6f-4c3f-8d01-1345fd0436b8` | HOMO QA HTTP Obra 179217843010596507 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b79181bc-dcd9-4185-81e0-f308f724e461` | FACL Obra 179236896575687001 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d69b0e6c-4fc6-4a7c-8194-df3fb91e4b67` | FACL Obra vínculo 179241038170133178 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `92f8f77d-caa0-4102-8720-98441b9a62a1` | FACL Obra vínculo 179241039830570124 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4793c3db-faa1-48f1-9eb2-5e80acf8e1b9` | FACL Obra 179241040293072270 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c81811dd-cf36-4fd4-b4ae-a79d3147857d` | FACL Obra vínculo 179241040998889816 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d2c7c587-7db6-4b44-b5d9-f28a4992fc33` | FACL Obra vínculo 17924104172184713 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4556c86b-6f32-4430-912b-faaa3127e5f5` | FACL Obra vínculo 179241042060416115 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `40970bae-0ee8-4a27-ad56-3d4101b6862b` | FACL Obra vínculo 179241042612820156 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `fbae60ce-f144-48d6-9af7-f3e59da1d155` | HOMO QA HTTP Obra 179287220103266163 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e3c33f25-2a77-4e70-8f59-7d015adea494` | HOMO QA HTTP Obra 179287221277597959 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4a048894-7c21-4255-9cf7-0b4661033058` | FAILURE DRILL — Obra 179193026384231731 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `910e19c4-0fec-4bba-8641-8cd9e4e9b46f` | FAILURE DRILL — Obra 179193033392087454 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1fb39e25-43a4-4b35-b08b-f864d70cc593` | FACL Obra vínculo 17923690695856872 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7b717f51-29c7-4264-b430-9d13ccb492ae` | FACL Obra vínculo 179236908626595402 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ab4fddc7-40e5-4bff-b508-d3858799b2ca` | FACL Obra 179236909136253863 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0c4c649f-043f-4bfd-97d9-81ca948877cb` | FACL Obra vínculo 179236909856995619 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `97d5326c-9be8-4cbc-ac02-0213ba5878d0` | FACL Obra vínculo 179236910585293711 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `04f584a0-e45c-4fab-b589-916f36d45666` | FACL Obra vínculo 179236910924681876 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bfa5f16a-723f-4216-834d-b60a4899ac7b` | FACL Obra vínculo 179236911475462265 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `889a1e17-8186-4345-be06-60c0bddfaf30` | FACL Obra vínculo 179241046031099469 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ad277065-86ec-4a8a-a918-d3ac0087ca2b` | FACL Obra vínculo 179241047691519233 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `71641a40-4dfc-4e16-aafa-29058e7c0220` | FACL Obra 179241048151820140 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `06266e23-bb1e-462d-ab7d-bb5f36995986` | FACL Obra vínculo 179241051032932593 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `db6f609e-5dd0-441d-b9c3-06a27917dc31` | FACL Obra vínculo 179241053551728754 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d8cc8486-70ab-4cf7-b997-db725c251b6c` | FACL Obra vínculo 179241053890645694 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e04b118d-9dc2-4384-9f06-d6b369b9c770` | HOMO QA HTTP Obra 179251406860526592 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cd21b8ab-81db-4e9a-84a6-918d3abe92f2` | HOMO QA HTTP Obra 179251407182768891 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a00ab7da-c609-47fe-86c1-3d148a04e508` | HOMO QA HTTP Obra 179251407872172276 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a180455a-8aa7-411d-8939-8de2b34bb2f2` | HOMO QA HTTP Obra 179251408876023426 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `de21ea49-834d-4fb8-b29f-3db0fc6cbb82` | HOMO QA HTTP Obra 179251878754969894 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `aa0ca356-7770-4190-b404-8a20334c7391` | HOMO QA HTTP Obra 179251879081184902 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `585fab47-280b-461b-be75-7292ce71edec` | HOMO QA HTTP Obra 179251879768758411 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `61a9698a-7a46-4a36-8153-d6ed209cd4d5` | HOMO QA HTTP Obra 179251880752891355 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `19fe1013-a23e-4a0e-bfb0-e31dd662ce91` | HOMO QA HTTP Obra 179193027799346165 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `03d48d4a-a027-4567-b19a-fd5b5c7addda` | HOMO QA HTTP Obra 179193029468936021 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `81c243cd-75cd-4b6a-8b2f-94ece2d807b2` | E2E Marco6 CO 1791938939376 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `71bc2272-d03e-4cbc-b10a-2ebca82e036d` | HOMO QA — Obra medição 17921804920183195 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `110534cd-c4db-42f4-b674-4b902b04fb54` | FACL Obra vínculo 179236916487548005 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `83e556c8-6db8-4074-a27d-04a7bd67aba7` | FACL Obra vínculo 179236918362334379 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `954facf2-e5b2-40ad-b506-ba52227409f8` | FACL Obra 179236920029220220 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `139fc32c-d705-4df6-a659-df50e427e533` | FACL Obra vínculo 179236920386620201 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b4315661-0e30-4f49-a20c-ce4a1fa3b0bf` | FACL Obra vínculo 179236920825184633 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d1ac87a8-01d5-4af9-9898-084a85afa2f6` | FACL Obra vínculo 179236921187316183 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3f2150fe-d8ef-4a90-a9b9-2336a6a11f19` | FACL Obra vínculo 179236921586432618 | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `93c0de6e-4260-4f8e-a339-dcb6f2ec2035` | HOMO QA HTTP Obra 179284587317122598 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `94f8e7b1-b136-4ea8-9c2c-8d1e22e6ade6` | HOMO QA HTTP Obra 179287239168893006 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f8fc0cea-b816-44d9-9b38-75ca54c1ad0f` | FAILURE DRILL — Obra 179189291291529839 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `825b1a5d-207d-42b6-be1f-fbd1a2275d36` | HOMO QA HTTP Obra 179193033624229151 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c43b16ed-93c2-4190-8431-5e0025fec71f` | HOMO QA HTTP Obra 179193035450753480 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bcbf46c2-2231-4ff8-a255-40b21fc755dc` | FACL Obra vínculo 179241054633410489 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d6410602-120b-44e0-8364-3418fda0269c` | HOMO QA — Obra medição 17925142423419131 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f314f00f-b027-4d9c-8f98-5bd4ff1bfb86` | HOMO QA — Obra medição 17925189504531879 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7161e2e3-e8de-485e-816f-796c52291b42` | HOMO QA HTTP Obra 179284587898725318 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `00738aca-3fca-424e-ba65-c4580d79162f` | HOMO QA HTTP Obra 179287239730855648 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `091c18a8-5c7b-4a98-8456-f4f348e23ba0` | HOMO QA HTTP Obra 179200788435479939 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `62631fca-bfcd-4d8d-af57-877368e37b37` | FACL Obra vínculo 179241058657147684 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a7f02f3f-b108-4d64-b5b5-3889a1fa7cfe` | FACL Obra vínculo 179241469808568811 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a8f9b736-e040-4f2e-8928-5bc559ac64ad` | FACL Obra vínculo 179241471468286682 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `07d6f702-7cbe-4e5b-a9b1-7fecbe18c934` | FACL Obra 179241471932020724 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bb83a38e-296d-4690-9b8e-b851982a5970` | FACL Obra vínculo 17924147263905337 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `7eaca3c2-4856-425a-b7a4-c45d037f820d` | FACL Obra vínculo 17924147336506140 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c2dbb290-207f-4a7b-89d9-cca878e90aaf` | FACL Obra vínculo 179241473702524144 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `10185617-47c4-4074-90bf-2818a41051e4` | FACL Obra vínculo 179241474255149170 | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6616ea46-6781-4f6b-8678-c19c190e3b26` | HOMO QA — Obra medição 179244075213666400 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2dc388cc-99ca-47d5-beca-37e0ca853908` | HOMO QA HTTP Obra 179284588820012914 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1e1d9c38-8ab8-4b3f-a1fd-1a33361b5033` | HOMO QA HTTP Obra 179284589942930704 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3ff19a16-b58a-429f-b24a-9f9236c4f298` | HOMO QA HTTP Obra 179287240664926611 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1edc6d4f-3071-4022-a641-168e54c34245` | HOMO QA HTTP Obra 179287241834157856 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e0e0f04e-fa57-44b8-b79d-c45f352967a4` | HOMO QA HTTP Obra 179189298260020664 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `61ffb81b-0909-4160-b652-3e602c26b9db` | HOMO QA HTTP Obra 179200788889412379 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f76e00c4-fd98-4f3b-a891-c850fc1caccb` | HOMO QA HTTP Obra 179200789705669878 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `919e0e6e-ffc4-410f-87cd-39fb7cd280e5` | FAILURE DRILL — Obra 179241343862359447 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9579c051-9e11-4659-9cb4-0693c1cf7de2` | FAILURE DRILL — Obra 179241345181133741 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8099ebba-4571-45ee-a261-411987b4ba8e` | HOMO QA HTTP Obra 179287259007511870 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `276beab2-3981-4ee2-bf56-5556ceadafcf` | FAILURE DRILL — Obra 179199358549464831 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `48d6049a-019f-4679-a975-21291f71c67a` | FAILURE DRILL — Obra 179199373103834806 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e1e1af3a-8373-4f4f-9643-877aa67cb69c` | HOMO QA HTTP Obra 17920079097715795 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6ad1a173-280d-40e2-91f1-e10b06fc33c4` | FAILURE DRILL — Obra 179216754283637393 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `04fce991-293e-41ee-b284-c4c5e0860086` | FAILURE DRILL — Obra 179216759657752351 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `06ce147c-b26f-40d6-88db-08ef80d17b47` | HOMO QA — Obra medição 179240612644214880 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `406893e2-33cc-41f1-b4f1-e9a755c2407e` | HOMO QA HTTP Obra 17924134632493400 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31d9998b-38f1-470f-a375-41d1f3d9ac12` | HOMO QA HTTP Obra 179241346645853894 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d3ddb622-76a3-4bcf-a6dc-c3446d39e6df` | HOMO QA HTTP Obra 1792413473305375 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `239d1b6a-3fe3-4f58-8532-cd5deb4a055a` | HOMO QA HTTP Obra 179241348325783000 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0835cce5-ebff-43ba-a7b6-b3229e4712bb` | HOMO QA HTTP Obra 17928725953363679 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3530288a-3481-4115-8edc-e26c3b246485` | FACL Obra vínculo 179297752531099829 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `cb92478e-d777-4590-840a-317135157ec6` | FACL Obra vínculo 179297754355388159 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `f34729a5-b8cd-46ab-bf83-116664a11edf` | FACL Obra 17929775484907840 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3e9985eb-24d1-4e99-b176-770dcbd0bb18` | FACL Obra vínculo 179297755575178521 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a5532ed2-af1c-40f2-af7d-ae6c54b7f766` | FACL Obra vínculo 179297756310166844 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `13951150-5d80-4def-9d3c-727c6012a84f` | FACL Obra vínculo 179297756652066900 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `dbf732a6-490c-4f9f-970c-f7fe91d32155` | FACL Obra vínculo 179297757190212011 | 25/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `3d7080ac-f1f6-4bfa-96e3-6151afc3fc35` | HOMO QA HTTP Obra 179216754739554307 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8ee62fc3-ab43-4918-ab3d-07edacf78de7` | HOMO QA HTTP Obra 179216756404719605 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d323d906-c9af-43cc-be1c-ab68b3458967` | HOMO QA HTTP Obra 179216759403240319 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `18fbe543-a9c6-4b3d-a11d-4631e78b056e` | HOMO QA HTTP Obra 179216761939684846 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0152d0b3-928a-42dc-ae3f-c29e46782b59` | HOMO QA HTTP Obra 179284637707977900 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `540ff902-547b-414c-8db1-57d31ae8ff90` | HOMO QA HTTP Obra 179287260521922913 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `31ce02d6-9a45-4567-8c41-5c7b05fbe0a9` | HOMO QA HTTP Obra 179287261694499700 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `730da939-5112-4261-9230-de0dfdfa64fc` | HOMO QA HTTP Obra 179199372930353140 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d3878f6d-52df-400a-b489-cc798e23b437` | HOMO QA HTTP Obra 179199377534456643 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `22764939-2cb9-4541-bcd2-de7c8ab9d332` | HOMO QA — Obra medição 179241360334437628 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f51202e6-8801-4a4b-bf8c-dbfd8f93357f` | HOMO QA HTTP Obra 179284638285985149 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3c65f6e3-c9b4-4c4c-9a47-eb71f8c1b4c4` | FAILURE DRILL — Obra 179182895403941982 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fea1d751-08ee-4519-a60f-bdef0282a5c1` | FAILURE DRILL — Obra 179193913287637153 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `55547b3f-098a-49c9-978c-594acaf8bca7` | FAILURE DRILL — Obra 179240968556655304 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d4c9450f-f1a0-4cd7-8817-adec0a2b2e24` | FAILURE DRILL — Obra 17924096988639286 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `63a7582a-897a-41f5-a07f-804086704e9e` | IA RETESTE M6 22-10 — obra fictícia | 22/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9efb2ebe-70e9-4078-976f-9b8cbe1d732b` | HOMO QA HTTP Obra 179284639227659297 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `03871c30-5a99-468d-bfa1-2ce4c2b36c4a` | HOMO QA HTTP Obra 179284640347494007 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `32689244-9566-469b-b48f-be0bd249a7d5` | HOMO QA HTTP Obra 179182896112888244 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `431108b6-455a-42d9-a57d-de45c9b8d95e` | HOMO QA HTTP Obra 179182898568365278 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4c0ee5a0-ba7d-4654-bd59-84986181bf27` | FAILURE DRILL — Obra 179199449511915026 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0d5cb1ca-af46-4610-9e4e-7c41214b027e` | HOMO QA — Obra medição 179232314508261911 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `94a5cae4-e519-43b6-ad20-87280f18019c` | HOMO QA HTTP Obra 179284517326493028 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e7bc8fa-d458-48a1-9ff2-0636f2a135d6` | HOMO QA HTTP Obra 17928451786561056 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cc97e809-aca7-498d-8494-76b3d43f1ea2` | HOMO QA HTTP Obra 179284518830672378 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b67016ac-87f1-4524-992a-3d3bc820f266` | EVID M7B Obra TESTE I5QAK | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `36b38ee1-7009-4d63-b6af-6a36edf1b61d` | HOMO QA HTTP Obra 179284519952178423 | 24/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9508cf7c-349d-4d91-9ed5-34253f480600` | HOMO QA HTTP Obra 179217919335329360 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e8eea1ba-e093-4826-97f0-3de61fd2170b` | HOMO QA HTTP Obra 179217921342482090 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a728149c-40b3-4c78-917a-e299d6d85b56` | EVID M7B Obra A 2A9M0 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6a39441b-c6ab-417d-a5ce-cab0a1d504f2` | EVID M7B Obra B 2A9M0 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ac516185-6ca7-48de-8fc5-4a9edbe4bf02` | EVID M7B Obra A NTSA1 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b4570323-ddf5-46b0-9077-4a122c5b69c9` | EVID M7B Obra B NTSA1 | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `eac5adb9-06fe-4496-976a-61fb906e2d99` | FAILURE DRILL — Obra 179297350890683045 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8a7fd973-0d1c-460a-acfe-b2d375e21f84` | FAILURE DRILL — Obra 179297352222541619 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `499124dc-b4c0-4938-8104-46dea17204e2` | HOMO QA HTTP Obra 179297353668086846 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b167322b-738c-468b-8911-226115ab6e2f` | HOMO QA HTTP Obra 179297354224529086 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1a81ab33-2bbc-4e09-956d-8b4492ceaa2c` | HOMO QA HTTP Obra 179297355139982138 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `28f2d739-417b-46cf-bc70-b2c468004a17` | HOMO QA HTTP Obra 179297356269619359 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fd77ef73-813d-4e39-a5b6-d7e025cf1cb6` | HOMO QA — Obra medição 179297371937876214 | 25/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e6d36119-e440-412b-96ad-dc9282ef29a9` | HOMO QA M6 07-10 — obra fictícia ChatGPT | 06/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1ca217e1-f7a8-493b-8fab-b9dd703db30a` | HOMO QA Obra CO concorrencia 1791532853065 | 09/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

### `price_changes_old_price_completeness` (rm_property_price_changes)

Campo: old_price. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":96.23,"nulls":51,"total":53}; limite: {"field":"old_price","maxNullPct":1,"blockAbovePct":5}. Listados: 51 (bate).

Origem: `real_estate.property_price_history` — 51 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `01195105-67fb-4ff3-905f-359f40be93d9` | - | 18/09/2026 | (sem autor) | sem autor (rotina/seed) |
| `7dc9a05f-b5f0-46d3-bb34-43e3ccbda4ee` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `38828851-08e2-4143-852a-17eb6856f165` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `663aa6ba-0230-4f09-8950-3a04e9c43f38` | - | 16/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `a34aefa4-d4c8-4499-8a7a-62e7d2f1ec16` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `8a98ce58-1ded-4f7c-bfee-79a9372bc580` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `a0fb3cf8-85a9-4453-befa-e5c3b5bfc86e` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `251d3ded-e8ed-470e-bab8-19851896a00b` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `5fc32b27-270b-4860-a774-13369074e1d9` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `40c83002-e6d4-40d4-8641-53a9353e8cff` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `b35ab863-95e0-435e-b13c-040f8548aab1` | - | 16/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `5351ebdf-3a6d-473b-9512-31e635404963` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `385fb0ca-23ca-4b09-815b-7d335fc04a87` | - | 07/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `0226215e-467a-460b-96b7-544dc7dcdda9` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `d9dcc014-e5c7-4525-8f2f-62cf801b4e6d` | - | 12/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `6190036e-1094-4672-9339-ffa64a7eee23` | - | 12/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `3b489a29-d87f-4edf-b11a-09d1bc028b49` | - | 19/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `f0047ed7-3829-403b-82c8-30c2f7808d6a` | - | 19/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `e757d293-fac7-401b-910f-bf1ee7c6a8a6` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `99d47a53-8b10-467c-aeec-d4ac05c86214` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `18974ff5-ed52-4f41-8986-5c40a8295035` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `fdea3178-0e3b-4605-96d9-f46cbe13e56c` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `994fa0e8-ac0d-4502-a48f-50323a2d4d64` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `a86e8253-a1f5-4c58-b780-30d6c49a883d` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `1feea1ac-56a5-4923-9e23-20b9713310f3` | - | 18/09/2026 | (sem autor) | sem autor (rotina/seed) |
| `c172d9f2-1410-40f6-b2a6-c2c2f5217d1b` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `1dd1d44f-1f7d-40e2-9ae8-436133a34d23` | - | 18/09/2026 | (sem autor) | sem autor (rotina/seed) |
| `0338c839-06cc-4a12-96d4-8027f2d06341` | - | 18/09/2026 | (sem autor) | sem autor (rotina/seed) |
| `02718b94-e8ca-47c4-b575-594c63b5c5d4` | - | 18/09/2026 | (sem autor) | sem autor (rotina/seed) |
| `cfa36897-effb-4a83-a7a7-ae59ec035dd6` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `d086f393-42fd-4901-a58d-4b36dbfd164b` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `40b2e7d6-ce91-4e12-95a4-e094e0738a15` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `807cba44-9e13-4a7e-b358-d0db97ea08ab` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `a7440028-8cb7-4376-9623-25be34821bf8` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `bfbefc62-3f4b-466a-a45b-df1146beb9b5` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `df9a4703-717f-4837-99e6-6c74910f75df` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `ccf3cc34-7d50-4cba-afde-fb2e5f20d174` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `d09266b4-8fe5-496c-aa7b-5ce8da947b7c` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `6aae8582-9eed-4493-b4b1-44f28be7ff6c` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `3c4c132c-4002-404d-9a81-e7d8378a05c1` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `616b6bb9-fbe1-41c5-ade8-c64262398d99` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `3cf719eb-d8fb-4d46-b053-0cfeba1e7639` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `31684596-eaa5-45c8-8ae4-e492484692ca` | - | 13/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `779d11b0-aa5b-47a9-9499-e42254ba2b18` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `9343257a-4598-4773-abd8-eba4e37e52c0` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `fb1e23fe-18a2-4a41-a6fd-357c9f9d8556` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `c8d8036e-9db3-4c2f-b892-d4514ae717e5` | - | 14/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `4eb76197-644a-4b2e-9a29-f63adf05c21a` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `88e0bb4e-d866-4b01-975a-26c6a8f4b51b` | - | 11/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `ad43c9bb-8ae7-4ddb-9db5-8b19b2b57805` | - | 16/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `a00f41b5-e46f-4aef-9b2e-0a23b8249a46` | - | 16/10/2026 | (sem autor) | sem autor (rotina/seed) |

### `rental_arrears_due_at_completeness` (rm_rental_arrears)

Campo: due_at. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":50.68,"nulls":37,"total":73}; limite: {"field":"due_at","maxNullPct":0,"blockAbovePct":5}. Listados: 37 (bate).

Origem: `finance.financial_entries` — 37 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `fe39fa60-9fc6-4cc8-a7bc-3c2ac5b8e9b9` | HOMO QA INTEGRAL — receita fictícia sem centro | 07/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f28d8db7-b93d-4ec0-a0ff-1458fa1d0688` | Recebimento conciliação HTTP 179232463836162739 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4f77e48a-d6ef-4022-9806-f08bdaf997ec` | Recebimento conciliação HTTP 179217922917035333 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `3927db29-808c-43c9-af43-830e5d01c2a4` | Recebimento conciliação HTTP 179183000874744879 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `11c47fa0-c1c5-416f-8888-eb003c2baeff` | Recebimento conciliação HTTP 179177992228111415 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `d893f40c-3b17-465d-aa50-fda094beed39` | Recebimento conciliação HTTP 179177997237674044 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `6d26d868-2dec-4be5-b191-ba38da986964` | Recebimento conciliação HTTP 17917805153613983 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fd55b304-bd80-44bd-b723-bdc4864270bc` | Recebimento conciliação HTTP 179178138882028968 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0987b775-cd96-477f-93cb-eca01a89d3ae` | Recebimento conciliação HTTP 179199530417241126 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1e7d16f2-5755-4836-9cb9-fd4af326f20d` | Recebimento conciliação HTTP 179178062780759692 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c476ffff-2344-459f-81f9-78b77a7cd948` | Recebimento conciliação HTTP 179181170660630886 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `4c617098-d306-4c55-a0da-315c4cdb172a` | Recebimento conciliação HTTP 179216868481934920 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dd407fc8-7ad7-4ef2-89ef-26bea5e0192f` | Recebimento conciliação HTTP 179192896162495716 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0fcac864-2dd9-4ab4-88f5-8d5dbf51365c` | Recebimento conciliação HTTP 179234123764013214 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c276728f-0a68-4b4e-84cd-5f013ed1c93b` | Recebimento conciliação HTTP 179178087533691676 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `db4ef6cb-dab7-47f9-93ec-d89f65c2c5ce` | Recebimento conciliação HTTP 179240924461249433 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8e6977af-b0d1-4111-b4c8-b2e04f0cf85c` | Recebimento conciliação HTTP 179216764717369325 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0270438e-7a1e-4082-9ce0-e74b801a20dc` | Recebimento conciliação HTTP 179193090172137380 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ff8fbb6f-b757-4aea-bdba-7ce1b6535995` | Recebimento conciliação HTTP 179216791969861191 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `494cbc3b-e966-4256-85ee-58f0dfd5759e` | Recebimento conciliação HTTP 179178003065017918 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `09781171-4c8a-4e57-b813-6880df8fbbd0` | Recebimento conciliação HTTP 179216795758647699 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `9683a4e1-f9fd-48e8-8bd2-2a048e2e3e49` | Recebimento conciliação HTTP 179232530222020357 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `df501e55-3228-43e2-bdd0-7d9e81dd5e66` | Recebimento conciliação HTTP 179232614284274553 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `e7d10a3c-24ea-4324-ab75-c8e5c6370d4e` | Recebimento conciliação HTTP 179199654319277410 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `618e2b72-0e29-4f30-8e41-6888dcf28ec9` | Recebimento conciliação HTTP 179216782236156615 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `62c405e0-f9ca-404f-b28b-6b3b1b98fb69` | Recebimento conciliação HTTP 179240702299135596 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `58e6a678-fb29-46d0-b78d-bd25db46f8f9` | Recebimento conciliação HTTP 179251467049537612 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ca2c196f-d59e-466f-9ede-abdfd73afd83` | Recebimento conciliação HTTP 179241122529453702 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5229c66d-7b5b-4b33-b3cf-8dedd28e5432` | Recebimento conciliação HTTP 17924318955629971 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `2a5c1b94-6cdf-4974-acd0-574672a72fb3` | Recebimento conciliação HTTP 179241736650432545 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b23092a3-0a54-49da-8cd8-fdcac9827eed` | Recebimento conciliação HTTP 179251324145391941 | 20/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `68796979-de87-4275-840d-f01fec125ed0` | Recebimento conciliação HTTP 179241183608423883 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `f1c6c42b-016e-4e94-bfd7-cc2ec77219fb` | IA RETESTE M4 28-10 — recebimento fictício 0,10 + 0,20, sem movimentação real | 28/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `bfbd6ac0-8bf3-411d-9346-0bb8470fd7ef` | Grupo 179251292027330475 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `af84df51-4824-43d1-b21a-345c7c5b7233` | Grupo 179251292027330475 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `61b100ab-51f1-4956-aabb-25b6dd7c5bbd` | Grupo 179251292363597847 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |
| `4b803484-d5d9-480b-a433-4c8a2ad2682b` | Grupo 179251292363597847 | 20/10/2026 | (sem autor) | sem autor (rotina/seed) |

### `rental_contracts_total_value_completeness` (rm_rental_contracts)

Campo: total_value. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":10.18,"nulls":23,"total":226}; limite: {"field":"total_value","maxNullPct":0,"blockAbovePct":5}. Listados: 23 (bate).

Origem: `legal.contracts` — 23 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `580f82a0-eceb-46d9-bf06-e5c6d7a9bffa` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `875588ff-b1cf-43c0-a124-176b4036f348` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4173e7d6-6e0e-4462-855b-914318b7c9b0` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `056ad9fe-1888-485a-861e-6fcc1e5b92f7` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `bd8be6d4-3f1d-4b5a-8bf6-f616ee06601e` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ae5e8653-e790-464b-9536-0a6b0852bbd3` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `40a68595-89c6-4659-8b39-97399c24ef97` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6dcd4bc5-6697-4ad2-89fa-c950b5358fa5` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a4568f88-853c-4a3b-9eda-e5221c164afb` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `c72e2b3e-8911-4886-9d57-5a71a66ead06` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `61c78a51-950a-45bc-a768-cdfbeaa3c7d3` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `ca740fe4-a591-46d1-804b-78a265443431` | - | 18/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `e0237b9f-a2c8-43cb-817b-39e0a060c242` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4d8a7af9-4cc5-41d7-b489-80fae8037e10` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `6b08c80a-5abf-4883-9a37-ff7aad706bf5` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b8caa051-2d68-4955-9ca0-e63405876463` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `d6c4906b-3862-4d2e-a04a-0bb25de3bcd1` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `b97156dd-9ca1-4816-8ba0-6174cafa2109` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `4ff822c5-5c20-4ae8-9fd3-5307fd7246c6` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `2e6c5495-b73c-4b66-bb06-f83dadaae0cd` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `0303fb1a-abfd-439b-ad65-e974c43833dc` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `becb5148-29b7-49d9-a2a5-6e4b6e4b2649` | - | 19/10/2026 | [e-mail mascarado] | criado por conta de teste |
| `a460903c-6b15-41b1-bfb5-1ef2ff2a47f5` | - | 20/10/2026 | [e-mail mascarado] | criado por conta de teste |

### `rental_insp_keys_contract_id_completeness` (rm_rental_inspections_keys)

Campo: contract_id. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":23.53,"nulls":8,"total":34}; limite: {"field":"contract_id","maxNullPct":1,"blockAbovePct":5}. Listados: 8 (bate).

Origem: `legal.inspections` — 8 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `ef55ee07-a6ca-46c6-becf-030ece449a5c` | - | 29/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `047c0863-8d2f-48da-8f4f-b5fc0aa09435` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `485d9cba-a8bb-48bd-afeb-53f894a41431` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `300a9193-c697-4600-bd11-174079949dd9` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `56cb0262-7010-4fa9-bac7-db58acb1b96e` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `8fdcb6fa-c8c9-41b5-a7ea-cbb59eeb2eac` | - | 22/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `4f5274d6-cd6a-4f74-8efa-36566803ca6e` | - | 29/09/2026 | [e-mail mascarado] | criado por conta de teste |
| `f3372984-a251-40af-84dc-de3331f1e954` | - | 02/10/2026 | [e-mail mascarado] | criado por conta de teste |

### `rental_repasses_reference_month_completeness` (rm_rental_repasses)

Campo: reference_month. Última execução: 16/11/2026, 18:52:43. Contagem da verificação: {"pct":78.79,"nulls":26,"total":33}; limite: {"field":"reference_month","maxNullPct":1,"blockAbovePct":5}. Listados: 26 (bate).

Origem: `finance.owner_repasses` — 26 registro(s).

| id | Nome / descrição | Criado em | Por | Classificação |
|---|---|---|---|---|
| `7d4c6982-44ab-435e-894d-320668a90f84` | repasse-http-179178052363430789 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `c28472af-7dff-4d24-bfa0-7d742e7db632` | repasse-http-179178063607864781 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `69b9ec32-a36e-4bb8-a0d1-2faac9590bcb` | repasse-http-179178088359724969 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fe08d4e3-a4fa-4877-b222-627e50afa288` | repasse-http-179178139707757513 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `a1c45dea-9f66-4f6c-b376-d34273d19188` | repasse-http-179181171486131417 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8cdfbbe3-0889-4789-82d4-ccb3e8cb3353` | repasse-http-179199531235327561 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `eeb90764-e86c-48e1-adf0-69c1b54f2c83` | repasse-http-17918300189272884 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `30a147e4-726d-4993-8b2b-c8f8fc34917a` | repasse-http-179192896956910913 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dd2bd6aa-c9c1-4341-b940-79249201d518` | repasse-http-179216869310681959 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `dcbecf4f-ba1a-4710-bc5f-1cd5bb21be4e` | repasse-http-179193090947688612 | 13/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `43617d09-8829-4be6-9caa-847f3b2950e1` | repasse-http-179199655146719657 | 14/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `957cfada-0e75-4596-8c36-9c17203f1f34` | repasse-http-179217923742165488 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `0ebd2371-48a3-4736-a753-185964587f7f` | repasse-http-17921676553808759 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `293e46e9-12b1-491b-86c9-a9d5dad86ac5` | repasse-http-179232464563753641 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `1b8cdfe1-11bf-46e9-af6f-4f147954d794` | repasse-http-179232530992331599 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `876b8a9a-7891-4fad-866c-2a2eb6f0676f` | repasse-http-179232615012126915 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `679ab1e2-f297-41ca-bac0-3f4b9be61e2a` | repasse-http-179177987913360771 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `b192a641-dc28-4abb-b918-e549b27883c3` | repasse-http-179177992874176140 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5d377fe7-9440-496a-b912-2ff2b08d69b6` | repasse-http-179177998065222995 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `8894b309-38df-461b-a942-9301ff4d6958` | repasse-http-179234124494191366 | 18/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `5d6136c4-a6ae-4bb5-9ec7-faa93dfcd750` | repasse-http-179178003886555270 | 12/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `7e35240b-5f93-43c4-a5ae-e49a26b4b617` | repasse-http-17921678305433061 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `cacd3a27-ea7e-4299-8d5d-8e2dd3cf62ee` | repasse-http-179240703007748876 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `44077ba2-c5fd-4b0c-a892-7d2730921a0c` | repasse-http-179216792798540151 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `ceb20035-9267-457c-aa28-3697eeca26d7` | repasse-http-179216796589662710 | 16/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |
| `fce41dfa-2cb9-4144-bd79-fd70e5da7e80` | repasse-http-179240925094750193 | 19/10/2026 | [e-mail mascarado] | resíduo de teste (marca no nome) |

## Como reproduzir

`ferramentas/residuo/gerar-residuo.js` (só leitura, as mesmas consultas das verificações) e `render-residuo.js`. JSON completo: `resposta-16-11/residuo-homologacao.json`.

