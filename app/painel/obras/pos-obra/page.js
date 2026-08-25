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
import { MAINTENANCE_CASES, MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONE, PROJECTS } from "@/lib/mock/construction";
import { PROPERTIES } from "@/lib/mock/properties";
import { PEOPLE } from "@/lib/mock/people";
import { USERS } from "@/lib/mock/users";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function PosObraListaPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  function propertyOf(id) {
    return PROPERTIES.find((p) => p.id === id) || null;
  }
  function projectOf(id) {
    return id ? PROJECTS.find((p) => p.id === id) || null : null;
  }
  function personOf(id) {
    return id ? PEOPLE.find((p) => p.id === id) || null : null;
  }
  function userOf(id) {
    return id ? USERS.find((u) => u.id === id) || null : null;
  }

  const filtered = useMemo(() => {
    return MAINTENANCE_CASES.filter((c) => {
      if (query) {
        const haystack = `${c.description} ${propertyOf(c.propertyId)?.name || ""}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPage() {
    setPage(1);
  }

  const openCount = MAINTENANCE_CASES.filter((c) => c.status === "OPEN").length;
  const inProgressCount = MAINTENANCE_CASES.filter((c) => c.status === "IN_PROGRESS").length;
  const resolvedCount = MAINTENANCE_CASES.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;

  const columns = [
    {
      key: "description",
      label: "Descrição",
      width: "24%",
      render: (row) => <span className={styles.nameMain}>{row.description}</span>,
    },
    {
      key: "property",
      label: "Imóvel",
      width: "16%",
      render: (row) => propertyOf(row.propertyId)?.name || "—",
    },
    {
      key: "project",
      label: "Obra vinculada",
      width: "16%",
      render: (row) => projectOf(row.projectId)?.name || "—",
    },
    {
      key: "openedBy",
      label: "Aberto por",
      width: "14%",
      render: (row) => (row.openedByPersonId ? personOf(row.openedByPersonId)?.legalName || "—" : "Equipe interna"),
    },
    {
      key: "responsible",
      label: "Responsável",
      width: "12%",
      render: (row) => userOf(row.responsibleUserId)?.name || "—",
    },
    {
      key: "status",
      label: "Status",
      width: "10%",
      render: (row) => <Badge tone={MAINTENANCE_STATUS_TONE[row.status]}>{MAINTENANCE_STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: "warranty",
      label: "Prazo de garantia",
      width: "10%",
      render: (row) => formatDate(row.warrantyDeadlineAt),
    },
    {
      key: "actions",
      label: "",
      width: "6%",
      render: (row) => <RowActions onView={() => router.push(`/painel/obras/pos-obra/${row.id}`)} />,
    },
  ];

  return (
    <AppShell title="Pós-obra" backHref="/painel/obras">
      <div className={styles.grid}>
        <StatTile label="Total de chamados" value={MAINTENANCE_CASES.length} tone="neutral" icon="key" />
        <StatTile label="Abertos" value={openCount} tone={openCount > 0 ? "danger" : "success"} icon="bell" />
        <StatTile label="Em andamento" value={inProgressCount} tone="warning" icon="chart" />
        <StatTile label="Resolvidos/Fechados" value={resolvedCount} tone="success" icon="check" />
      </div>

      <Card title="Chamados de pós-obra" subtitle="Manutenções em garantia">
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Buscar por descrição ou imóvel..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
          />
          <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="">Todos os status</option>
            {Object.entries(MAINTENANCE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Table columns={columns} rows={pageItems} emptyMessage="Nenhum chamado encontrado." />
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
        <Button href="/painel/obras/pos-obra/novo">
          <Icon name="plus" size={18} /> Novo chamado
        </Button>
      </StickyActionBar>
    </AppShell>
  );
}
