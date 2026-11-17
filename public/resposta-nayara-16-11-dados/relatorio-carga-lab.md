# Relatório da carga em escala cheia do BI (etapa 13 da esteira, promoção ao LAB)

Gerado em 2026-11-16. Dados completos (todas as execuções, por operação e por painel): `relatorio-carga-lab.json` nesta pasta.

## Onde e como

- **Ambientes.** Decisão do Patrick de 16/11/2026 (sem servidor novo): LAB = a homologação publicada; DEV = a esteira do GitHub com banco descartável. A carga grava 1,2 milhão de linhas e por isso roda, como no job bi-promocao, em banco descartável 127.0.0.1 (PostgreSQL 17, cluster novo por execução, 667 migrations, RLS real com o role de runtime NOSUPERUSER/NOBYPASSRLS); nunca na homologação, onde a etapa 12 só lê (GET dos painéis).
- **Comando.** node scripts/withDisposableDb.js -- bash -c "node scripts/seed-ci-two-tenants.js && node scripts/analytics/loadTest.js --scale full --rounds 3 --json <arquivo>" (o mesmo comando da etapa 13 em scripts/analytics/ci/etapas.js; --json só grava este arquivo), pela fila global da máquina
- **Máquina.** MacBook com 8 núcleos e 16 GB, compartilhada com os outros lotes (carga média registrada em cada execução); banco, API do BI e fluxo operacional na mesma máquina
- **Método.** Massa determinística (semente 42): 4 empresas, 24 meses. Fluxo operacional: 4 usuários em laço fechado (criar lançamento, liquidar, mover oportunidade, apontar relatório de obra) com RLS real. Com BI: 8 usuários pelo router real de /analytics (metade abre os 13 painéis com os seus indicadores, metade lê os indicadores; os dois alternam o detalhe) e o rebuild de rm_finance_health no meio de cada janela. Rodadas alternadas sem BI / com BI, 3 rodadas de 20 s cada (mais 3 s de aquecimento descartado). Sem BI, os mesmos 8 usuários fazem a carga neutra (mesmo HTTP e JSON, nenhuma consulta ao banco).

## Limite adotado e de onde vem

O livro (Marco 9, BI §21: 'Dashboard pesado não degrada OLTP em teste de carga'; §19: 'consultas OLTP críticas protegidas'; metas p95 por painel) exige a não degradação e não dá número. O limite é o parâmetro do administrador analytics.carga.degradacao_max_pct (padrão 10%), com o piso analytics.carga.tolerancia_absoluta_ms (padrão 2 ms), aba 'BI e Centro de Comando' (src/features/analytics/loadTest.settings.js). Passa a operação cujo p95 com BI fica até 10% acima do p95 sem BI (ou até 2 ms acima), no agregado das rodadas ou na maioria delas. Painel: p95 <= dashboard_definitions.p95_target_ms (M9-D698). Também exigidos: zero sessões do fluxo operacional esperando bloqueio de sessão do BI, rebuild sob carga com o mesmo hash e nenhuma falha inesperada.

## Resultado

**Versão final dccd0bfa: APROVADA nas 3 execuções finais.** OLTP p95 com BI de 0,8 a 1,2 ms (sem BI 2,8 a 3,6 ms; antes das correções, com BI 6,6 a 10,5 ms); painéis bem abaixo das metas; 0 bloqueios causados pelo BI; rebuild reproduziu o hash.

