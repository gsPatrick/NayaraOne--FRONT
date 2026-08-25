"use client";

import { useEffect, useMemo, useState } from "react";
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
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Pagination from "@/components/molecules/Pagination/Pagination";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import { MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_TONE } from "@/lib/mock/construction";
import { listMaintenanceCases, removeMaintenanceCase, listProjects } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function PosObraListaPage() {
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listMaintenanceCases(), listProperties(), listProjects(), listPeople(), apiFetch("/users")])
      .then(([c, props, proj, pp, u]) => {
        if (cancelled) return;
        setCases(c || []);
        setProperties(props || []);
        setProjects(proj || []);
        setPeople(pp || []);
        setUsers(u || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os chamados.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      await removeMaintenanceCase(deleteTarget.id);
      setCases((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir o chamado.");
    } finally {
      setDeleting(false);
    }
  }

  function propertyOf(id) {
    return properties.find((p) => p.id === id) || null;
  }
  function projectOf(id) {
    return id ? projects.find((p) => p.id === id) || null : null;
  }
  function personOf(id) {
    return id ? people.find((p) => p.id === id) || null : null;
  }
  function userOf(id) {
    return id ? users.find((u) => u.id === id) || null : null;
  }

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (query) {
        const haystack = `${c.description} ${propertyOf(c.propertyId)?.name || ""}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [cases, properties, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPage() {
    setPage(1);
  }

  const openCount = cases.filter((c) => c.status === "OPEN").length;
  const inProgressCount = cases.filter((c) => c.status === "IN_PROGRESS").length;
  const resolvedCount = cases.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;

  const columns = [
    {
      key: "description",
      label: "Descrição",
      width: "19%",
      render: (row) => <span className={styles.nameMain}>{row.description}</span>,
    },
    {
      key: "property",
      label: "Imóvel",
      width: "13%",
      render: (row) => propertyOf(row.propertyId)?.name || "—",
    },
    {
      key: "project",
      label: "Obra vinculada",
      width: "13%",
      render: (row) => projectOf(row.projectId)?.name || "—",
    },
    {
      key: "openedBy",
      label: "Aberto por",
      width: "11%",
      render: (row) => (row.openedByPersonId ? personOf(row.openedByPersonId)?.legalName || "—" : "Equipe interna"),
    },
    {
      key: "responsible",
      label: "Responsável",
      width: "11%",
      render: (row) => userOf(row.responsibleUserId)?.name || "—",
    },
    {
      key: "status",
      label: "Status",
      width: "13%",
      render: (row) => <Badge tone={MAINTENANCE_STATUS_TONE[row.status]}>{MAINTENANCE_STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: "warranty",
      label: "Prazo de garantia",
      width: "9%",
      render: (row) => formatDate(row.warrantyDeadlineAt),
    },
    {
      key: "actions",
      label: "",
      width: "11%",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/obras/pos-obra/${row.id}`)}
          onEdit={() => router.push(`/painel/obras/pos-obra/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Pós-obra" backHref="/painel/obras">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os chamados">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Total de chamados" value={cases.length} tone="neutral" icon="key" />
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
        <Table columns={columns} rows={loading ? [] : pageItems} loading={loading} emptyMessage="Nenhum chamado encontrado." />
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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir chamado"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir o chamado <strong>{deleteTarget?.description}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
