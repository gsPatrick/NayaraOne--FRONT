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

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { getWeeklyHealthReport } from "@/lib/api/finance";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function RelatorioFinanceiroPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWeeklyHealthReport()
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o relatório financeiro.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell title="Relatório financeiro" subtitle="Financeiro">
      <FinanceNavMenu />
      {loading ? (
        <SkeletonDetail />
      ) : loadError ? (
        <Alert tone="danger">{loadError}</Alert>
      ) : !report ? null : (
        <>
          <p className={styles.meta}>
            Gerado em {formatDate(report.generatedAt)} — janela dos próximos 7 dias até {formatDate(report.windowEndsAt)}.
          </p>

          <div className={styles.grid}>
            <StatTile label="A pagar (pendente)" value={formatBRL(report.payablePending.total)} delta={`${report.payablePending.count} lançamentos`} tone="danger" />
            <StatTile label="A receber (pendente)" value={formatBRL(report.receivablePending.total)} delta={`${report.receivablePending.count} lançamentos`} tone="success" />
            <StatTile
              label="Saldo líquido projetado"
              value={formatBRL(report.projectedNetBalance)}
              delta="A receber − a pagar"
              tone={report.projectedNetBalance >= 0 ? "success" : "danger"}
            />
            <StatTile label="Dinheiro de terceiros (segregado)" value={formatBRL(report.thirdPartyFunds.total)} delta={`${report.thirdPartyFunds.count} lançamentos`} tone="neutral" />
            <StatTile
              label="Caixa disponível"
              value={formatBRL(report.freeCash.value)}
              delta={`Saldo bancário ${formatBRL(report.freeCash.grossBankBalance)} − terceiros retidos ${formatBRL(report.freeCash.thirdPartyHeld)}`}
              tone={report.freeCash.value >= 0 ? "success" : "danger"}
            />
            <StatTile
              label="Inadimplência"
              value={`${(report.delinquencyRatio * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              delta="Vencido ÷ total elegível (próprio)"
              tone={report.delinquencyRatio > 0.1 ? "danger" : "neutral"}
            />
            <StatTile
              label="Necessidade para respirar"
              value={formatBRL(report.breathingNeed.value)}
              delta="Saídas obrigatórias 7d − caixa livre − entradas prováveis"
              tone={report.breathingNeed.value > 0 ? "danger" : "success"}
            />
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

            <Card title="Vencendo nos próximos 7 / 30 / 60 dias">
              <ul className={styles.list}>
                <li>
                  <span>7 dias — a pagar</span>
                  <strong>{formatBRL(report.dueNextSevenDays.payable.total)}</strong>
                  <span className={styles.count}>{report.dueNextSevenDays.payable.count}</span>
                </li>
                <li>
                  <span>7 dias — a receber</span>
                  <strong>{formatBRL(report.dueNextSevenDays.receivable.total)}</strong>
                  <span className={styles.count}>{report.dueNextSevenDays.receivable.count}</span>
                </li>
                <li>
                  <span>30 dias — a pagar</span>
                  <strong>{formatBRL(report.dueNext30Days.payable.total)}</strong>
                  <span className={styles.count}>{report.dueNext30Days.payable.count}</span>
                </li>
                <li>
                  <span>30 dias — a receber</span>
                  <strong>{formatBRL(report.dueNext30Days.receivable.total)}</strong>
                  <span className={styles.count}>{report.dueNext30Days.receivable.count}</span>
                </li>
                <li>
                  <span>60 dias — a pagar</span>
                  <strong>{formatBRL(report.dueNext60Days.payable.total)}</strong>
                  <span className={styles.count}>{report.dueNext60Days.payable.count}</span>
                </li>
                <li>
                  <span>60 dias — a receber</span>
                  <strong>{formatBRL(report.dueNext60Days.receivable.total)}</strong>
                  <span className={styles.count}>{report.dueNext60Days.receivable.count}</span>
                </li>
              </ul>
            </Card>

            <Card title="Pendências de operação">
              <ul className={styles.list}>
                <li>
                  <span>Conciliação pendente</span>
                  <strong>{formatBRL(report.pendingReconciliations.total)}</strong>
                  <span className={styles.count}>{report.pendingReconciliations.count}</span>
                </li>
                <li>
                  <span>Comissões provisionadas</span>
                  <strong>{formatBRL(report.provisionedCommissions.total)}</strong>
                  <span className={styles.count}>{report.provisionedCommissions.count}</span>
                </li>
                <li>
                  <span>Repasses de proprietário pendentes</span>
                  <strong>{formatBRL(report.pendingOwnerRepasses.total)}</strong>
                  <span className={styles.count}>{report.pendingOwnerRepasses.count}</span>
                </li>
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
                      <span>{s.resultCenterId || "Sem centro de resultado"}</span>
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
    </AppShell>
  );
}