- **original (4c43f5c1)**: REPROVADA. loadTest: Validation error (SequelizeUniqueConstraintError em bank_transactions_account_fingerprint_uk ao gravar a massa da escala cheia); nenhuma medida (16/11/2026 21:58)
- **antes das correções de banco** (commit 58626428, 02:11 UTC): **REPROVADA**. Pior degradação do p95 do fluxo operacional: 236,2% (mover_oportunidade, 2,885 → 9,698 ms). Painéis fora da meta: nenhum. Carga média da máquina: 3,18 5,72 10,07 → 8,45 6,52 8,94.
- **intermediária 1 (porta de leituras)** (commit 6e8a23ec, 02:16 UTC): **REPROVADA**. Pior degradação do p95 do fluxo operacional: 51,9% (criar_lancamento, 8,18 → 12,424 ms). Painéis fora da meta: crm, tech, finance, health, rental. Carga média da máquina: 7,18 6,36 8,82 → 14,29 9,48 9,31.
- **intermediária 2 (porta de leituras)** (commit 6e8a23ec, 02:22 UTC): **APROVADA**. Pior degradação do p95 do fluxo operacional: 56,8% (criar_lancamento, 2,31 → 3,621 ms) (passou só pelo piso de 2 ms: +1,311 ms; sem folga). Painéis fora da meta: nenhum. Carga média da máquina: 11,41 9,31 9,25 → 4,58 6,71 8,09.
- **final 1** (commit dccd0bfa, 02:43 UTC): **APROVADA**. Pior degradação do p95 do fluxo operacional: -67,3% (criar_lancamento, 3,514 → 1,149 ms). Painéis fora da meta: nenhum. Carga média da máquina: 1,81 2,62 4,54 → 2,42 2,65 4,04.
- **final 2** (commit dccd0bfa, 02:48 UTC): **APROVADA**. Pior degradação do p95 do fluxo operacional: -67% (criar_lancamento, 3,456 → 1,142 ms). Painéis fora da meta: nenhum. Carga média da máquina: 2,01 2,54 3,97 → 2,32 2,43 3,53.
- **final 3** (commit dccd0bfa, 02:53 UTC): **APROVADA**. Pior degradação do p95 do fluxo operacional: -66,5% (criar_lancamento, 3,439 → 1,152 ms). Painéis fora da meta: nenhum. Carga média da máquina: 2,29 2,41 3,50 → 2,17 2,31 3,16.

## Massa usada (igual em todas as execuções com medida)

Escala full, semente 42, 4 empresas, 24 meses de histórico, digest `3c1f5c6ca88417afdefce36275ea9ec61b7ae1a3307a69333a205cf6ba36a5b7`.

| Tabela | Linhas |
|---|---:|
| finance.financial_entries | 600.000 |
| finance.bank_transactions | 80.000 |
| crm.opportunities | 160.000 |
| real_estate.properties | 32.000 |
| construction.projects | 1.200 |
| construction.project_stages | 7.200 |
| construction.stage_measurements | 160.000 |
| construction.daily_reports | 160.000 |

Mais os dois tenants fictícios do seed do CI (scripts/seed-ci-two-tenants.js).

## antes das correções de banco (commit 58626428): REPROVADA

Início 2026-11-17T02:11:13.036Z, fim 2026-11-17T02:16:23.847Z. CPU da máquina na janela mais ocupada: 71% (limite de saturação 85%; latência conclusiva).

| Operação do fluxo operacional | p50 sem BI | p95 sem BI | p50 com BI | p95 com BI | Degradação do p95 | Dentro do limite |
|---|---:|---:|---:|---:|---:|---|
| liquidar_lancamento | 1,601 ms | 2,821 ms | 1,2 ms | 6,571 ms | 132,9% (+3,75 ms) | NÃO (0 de 3 rodadas) |
| mover_oportunidade | 1,758 ms | 2,885 ms | 1,454 ms | 9,698 ms | 236,2% (+6,813 ms) | NÃO (0 de 3 rodadas) |
| apontar_relatorio | 1,474 ms | 2,525 ms | 1,201 ms | 6,568 ms | 160,1% (+4,043 ms) | NÃO (0 de 3 rodadas) |
| criar_lancamento | 1,974 ms | 3,111 ms | 1,636 ms | 10,45 ms | 235,9% (+7,339 ms) | NÃO (0 de 3 rodadas) |

