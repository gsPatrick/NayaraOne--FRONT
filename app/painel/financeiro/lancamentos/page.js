"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import StatTile from "@/components/molecules/StatTile/StatTile";
import ColumnChart from "@/components/molecules/ColumnChart/ColumnChart";
import PieChart from "@/components/molecules/PieChart/PieChart";
import Icon from "@/components/atoms/Icon/Icon";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import RowActions from "@/components/molecules/RowActions/RowActions";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Modal from "@/components/organisms/Modal/Modal";
import { PEOPLE } from "@/lib/mock/people";
import {
  FINANCIAL_ENTRIES,
  BANK_ACCOUNTS,
  COST_CENTERS,
  ENTRY_NATURE_LABELS,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONE,
  isEntryOverdue,
} from "@/lib/mock/finance";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function LancamentosPage() {
  const router = useRouter();
  const [entries, setEntries] = useState(FINANCIAL_ENTRIES);
  const [query, setQuery] = useState("");
  const [natureFilter, setNatureFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function bankAccountOf(id) {
    return BANK_ACCOUNTS.find((a) => a.id === id) || null;
  }

  function ownerOf(account) {
    if (!account?.ownerPersonId) return null;
    return PEOPLE.find((p) => p.id === account.ownerPersonId) || null;
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (query && !e.description.toLowerCase().includes(query.toLowerCase())) return false;
      if (natureFilter && e.nature !== natureFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      return true;
    });
  }, [entries, query, natureFilter, statusFilter]);

  function handleDelete() {
    setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPage() {
    setPage(1);
  }

  const totalPayable = entries.filter((e) => e.nature === "PAYABLE" && e.status === "PENDING").reduce((s, e) => s + Number(e.amount), 0);
  const totalReceivable = entries.filter((e) => e.nature === "RECEIVABLE" && e.status === "PENDING").reduce((s, e) => s + Number(e.amount), 0);
  const overdueCount = entries.filter(isEntryOverdue).length;
  const settledCount = entries.filter((e) => e.status === "SETTLED").length;
  const overdueEntries = entries.filter(isEntryOverdue);

  const byStatus = useMemo(() => {
    const counts = {};
    entries.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + Number(e.amount); });
    return Object.entries(counts).map(([status, value]) => ({ label: ENTRY_STATUS_LABELS[status] || status, value, displayValue: formatBRL(value) }));
  }, [entries]);

  const byCostCenter = useMemo(() => {
    const counts = {};
    entries.forEach((e) => {
      const cc = COST_CENTERS.find((c) => c.id === e.costCenterId);
      const key = cc ? cc.name : "Sem centro";
      counts[key] = (counts[key] || 0) + Number(e.amount);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value, displayValue: formatBRL(value) }));
  }, [entries]);

  const columns = [
    {
      key: "description",
      label: "Lançamento",
      width: "32%",
      render: (row) => {
        const account = bankAccountOf(row.bankAccountId);
        const owner = ownerOf(account);
        return (
          <div className={styles.descCell}>
            <span className={styles.iconStack}>
              <BankLogo bankCode={account?.bankCode} size={30} square />
            </span>
            {owner ? <Avatar name={owner.legalName} src={owner.photoUrl} size="sm" className={styles.ownerAvatar} /> : null}
            <div className={styles.nameCell}>
              <span className={styles.nameMain} title={row.description}>{row.description}</span>
              <span className={styles.nameSub}>{account?.label || "—"}</span>
            </div>
          </div>
        );
      },
    },
    { key: "nature", label: "Natureza", width: "14%", render: (row) => <NatureBadge nature={row.nature} /> },
    { key: "amount", label: "Valor", width: "11%", render: (row) => formatBRL(row.amount) },
    { key: "dueAt", label: "Vencimento", width: "13%", render: (row) => (row.dueAt ? formatDate(row.dueAt) : "—") },
    {
      key: "status",
      label: "Status",
      width: "18%",
      render: (row) => (
        <div className={styles.statusCell}>
          <Badge tone={ENTRY_STATUS_TONE[row.status]}>{ENTRY_STATUS_LABELS[row.status]}</Badge>
          {isEntryOverdue(row) ? <Badge tone="danger">Vencida</Badge> : null}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/financeiro/lancamentos/${row.id}`)}
          onEdit={() => router.push(`/painel/financeiro/lancamentos/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Lançamentos" backHref="/painel/financeiro">
      <div className={styles.grid}>
        <StatTile label="A pagar (pendente)" value={formatBRL(totalPayable)} tone="warning" icon="document" />
        <StatTile label="A receber (pendente)" value={formatBRL(totalReceivable)} tone="info" icon="money" />
        <StatTile label="Vencidas" value={overdueCount} tone={overdueCount > 0 ? "danger" : "success"} icon="calendar" />
        <StatTile label="Liquidadas" value={settledCount} tone="success" icon="check" />
      </div>

      <div className={styles.layout}>
        <Card
          title="Contas a pagar e receber"
          subtitle="Ledger — cada correção gera um lançamento de estorno, nunca edita o original (imutabilidade)"
          className={styles.tableCard}
        >
          <div className={styles.toolbar}>
            <SearchInput
              placeholder="Buscar por descrição..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            />
            <Select className={styles.filter} value={natureFilter} onChange={(e) => { setNatureFilter(e.target.value); resetPage(); }}>
              <option value="">Todas as naturezas</option>
              {Object.entries(ENTRY_NATURE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
              <option value="">Todos os status</option>
              {Object.entries(ENTRY_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <Table columns={columns} rows={pageItems} emptyMessage="Nenhum lançamento encontrado." />
          <div className={styles.paginationRow}>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            <label className={styles.pageSizeLabel}>
              Por página
              <Select
                className={styles.pageSizeSelect}
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
              >
                <option value={8}>8</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Select>
            </label>
          </div>
        </Card>

        <div className={styles.sidebar}>
          <Card title="Por status" subtitle="Distribuição em colunas">
            <ColumnChart items={byStatus} />
          </Card>
          <Card title="Por centro de custo" subtitle="Distribuição em pizza">
            <PieChart items={byCostCenter} donut={false} />
          </Card>
          <Card title="Vencidas" subtitle={`${overdueEntries.length} lançamento(s) com vencimento no passado`}>
            {overdueEntries.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma conta vencida.</p>
            ) : (
              <ul className={styles.sideList}>
                {overdueEntries.map((e) => (
                  <li key={e.id} className={styles.sideListRow}>
                    <Icon name="document" size={14} />
                    <span className={styles.sideListLabel}>{e.description}</span>
                    <strong className={styles.sideListValue}>{formatBRL(e.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <StickyActionBar>
        <FinanceNavMenu />
        <Button href="/painel/financeiro/lancamentos/novo">
          <Icon name="document" size={18} /> Novo lançamento
        </Button>
      </StickyActionBar>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir lançamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir <strong>{deleteTarget?.description}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
