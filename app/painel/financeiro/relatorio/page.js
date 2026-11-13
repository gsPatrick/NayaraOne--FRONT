"use client";

// GAP REAL CORRIGIDO (auditoria externa Abacus AI, 11/10/2026): "Telas obrigatórias ausentes —
// ... Relatório Financeiro autônomo" — o backend já existia inteiro
// (financialHealthReport.service.js#getWeeklyHealthReport, GET /finance/reports/weekly-health,
// já usado em M4-20), só não havia tela/menu próprio pra ele.
//
// GAP REAL CORRIGIDO (verificação cética adicional, Marco 4, 12/10/2026): o backend já expunha
// os 10 indicadores do Caderno §19 (inadimplência, pendências de conciliação, comissões
// provisionadas, repasses pendentes, anomalias de alto risco, caixa disponível, margem por
// setor, necessidade para respirar, + os 2 originais), mas esta tela só renderizava 4 deles —
// o resto ficava calculado e pronto na API sem nenhum humano conseguir ver.

import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { lookupFallback } from "@/lib/asyncState/lookup";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getWeeklyHealthReport, listResultCenters } from "@/lib/api/finance";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";
import { receivableDelta, weightsText, freeCashDelta, thirdPartyHeldDelta, delinquencyView, breathingDelta, windowRows, pendingRows } from "./reportView";

export default function RelatorioFinanceiroPage() {
  // M9-D940: carregando, erro com "tentar de novo", sem acesso e sem conexão vêm do padrão único de estados.
  const reportQuery = useAsyncState(() => getWeeklyHealthReport(), { key: "relatorio-financeiro" });
  const report = reportQuery.data;
  // Centros de resultado são apoio: se falharem, a falha é registrada (lookupFallback) e avisada, nunca vira "sem centros" em silêncio.
  const centersQuery = useAsyncState(() => listResultCenters().catch(lookupFallback("os centros de resultado")).then((rc) => (Array.isArray(rc) ? rc : rc?.items || [])), { key: "relatorio-financeiro:centros", isEmpty: () => false });
  const resultCenters = centersQuery.data || [];

  return (
    <AppShell title="Relatório financeiro" subtitle="Financeiro">
      <FinanceNavMenu />
      <AsyncState result={reportQuery} loadingLabel="Carregando relatório financeiro..." emptyTitle="Sem relatório para este período">
        {!report ? null : (
        <>
          <p className={styles.meta}>
            Gerado em {formatDate(report.generatedAt)} — janela dos próximos 7 dias até {formatDate(report.windowEndsAt)}.
          </p>

          <div className={styles.grid}>
            <StatTile label="A pagar (saldo em aberto)" value={formatBRL(report.payablePending.total)} delta={`${report.payablePending.count} lançamentos`} tone="danger" />
            <StatTile label="A receber (saldo em aberto)" value={formatBRL(report.receivablePending.total)} delta={receivableDelta(report)} tone="success" />
            <StatTile
              label="Saldo líquido projetado"
              value={formatBRL(report.projectedNetBalance)}
              delta="A receber − a pagar"
              tone={report.projectedNetBalance >= 0 ? "success" : "danger"}
            />
            <StatTile label="Terceiros ainda a movimentar" value={formatBRL(report.thirdPartyFunds.total)} delta={`${report.thirdPartyFunds.count} lançamento(s) pendente(s) de terceiros (cauções e repasses), fora da receita própria`} tone="neutral" />
            <StatTile label="Caixa disponível (conciliado)" value={formatBRL(report.freeCash.value)} delta={freeCashDelta(report)} tone={report.freeCash.value >= 0 ? "success" : "danger"} />
            <StatTile label="Dinheiro de terceiros retido" value={formatBRL(report.freeCash.thirdPartyHeld)} delta={thirdPartyHeldDelta(report)} tone="neutral" />
            <StatTile label="Inadimplência (recebíveis)" value={delinquencyView(report).value} delta={delinquencyView(report).delta} tone={report.delinquencyRatio > 0.1 ? "danger" : "neutral"} />
            <StatTile label="Necessidade para respirar" value={formatBRL(report.breathingNeed.value)} delta={breathingDelta(report)} tone={report.breathingNeed.value > 0 ? "danger" : "success"} />
          </div>

          <div className={styles.columns}>
            <Card title="Vencidos">
              <ul className={styles.list}>
                <li>
                  <span>A pagar</span>
                  <strong className={styles.danger}>{formatBRL(report.overdue.payable.total)}</strong>
                  <span className={styles.count}>{report.overdue.payable.count}</span>
                </li>
                <li>
                  <span>A receber</span>
                  <strong className={styles.danger}>{formatBRL(report.overdue.receivable.total)}</strong>
                  <span className={styles.count}>{report.overdue.receivable.count}</span>
                </li>
                <li className={styles.total}>
                  <span>Total vencido</span>
                  <strong className={styles.danger}>{formatBRL(report.overdue.total)}</strong>
                </li>
              </ul>
            </Card>

            <Card title="Vencendo nos próximos 7 / 30 / 60 dias" subtitle={weightsText(report) ? `Recebíveis ponderados por status: ${weightsText(report)}` : undefined}>
              <ul className={styles.list}>
                {windowRows(report).map((row) => (
                  <li key={row.key}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <span className={styles.count}>{row.count}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Pendências de operação">
              <ul className={styles.list}>
                {pendingRows(report).map((row) => (
                  <li key={row.key}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                    <span className={styles.count}>{row.count}</span>
                  </li>
                ))}
                <li>
                  <span>Anomalias de alto risco abertas</span>
                  <strong className={report.openHighRiskAnomalies > 0 ? styles.danger : undefined}>
                    {report.openHighRiskAnomalies ?? 0}
                  </strong>
                </li>
              </ul>
            </Card>

            {report.marginBySector?.length > 0 && (
              <Card title="Margem por centro de resultado">
                <ul className={styles.list}>
                  {report.marginBySector.map((s) => (
                    <li key={s.resultCenterId || "sem-centro"}>
                      <span>{s.resultCenterId ? (resultCenters.find((c) => c.id === s.resultCenterId)?.name || "Centro de resultado") : "Sem centro de resultado"}</span>
                      <strong className={s.margin >= 0 ? styles.success : styles.danger}>{formatBRL(s.margin)}</strong>
                      <span className={styles.count}>
                        receita {formatBRL(s.revenueRealized)} − custo {formatBRL(s.costsAttributed)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </>
        )}
      </AsyncState>
    </AppShell>
  );
}