| Painel | p50 | p95 | Meta p95 | Aberturas | Na meta |
|---|---:|---:|---:|---:|---|
| command_center | 7,826 ms | 345,468 ms | 2500 ms | 50 | sim |
| postwork | 20,713 ms | 104,539 ms | 1800 ms | 51 | sim |
| inventory | 74,024 ms | 248,572 ms | 1800 ms | 51 | sim |
| crm | 242,271 ms | 717,535 ms | 1500 ms | 50 | sim |
| tech | 161,329 ms | 609,561 ms | 1400 ms | 50 | sim |
| construction | 112,381 ms | 279,048 ms | 1800 ms | 48 | sim |
| correspondent | 68,245 ms | 245,442 ms | 1800 ms | 50 | sim |
| finance | 269,524 ms | 610,898 ms | 1500 ms | 49 | sim |
| health | 517,631 ms | 842,204 ms | 2500 ms | 51 | sim |
| legal | 71,337 ms | 223,712 ms | 1800 ms | 48 | sim |
| marketing | 85,537 ms | 304,561 ms | 1500 ms | 50 | sim |
| rental | 194,269 ms | 541,632 ms | 1500 ms | 49 | sim |
| support | 34,364 ms | 139,528 ms | 1500 ms | 50 | sim |

Detalhe (drill-down): 670 aberturas, p50 9,103 ms, p95 625,816 ms, 0 erros. Bloqueios causados pelo BI: 0 em 2217 amostras. Rebuild sob carga: concluiu e reproduziu o hash (3 execuções).

Reprovações:
- [OLTP] liquidar_lancamento: p95 6.571 ms contra 2.821 ms (limite 10% e piso de 2 ms; 0 de 3 rodadas dentro do limite)
- [OLTP] mover_oportunidade: p95 9.698 ms contra 2.885 ms (limite 10% e piso de 2 ms; 0 de 3 rodadas dentro do limite)
- [OLTP] apontar_relatorio: p95 6.568 ms contra 2.525 ms (limite 10% e piso de 2 ms; 0 de 3 rodadas dentro do limite)
- [OLTP] criar_lancamento: p95 10.45 ms contra 3.111 ms (limite 10% e piso de 2 ms; 0 de 3 rodadas dentro do limite)

## intermediária 1 (porta de leituras) (commit 6e8a23ec): REPROVADA

Início 2026-11-17T02:16:50.623Z, fim 2026-11-17T02:21:27.321Z. CPU da máquina na janela mais ocupada: 72% (limite de saturação 85%; latência conclusiva).

| Operação do fluxo operacional | p50 sem BI | p95 sem BI | p50 com BI | p95 com BI | Degradação do p95 | Dentro do limite |
|---|---:|---:|---:|---:|---:|---|
| liquidar_lancamento | 2,081 ms | 6,371 ms | 1,971 ms | 7,67 ms | 20,4% (+1,299 ms) | sim (3 de 3 rodadas) |
| apontar_relatorio | 1,747 ms | 5,908 ms | 1,906 ms | 7,318 ms | 23,9% (+1,41 ms) | sim (2 de 3 rodadas) |
| mover_oportunidade | 2,107 ms | 8,296 ms | 2,286 ms | 12,097 ms | 45,8% (+3,801 ms) | NÃO (0 de 3 rodadas) |
| criar_lancamento | 2,333 ms | 8,18 ms | 2,572 ms | 12,424 ms | 51,9% (+4,244 ms) | NÃO (0 de 3 rodadas) |

| Painel | p50 | p95 | Meta p95 | Aberturas | Na meta |
|---|---:|---:|---:|---:|---|
| command_center | 42,477 ms | 1766,592 ms | 2500 ms | 23 | sim |
| postwork | 60,272 ms | 173,15 ms | 1800 ms | 22 | sim |
| inventory | 214,125 ms | 663,937 ms | 1800 ms | 23 | sim |
| crm | 1053,476 ms | 2714,83 ms | 1500 ms | 24 | NÃO |
| tech | 667,695 ms | 2048,556 ms | 1400 ms | 19 | NÃO |
| construction | 386,137 ms | 1262,571 ms | 1800 ms | 24 | sim |
| correspondent | 250,066 ms | 945,198 ms | 1800 ms | 20 | sim |
| finance | 814,878 ms | 2702,233 ms | 1500 ms | 24 | NÃO |
| health | 1366,563 ms | 3850,157 ms | 2500 ms | 20 | NÃO |
| legal | 204,725 ms | 795,673 ms | 1800 ms | 24 | sim |
| marketing | 253,854 ms | 1096,845 ms | 1500 ms | 20 | sim |
| rental | 486,706 ms | 2032,64 ms | 1500 ms | 19 | NÃO |
| support | 114,994 ms | 392,699 ms | 1500 ms | 20 | sim |

