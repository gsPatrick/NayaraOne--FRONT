"use client";

import { useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import Button from "@/components/atoms/Button/Button";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import {
  BANK_ACCOUNTS,
  FINANCIAL_ENTRIES,
  APPROVAL_REQUESTS,
  COMMISSIONS,
  OWNER_REPASSES,
  ENTRY_NATURE_LABELS,
  ENTRY_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_TONE,
  isEntryOverdue,
} from "@/lib/mock/finance";
import { USERS } from "@/lib/mock/users";
import { formatBRL, formatDate } from "@/lib/format";
import { buildMonthlyChartData } from "@/lib/monthlyChartData";
import styles from "./page.module.css";

function userName(id) {
  return USERS.find((u) => u.id === id)?.name || "—";
}

function bankAccountOf(id) {
  return BANK_ACCOUNTS.find((a) => a.id === id) || null;
}

export default function FinanceiroPage() {
  const entries = FINANCIAL_ENTRIES;
  const bankAccounts = BANK_ACCOUNTS;
  const approvalRequests = APPROVAL_REQUESTS;
  const repasses = OWNER_REPASSES;

  const pendingPayables = useMemo(() => entries.filter((e) => e.nature === "PAYABLE" && e.status === "PENDING"), [entries]);
  const pendingReceivables = useMemo(() => entries.filter((e) => e.nature === "RECEIVABLE" && e.status === "PENDING"), [entries]);
  const overdueEntries = useMemo(() => entries.filter(isEntryOverdue), [entries]);
  const pendingApprovals = useMemo(() => approvalRequests.filter((r) => r.status === "PENDING"), [approvalRequests]);
  const totalPayable = pendingPayables.reduce((s, e) => s + Number(e.amount), 0);
  const totalReceivable = pendingReceivables.reduce((s, e) => s + Number(e.amount), 0);

  const byNature = useMemo(() => {
    const counts = {};
    entries.forEach((e) => { counts[e.nature] = (counts[e.nature] || 0) + Number(e.amount); });
    return Object.entries(counts).map(([nature, value]) => ({ label: ENTRY_NATURE_LABELS[nature] || nature, value, displayValue: formatBRL(value) }));
  }, [entries]);

  const byStatus = useMemo(() => {
    const counts = {};
    entries.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + Number(e.amount); });
    return Object.entries(counts).map(([status, value]) => ({ label: ENTRY_STATUS_LABELS[status] || status, value, displayValue: formatBRL(value) }));
  }, [entries]);

  const byBankAccount = useMemo(() => {
    const counts = {};
    entries.forEach((e) => { counts[e.bankAccountId] = (counts[e.bankAccountId] || 0) + Number(e.amount); });
    return Object.entries(counts).map(([id, value]) => ({ label: bankAccountOf(id)?.label || id, value, displayValue: formatBRL(value) }));
  }, [entries]);

  const byMonth = useMemo(
    () =>
      buildMonthlyChartData(entries, {
        getDate: (e) => e.settledAt || e.dueAt,
        getValue: (e) => Number(e.amount),
        formatValue: formatBRL,
      }),
    [entries]
  );

  const settledCount = entries.filter((e) => e.status === "SETTLED").length;
  const totalCommissions = COMMISSIONS.reduce((s, c) => s + Number(c.totalAmount), 0);
  const totalRepasses = repasses.reduce((s, r) => s + Number(r.netAmount), 0);

  return (
    <AppShell title="Financeiro">
      <div className={styles.grid}>
        <StatTile label="A pagar (pendente)" value={formatBRL(totalPayable)} tone="warning" icon="document" />
        <StatTile label="A receber (pendente)" value={formatBRL(totalReceivable)} tone="info" icon="money" />
        <StatTile label="Contas vencidas" value={overdueEntries.length} tone={overdueEntries.length > 0 ? "danger" : "success"} icon="calendar" />
        <StatTile label="Aprovações pendentes" value={pendingApprovals.length} tone={pendingApprovals.length > 0 ? "warning" : "success"} icon="shield" />
        <StatTile label="Lançamentos liquidados" value={settledCount} tone="success" icon="check" />
        <StatTile label="Contas bancárias" value={bankAccounts.length} tone="neutral" icon="money" />
        <StatTile label="Comissões (total)" value={formatBRL(totalCommissions)} tone="info" icon="chart" />
        <StatTile label="Repasses (total)" value={formatBRL(totalRepasses)} tone="info" icon="layers" />
      </div>

      <Card title="Evolução mensal" subtitle="Volume total de lançamentos por mês (vencimento/liquidação) — troque o tipo de gráfico" className={styles.heroCard}>
        <SwitchableChart items={byMonth} defaultType="line" />
      </Card>

      <div className={styles.triGrid}>
        <Card title="Por natureza" subtitle="Troque o tipo de gráfico">
          <SwitchableChart items={byNature} defaultType="column" />
        </Card>
        <Card title="Por status" subtitle="Troque o tipo de gráfico">
          <SwitchableChart items={byStatus} defaultType="donut" />
        </Card>
        <Card title="Por conta bancária" subtitle="Troque o tipo de gráfico">
          <SwitchableChart items={byBankAccount} defaultType="pie" />
        </Card>
      </div>

      <div className={styles.mainGrid}>
        <Card title="Contas vencidas" subtitle="Lançamentos pendentes com vencimento no passado">
          {overdueEntries.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma conta vencida — tudo em dia.</p>
          ) : (
            <ul className={styles.list}>
              {overdueEntries.map((e) => (
                <li key={e.id}>
                  <Link href={`/painel/financeiro/lancamentos/${e.id}`} className={styles.listRow}>
                    <span className={styles.listRowIcon}><Icon name="document" size={16} /></span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{e.description}</span>
                      <span className={styles.listRowSubtitle}>Venceu em {formatDate(e.dueAt)}</span>
                    </div>
                    <span className={styles.listRowRight}>{formatBRL(e.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title="Aprovações pendentes"
          subtitle="Aguardando decisão de um segundo usuário"
          actions={<Link href="/painel/financeiro/aprovacoes" className={styles.cardLink}>Ver todas</Link>}
        >
          {pendingApprovals.length === 0 ? (
            <p className={styles.emptyText}>Nenhuma aprovação pendente.</p>
          ) : (
            <ul className={styles.list}>
              {pendingApprovals.map((r) => (
                <li key={r.id} className={styles.listRow}>
                  <span className={styles.listRowIcon}><Icon name="shield" size={16} /></span>
                  <div className={styles.listRowInfo}>
                    <span className={styles.listRowTitle}>{r.label}</span>
                    <span className={styles.listRowSubtitle}>Risco {RISK_LEVEL_LABELS[r.riskLevel]} · {userName(r.requestedByUserId)}</span>
                  </div>
                  <Badge tone={RISK_LEVEL_TONE[r.riskLevel]}>{RISK_LEVEL_LABELS[r.riskLevel]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
        <Button href="/painel/financeiro/lancamentos/novo">
          <Icon name="chart" size={18} /> Novo lançamento
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
