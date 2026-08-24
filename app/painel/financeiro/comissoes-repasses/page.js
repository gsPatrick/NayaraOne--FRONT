"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import SwitchableChart from "@/components/molecules/SwitchableChart/SwitchableChart";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import {
  COMMISSIONS,
  COMMISSION_INSTALLMENTS,
  OWNER_REPASSES,
  BANK_ACCOUNTS,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_TONE,
  REPASSE_STATUS_LABELS,
  REPASSE_STATUS_TONE,
  isBankAccountEligibleForPayment,
  bankAccountCooldownRemainingHours,
} from "@/lib/mock/finance";
import { PEOPLE } from "@/lib/mock/people";
import { USERS } from "@/lib/mock/users";
import { formatBRL, formatDate } from "@/lib/format";
import { buildMonthlyChartData } from "@/lib/monthlyChartData";
import styles from "./page.module.css";

function userName(id) {
  return USERS.find((u) => u.id === id)?.name || "—";
}
function personOf(id) {
  return PEOPLE.find((p) => p.id === id) || null;
}

export default function ComissoesRepassesPage() {
  const [installments, setInstallments] = useState(COMMISSION_INSTALLMENTS);
  const [repasses, setRepasses] = useState(OWNER_REPASSES);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [page2, setPage2] = useState(1);
  const [pageSize2, setPageSize2] = useState(8);

  function showNotice(tone, title, message) {
    setNotice({ tone, title, message });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 6000);
  }

  function bankAccountOf(id) {
    return BANK_ACCOUNTS.find((a) => a.id === id) || null;
  }

  function handlePayInstallment(installment) {
    if (installment.status === "PAID") return;
    setInstallments((prev) => prev.map((i) => (i.id === installment.id ? { ...i, status: "PAID", paidAt: new Date().toISOString() } : i)));
    showNotice("success", "Parcela paga", `Parcela ${installment.installmentNumber} marcada como paga.`);
  }

  function handlePayRepasse(repasse) {
    if (repasse.status !== "PENDING") return;
    const account = bankAccountOf(repasse.bankAccountId);
    if (account && !isBankAccountEligibleForPayment(account)) {
      if (account.status === "BLOCKED") showNotice("danger", "Bloqueado (antifraude)", "A conta deste repasse está bloqueada.");
      else showNotice("warning", "Conta em resfriamento", `Faltam ${bankAccountCooldownRemainingHours(account)}h para esta conta ficar elegível.`);
      return;
    }
    setRepasses((prev) => prev.map((r) => (r.id === repasse.id ? { ...r, status: "PAID" } : r)));
    showNotice("success", "Repasse pago", `Repasse de ${formatBRL(repasse.netAmount)} pago ao proprietário.`);
  }

  const filteredCommissions = useMemo(() => {
    return COMMISSIONS.filter((c) => {
      if (query && !c.description.toLowerCase().includes(query.toLowerCase()) && !userName(c.beneficiaryUserId).toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [query, statusFilter]);

  const totalCommissions = COMMISSIONS.reduce((s, c) => s + Number(c.totalAmount), 0);
  const totalRepasses = repasses.reduce((s, r) => s + Number(r.netAmount), 0);
  const pendingInstallments = installments.filter((i) => i.status !== "PAID").length;
  const pendingRepasses = repasses.filter((r) => r.status === "PENDING").length;

  const installmentsByMonth = useMemo(
    () =>
      buildMonthlyChartData(installments, {
        getDate: (i) => i.dueAt,
        getValue: (i) => Number(i.amount),
        formatValue: formatBRL,
      }),
    [installments]
  );

  const byBeneficiary = useMemo(() => {
    const counts = {};
    COMMISSIONS.forEach((c) => {
      const name = userName(c.beneficiaryUserId);
      counts[name] = (counts[name] || 0) + Number(c.totalAmount);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value, displayValue: formatBRL(value) }));
  }, []);

  const repasseByStatus = useMemo(
    () => [
      { label: "Pendente", value: repasses.filter((r) => r.status === "PENDING").length, color: "var(--color-warning)" },
      { label: "Pago", value: repasses.filter((r) => r.status === "PAID").length, color: "var(--color-success)" },
    ].filter((i) => i.value > 0),
    [repasses]
  );

  const totalPages = Math.max(1, Math.ceil(filteredCommissions.length / pageSize));
  const pageItems = filteredCommissions.slice((page - 1) * pageSize, page * pageSize);

  const totalPages2 = Math.max(1, Math.ceil(repasses.length / pageSize2));
  const pageItems2 = repasses.slice((page2 - 1) * pageSize2, page2 * pageSize2);

  return (
    <AppShell title="Comissões & Repasses" backHref="/painel/financeiro">
      {notice ? <Alert tone={notice.tone} title={notice.title} className={styles.notice}>{notice.message}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Comissões (total)" value={formatBRL(totalCommissions)} tone="info" icon="chart" />
        <StatTile label="Repasses (total)" value={formatBRL(totalRepasses)} tone="info" icon="layers" />
        <StatTile label="Parcelas pendentes" value={pendingInstallments} tone={pendingInstallments > 0 ? "warning" : "success"} icon="calendar" />
        <StatTile label="Repasses pendentes" value={pendingRepasses} tone={pendingRepasses > 0 ? "warning" : "success"} icon="money" />
      </div>

      <Card title="Projeção de parcelas por mês" subtitle="Soma de parcelas de comissão por vencimento — troque o tipo de gráfico" className={styles.heroCard}>
        <SwitchableChart items={installmentsByMonth} defaultType="line" />
      </Card>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <Card
            title="Comissões"
            subtitle="Direito de comissão por corretor/oportunidade"
            actions={
              <div className={styles.toolbar}>
                <SearchInput placeholder="Buscar por corretor..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
                <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">Todos os status</option>
                  {Object.entries(COMMISSION_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>
            }
          >
            {filteredCommissions.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma comissão encontrada.</p>
            ) : (
              <ul className={styles.list}>
                {pageItems.map((c) => {
                  const its = installments.filter((i) => i.commissionId === c.id);
                  return (
                    <li key={c.id} className={styles.commissionBlock}>
                      <div className={styles.listRow}>
                        <Avatar name={userName(c.beneficiaryUserId)} size="sm" />
                        <div className={styles.listRowInfo}>
                          <span className={styles.listRowTitle}>{c.description}</span>
                          <span className={styles.listRowSubtitle}>{userName(c.beneficiaryUserId)} · {c.percentage}% sobre {formatBRL(c.baseAmount)}</span>
                        </div>
                        <div className={styles.listRowRight}>
                          <Badge tone={COMMISSION_STATUS_TONE[c.status]}>{COMMISSION_STATUS_LABELS[c.status]}</Badge>
                          <strong className={styles.commissionTotal}>{formatBRL(c.totalAmount)}</strong>
                        </div>
                      </div>
                      <div className={styles.installmentsList}>
                        {its.map((i) => (
                          <div key={i.id} className={styles.installmentRow}>
                            <span>Parcela {i.installmentNumber} — {formatBRL(i.amount)} — vence {formatDate(i.dueAt)}</span>
                            {i.status === "PAID" ? (
                              <Badge tone="success">Paga em {formatDate(i.paidAt)}</Badge>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => handlePayInstallment(i)}>Pagar</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className={styles.paginationRow}>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              <label className={styles.pageSizeLabel}>
                Por página
                <Select
                  className={styles.pageSizeSelect}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={8}>8</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Select>
              </label>
            </div>
          </Card>

          <Card title="Repasses a proprietários" subtitle="Líquido = bruto − deduções (sempre calculado, nunca editável)">
            <ul className={styles.list}>
              {pageItems2.map((r) => {
                const account = bankAccountOf(r.bankAccountId);
                const owner = personOf(r.ownerPersonId);
                return (
                  <li key={r.id} className={styles.listRow}>
                    <Avatar name={owner?.legalName || "—"} src={owner?.photoUrl} size="sm" />
                    <span className={styles.bankIconSlot}>
                      <BankLogo bankCode={account?.bankCode} size={28} square />
                    </span>
                    <div className={styles.listRowInfo}>
                      <span className={styles.listRowTitle}>{owner?.legalName || "—"}</span>
                      <span className={styles.listRowSubtitle}>
                        Ref. {r.referenceMonth} · Bruto {formatBRL(r.grossAmount)} − Deduções {formatBRL(r.deductionsAmount)} = <strong>{formatBRL(r.netAmount)}</strong>
                      </span>
                    </div>
                    <div className={styles.listRowRight}>
                      <Badge tone={REPASSE_STATUS_TONE[r.status]}>{REPASSE_STATUS_LABELS[r.status]}</Badge>
                      {r.status === "PENDING" ? (
                        <Button size="sm" variant="secondary" onClick={() => handlePayRepasse(r)} disabled={account && !isBankAccountEligibleForPayment(account)}>
                          Pagar
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className={styles.paginationRow}>
              <Pagination page={page2} totalPages={totalPages2} onChange={setPage2} />
              <label className={styles.pageSizeLabel}>
                Por página
                <Select
                  className={styles.pageSizeSelect}
                  value={pageSize2}
                  onChange={(e) => { setPageSize2(Number(e.target.value)); setPage2(1); }}
                >
                  <option value={8}>8</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Select>
              </label>
            </div>
          </Card>
        </div>

        <div className={styles.sidebar}>
          <Card title="Comissões por corretor" subtitle="Troque o tipo de gráfico">
            <SwitchableChart items={byBeneficiary} defaultType="column" />
          </Card>
          <Card title="Repasses por status" subtitle="Troque o tipo de gráfico">
            <SwitchableChart items={repasseByStatus} defaultType="donut" />
          </Card>
        </div>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