Detalhe (drill-down): 457 aberturas, p50 46,691 ms, p95 234,287 ms, 0 erros. Bloqueios causados pelo BI: 0 em 2689 amostras. Rebuild sob carga: concluiu e reproduziu o hash (3 execuções).

Reprovações:
- [OLTP] mover_oportunidade: p95 12.097 ms contra 8.296 ms (limite 10% e piso de 2 ms; 0 de 3 rodadas dentro do limite)
- [OLTP] criar_lancamento: p95 12.424 ms contra 8.18 ms (limite 10% e piso de 2 ms; 0 de 3 rodadas dentro do limite)
- [PAINEL] crm: p95 2714.83 ms contra a meta de 1500 ms
- [PAINEL] tech: p95 2048.556 ms contra a meta de 1400 ms
- [PAINEL] finance: p95 2702.233 ms contra a meta de 1500 ms
- [PAINEL] health: p95 3850.157 ms contra a meta de 2500 ms
- [PAINEL] rental: p95 2032.64 ms contra a meta de 1500 ms

## intermediária 2 (porta de leituras) (commit 6e8a23ec): APROVADA

Início 2026-11-17T02:22:07.872Z, fim 2026-11-17T02:27:23.598Z. CPU da máquina na janela mais ocupada: 60% (limite de saturação 85%; latência conclusiva).

| Operação do fluxo operacional | p50 sem BI | p95 sem BI | p50 com BI | p95 com BI | Degradação do p95 | Dentro do limite |
|---|---:|---:|---:|---:|---:|---|
| liquidar_lancamento | 0,681 ms | 2,479 ms | 0,942 ms | 2,955 ms | 19,2% (+0,476 ms) | sim (2 de 3 rodadas) |
| apontar_relatorio | 0,64 ms | 1,858 ms | 0,878 ms | 2,68 ms | 44,2% (+0,822 ms) | sim (2 de 3 rodadas) |
| criar_lancamento | 0,892 ms | 2,31 ms | 1,254 ms | 3,621 ms | 56,8% (+1,311 ms) | sim (2 de 3 rodadas) |
| mover_oportunidade | 0,792 ms | 2,077 ms | 1,083 ms | 3,208 ms | 54,5% (+1,131 ms) | sim (2 de 3 rodadas) |

| Painel | p50 | p95 | Meta p95 | Aberturas | Na meta |
|---|---:|---:|---:|---:|---|
| command_center | 6,461 ms | 166,193 ms | 2500 ms | 68 | sim |
| postwork | 17,512 ms | 51,8 ms | 1800 ms | 60 | sim |
| inventory | 64,214 ms | 156,613 ms | 1800 ms | 64 | sim |
| crm | 212,713 ms | 536,242 ms | 1500 ms | 68 | sim |
| tech | 142,346 ms | 342,06 ms | 1400 ms | 60 | sim |
| construction | 76,478 ms | 248,551 ms | 1800 ms | 68 | sim |
| correspondent | 51,857 ms | 112,508 ms | 1800 ms | 66 | sim |
| finance | 188,531 ms | 507,194 ms | 1500 ms | 66 | sim |
| health | 357,143 ms | 1169,595 ms | 2500 ms | 62 | sim |
| legal | 41,658 ms | 108,554 ms | 1800 ms | 62 | sim |
| marketing | 87,288 ms | 168,346 ms | 1500 ms | 60 | sim |
| rental | 124,462 ms | 309,322 ms | 1500 ms | 60 | sim |
| support | 29,474 ms | 121,721 ms | 1500 ms | 60 | sim |

Detalhe (drill-down): 888 aberturas, p50 6,872 ms, p95 68,885 ms, 0 erros. Bloqueios causados pelo BI: 0 em 2279 amostras. Rebuild sob carga: concluiu e reproduziu o hash (3 execuções).

## final 1 (commit dccd0bfa): APROVADA

Início 2026-11-17T02:43:46.953Z, fim 2026-11-17T02:48:05.227Z. CPU da máquina na janela mais ocupada: 23% (limite de saturação 85%; latência conclusiva).

