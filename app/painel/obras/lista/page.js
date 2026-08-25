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
import Icon from "@/components/atoms/Icon/Icon";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Pagination from "@/components/molecules/Pagination/Pagination";
import RowActions from "@/components/molecules/RowActions/RowActions";
import { PROJECTS, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE } from "@/lib/mock/construction";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function ObrasListaPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  function propertyOf(id) {
    return PROPERTIES.find((p) => p.id === id) || null;
  }
  function userOf(id) {
    return USERS.find((u) => u.id === id) || null;
  }

  const filtered = useMemo(() => {
    return PROJECTS.filter((p) => {
      if (query) {
        const haystack = `${p.name} ${propertyOf(p.propertyId)?.name || ""}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      if (statusFilter && p.status !== statusFilter) return false;
      return true;
    });
  }, [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPage() {
    setPage(1);
  }

  const inProgressCount = PROJECTS.filter((p) => p.status === "IN_PROGRESS").length;
  const completedCount = PROJECTS.filter((p) => p.status === "COMPLETED").length;
  const totalBudget = PROJECTS.reduce((s, p) => s + Number(p.budgetAmount || 0), 0);

  const columns = [
    {
      key: "name",
      label: "Nome",
      width: "22%",
      render: (row) => <span className={styles.nameMain}>{row.name}</span>,
    },
    {
      key: "property",
      label: "Imóvel vinculado",
      width: "18%",
      render: (row) => propertyOf(row.propertyId)?.name || "—",
    },
    {
      key: "responsible",
      label: "Responsável",
      width: "16%",
      render: (row) => userOf(row.responsibleUserId)?.name || "—",
    },
    {
      key: "status",
      label: "Status",
      width: "14%",
      render: (row) => <Badge tone={PROJECT_STATUS_TONE[row.status]}>{PROJECT_STATUS_LABELS[row.status]}</Badge>,
    },
    { key: "budgetAmount", label: "Orçamento", width: "12%", render: (row) => formatBRL(row.budgetAmount) },
    {
      key: "dates",
      label: "Início / Previsão",
      width: "12%",
      render: (row) => `${formatDate(row.startsAt)} — ${formatDate(row.endsAtPlanned)}`,
    },
    {
      key: "actions",
      label: "",
      width: "6%",
      render: (row) => <RowActions onView={() => router.push(`/painel/obras/lista/${row.id}`)} />,
    },
  ];

  return (
    <AppShell title="Obras" backHref="/painel/obras">
      <div className={styles.grid}>
        <StatTile label="Total de obras" value={PROJECTS.length} tone="neutral" icon="building" />
        <StatTile label="Em andamento" value={inProgressCount} tone="info" icon="chart" />
        <StatTile label="Concluídas" value={completedCount} tone="success" icon="check" />
        <StatTile label="Orçamento total" value={formatBRL(totalBudget)} tone="neutral" icon="money" />
      </div>

      <Card title="Obras" subtitle="Lista de obras cadastradas">
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Buscar por nome ou imóvel..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
          />
          <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="">Todos os status</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Table
          columns={columns}
          rows={pageItems}
          emptyMessage="Nenhuma obra encontrada."
        />
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

      <StickyActionBar>
        <Button href="/painel/obras/lista/novo">
          <Icon name="plus" size={18} /> Nova obra
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
