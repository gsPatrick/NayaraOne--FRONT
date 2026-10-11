"use client";

// GAP REAL CORRIGIDO (auditoria externa Abacus AI, 11/10/2026): "Telas obrigatórias ausentes —
// ... Relatório Financeiro autônomo" — o backend já existia inteiro
// (financialHealthReport.service.js#getWeeklyHealthReport, GET /finance/reports/weekly-health,
// já usado em M4-20), só não havia tela/menu próprio pra ele.

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

            <Card title="Vencendo nos próximos 7 dias">
              <ul className={styles.list}>
                <li>
                  <span>A pagar</span>
                  <strong>{formatBRL(report.dueNextSevenDays.payable.total)}</strong>
                  <span className={styles.count}>{report.dueNextSevenDays.payable.count}</span>
                </li>
                <li>
                  <span>A receber</span>
                  <strong>{formatBRL(report.dueNextSevenDays.receivable.total)}</strong>
                  <span className={styles.count}>{report.dueNextSevenDays.receivable.count}</span>
                </li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