| Operação do fluxo operacional | p50 sem BI | p95 sem BI | p50 com BI | p95 com BI | Degradação do p95 | Dentro do limite |
|---|---:|---:|---:|---:|---:|---|
| liquidar_lancamento | 2,22 ms | 3,568 ms | 0,648 ms | 1,047 ms | -70,7% (-2,521 ms) | sim (3 de 3 rodadas) |
| apontar_relatorio | 1,996 ms | 2,856 ms | 0,613 ms | 0,823 ms | -71,2% (-2,033 ms) | sim (3 de 3 rodadas) |
| criar_lancamento | 2,625 ms | 3,514 ms | 0,826 ms | 1,149 ms | -67,3% (-2,365 ms) | sim (3 de 3 rodadas) |
| mover_oportunidade | 2,343 ms | 3,247 ms | 0,72 ms | 1,014 ms | -68,8% (-2,233 ms) | sim (3 de 3 rodadas) |

| Painel | p50 | p95 | Meta p95 | Aberturas | Na meta |
|---|---:|---:|---:|---:|---|
| command_center | 4,577 ms | 33,477 ms | 2500 ms | 94 | sim |
| postwork | 12,403 ms | 16,989 ms | 1800 ms | 88 | sim |
| inventory | 22,597 ms | 46,685 ms | 1800 ms | 92 | sim |
| crm | 69,873 ms | 105,645 ms | 1500 ms | 92 | sim |
| tech | 47,794 ms | 91,443 ms | 1400 ms | 88 | sim |
| construction | 43,46 ms | 54,991 ms | 1800 ms | 96 | sim |
| correspondent | 23,655 ms | 37,85 ms | 1800 ms | 93 | sim |
| finance | 68,266 ms | 104,305 ms | 1500 ms | 96 | sim |
| health | 146,058 ms | 233,275 ms | 2500 ms | 89 | sim |
| legal | 26,045 ms | 41,44 ms | 1800 ms | 92 | sim |
| marketing | 42,378 ms | 82,892 ms | 1500 ms | 88 | sim |
| rental | 48,976 ms | 65,459 ms | 1500 ms | 88 | sim |
| support | 20,1 ms | 30,317 ms | 1500 ms | 88 | sim |

Detalhe (drill-down): 1094 aberturas, p50 3,803 ms, p95 48,094 ms, 0 erros. Bloqueios causados pelo BI: 0 em 2306 amostras. Rebuild sob carga: concluiu e reproduziu o hash (3 execuções).

## final 2 (commit dccd0bfa): APROVADA

Início 2026-11-17T02:48:31.549Z, fim 2026-11-17T02:52:48.122Z. CPU da máquina na janela mais ocupada: 23% (limite de saturação 85%; latência conclusiva).

| Operação do fluxo operacional | p50 sem BI | p95 sem BI | p50 com BI | p95 com BI | Degradação do p95 | Dentro do limite |
|---|---:|---:|---:|---:|---:|---|
| liquidar_lancamento | 2,195 ms | 3,566 ms | 0,638 ms | 1,055 ms | -70,4% (-2,511 ms) | sim (3 de 3 rodadas) |
| apontar_relatorio | 1,969 ms | 2,814 ms | 0,601 ms | 0,814 ms | -71,1% (-2 ms) | sim (3 de 3 rodadas) |
| mover_oportunidade | 2,337 ms | 3,168 ms | 0,709 ms | 1,006 ms | -68,2% (-2,162 ms) | sim (3 de 3 rodadas) |
| criar_lancamento | 2,611 ms | 3,456 ms | 0,819 ms | 1,142 ms | -67% (-2,314 ms) | sim (3 de 3 rodadas) |

| Painel | p50 | p95 | Meta p95 | Aberturas | Na meta |
|---|---:|---:|---:|---:|---|
| command_center | 5,23 ms | 114,463 ms | 2500 ms | 92 | sim |
| postwork | 13,433 ms | 17,783 ms | 1800 ms | 88 | sim |
| inventory | 25,653 ms | 35,677 ms | 1800 ms | 90 | sim |
| crm | 74,629 ms | 103,495 ms | 1500 ms | 92 | sim |
| tech | 56,153 ms | 80,497 ms | 1400 ms | 88 | sim |
| construction | 46,487 ms | 58,048 ms | 1800 ms | 94 | sim |
| correspondent | 25,781 ms | 42,007 ms | 1800 ms | 92 | sim |
| finance | 71,429 ms | 120,012 ms | 1500 ms | 90 | sim |
| health | 178,732 ms | 222,861 ms | 2500 ms | 88 | sim |
| legal | 28,623 ms | 37,375 ms | 1800 ms | 86 | sim |
| marketing | 47,323 ms | 85,395 ms | 1500 ms | 88 | sim |
| rental | 54,963 ms | 72,551 ms | 1500 ms | 86 | sim |
| support | 21,806 ms | 31,775 ms | 1500 ms | 88 | sim |

Detalhe (drill-down): 1076 aberturas, p50 4,059 ms, p95 47,601 ms, 0 erros. Bloqueios causados pelo BI: 0 em 2299 amostras. Rebuild sob carga: concluiu e reproduziu o hash (3 execuções).

## final 3 (commit dccd0bfa): APROVADA

Início 2026-11-17T02:53:14.521Z, fim 2026-11-17T02:57:30.448Z. CPU da máquina na janela mais ocupada: 23% (limite de saturação 85%; latência conclusiva).

| Operação do fluxo operacional | p50 sem BI | p95 sem BI | p50 com BI | p95 com BI | Degradação do p95 | Dentro do limite |
|---|---:|---:|---:|---:|---:|---|
| liquidar_lancamento | 2,219 ms | 3,592 ms | 0,638 ms | 1,085 ms | -69,8% (-2,507 ms) | sim (3 de 3 rodadas) |
| apontar_relatorio | 1,972 ms | 2,762 ms | 0,599 ms | 0,805 ms | -70,9% (-1,957 ms) | sim (3 de 3 rodadas) |
| mover_oportunidade | 2,3 ms | 3,128 ms | 0,716 ms | 1,025 ms | -67,2% (-2,103 ms) | sim (3 de 3 rodadas) |
| criar_lancamento | 2,587 ms | 3,439 ms | 0,828 ms | 1,152 ms | -66,5% (-2,287 ms) | sim (3 de 3 rodadas) |

| Painel | p50 | p95 | Meta p95 | Aberturas | Na meta |
|---|---:|---:|---:|---:|---|
| command_center | 5,196 ms | 114,388 ms | 2500 ms | 92 | sim |
| postwork | 13,034 ms | 19,638 ms | 1800 ms | 88 | sim |
| inventory | 24,604 ms | 53,716 ms | 1800 ms | 90 | sim |
| crm | 70,267 ms | 105,875 ms | 1500 ms | 92 | sim |
| tech | 52,393 ms | 80,518 ms | 1400 ms | 88 | sim |
| construction | 44,07 ms | 64,075 ms | 1800 ms | 96 | sim |
| correspondent | 24,547 ms | 37,361 ms | 1800 ms | 92 | sim |
| finance | 68,098 ms | 140,313 ms | 1500 ms | 92 | sim |
| health | 165,581 ms | 217,615 ms | 2500 ms | 88 | sim |
| legal | 28,188 ms | 42,215 ms | 1800 ms | 88 | sim |
| marketing | 47,46 ms | 76,53 ms | 1500 ms | 88 | sim |
| rental | 53,43 ms | 73,482 ms | 1500 ms | 88 | sim |
| support | 21,231 ms | 30,506 ms | 1500 ms | 88 | sim |

Detalhe (drill-down): 1080 aberturas, p50 4,02 ms, p95 46,615 ms, 0 erros. Bloqueios causados pelo BI: 0 em 2298 amostras. Rebuild sob carga: concluiu e reproduziu o hash (3 execuções).

## Causas encontradas e corrigidas

- **Causa:** A massa da escala cheia não entrava: desde o UNIQUE completo (bank_account_id, fingerprint) da migration 10411, transações da mesma conta, dia, valor e sentido empatavam no fingerprint e o seed parava com SequelizeUniqueConstraintError (a etapa reprovava antes de medir).
  **Correção:** Cada transação da massa ganha o histórico 'Extrato de carga <n>'. Commit 58626428; teste: test/marco9/analytics/m9d699.massa.test.js (escala cheia, semente do pipeline).
- **Causa:** O detalhe dos indicadores financeiros lia o ledger cinco vezes por abertura e, sem índice com empresa/natureza/status/período, cada leitura varria finance.financial_entries inteira em paralelo (430 a 760 ms por contagem/soma, até 8,8 s na amostra ordenada por id), o maior consumo de banco do BI.
  **Correção:** Índices (company_id, nature, status, due_at) e (company_id, nature, status, settled_at) (migration 20261116230000) e uma varredura para contagem e total por abertura; a massa roda ANALYZE. Commit a033d3d3; teste: test/marco9/analytics/m9d699.detalheVarredura.test.js e m9d699.indicesLedger.test.js.
- **Causa:** Sem limite, cada GET de BI abria uma transação no banco do fluxo operacional (8 usuários = 8 sessões do BI ao mesmo tempo, cerca de 2.500 consultas/s); mesmo com os índices o p95 do fluxo operacional subia de 2 para 6 a 9 ms.
  **Correção:** Porta de leituras simultâneas do BI por processo (readOnly.concurrency.js), parâmetro analytics.consulta.max_simultaneas (padrão 3); as demais esperam a vez sem ocupar o banco; espera acima de analytics.consulta.timeout_ms = 503 ANALYTICS_READ_BUSY. Commit 6e8a23ec; teste: test/marco9/analytics/m9d699.portaLeitura.test.js.
- **Causa:** O valor de cada indicador (GET /analytics/metrics/:code, 3/4 das requisições do BI sob carga) refazia a cada leitura definição, versão, snapshot, confirmação e qualidade; o cache por permissão/escopo do livro (BI §19) só valia para a composição do painel. Com a porta de leituras simultâneas, a medida passou num momento e reprovou noutro com a máquina mais ocupada (linha de base 3 vezes mais lenta): sem folga.
  **Correção:** O valor do indicador entra no mesmo cache do painel (chave com indicador, versão, empresa, período inteiro, data-base, dimensão, comparação, permissões e parâmetros analytics.* da empresa; TTL analytics.cache.ttl_segundos); snapshot novo da empresa descarta. Permissão, domínio e log de acesso do indicador CRITICAL continuam em toda leitura. Commit 02974b92 e dccd0bfa; teste: test/marco9/analytics/m9d699.cacheIndicador.test.js e m9d702.metrica.test.js.

## Observações

- Limite e veredito são os do próprio teste (scripts/analytics/load/verdict.js); nenhum critério foi afrouxado. O comando da etapa 13 roda sem --exigir-latencia, como no job; em todas as execuções a CPU da máquina ficou abaixo do limite de saturação (85%), então a latência foi conclusiva e reprovaria se passasse do limite.
- Degradação negativa (p95 com BI menor que sem BI) não quer dizer que o BI acelera o fluxo operacional: a explicação mais provável (não medida à parte) é que, com a máquina quase parada, as janelas sem BI têm só a carga neutra e a CPU entra em estados de economia, enquanto as janelas com BI mantêm os núcleos acordados. A leitura correta é "nenhuma degradação medida"; o número que importa é o p95 absoluto com BI, que caiu de 6,6 a 10,5 ms (antes das correções) para cerca de 1 ms.
- A máquina é compartilhada com outros lotes (carga média registrada em cada execução). A execução "intermediária 1" (commit 6e8a23ec) reprovou com a linha de base do fluxo operacional 3 vezes mais lenta que nas outras (6 a 8 ms contra 2 a 3 ms): foi o que mostrou que a porta sozinha não dava folga e levou à quarta correção.
- Execuções exploratórias da árvore de trabalho entre os commits (perfil de consultas e medições r4 e r5) não estão na tabela porque não correspondem exatamente a um commit; os números que guiaram as correções estão nas causas acima.
- LAB = a homologação publicada (decisão do Patrick de 16/11/2026). A carga em escala cheia grava 1,2 milhão de linhas e só roda em banco descartável (a homologação não recebe massa); na homologação a promoção faz o smoke da etapa 12 (GET de cada painel com o usuário de smoke somente leitura). A etapa 14 registra o aceite dos owners como pendente para o Marco 10 (decisão da cliente de 16/11/2026); a liberação para produção continua exigindo o aceite.
