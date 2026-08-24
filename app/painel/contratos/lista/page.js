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
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import Pagination from "@/components/molecules/Pagination/Pagination";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import { listProperties } from "@/lib/api/properties";
import { listContracts } from "@/lib/api/legal";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatBRL } from "@/lib/format";
import styles from "./page.module.css";

export default function ContratosListaPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listProperties()])
      .then(([contractsRes, propertiesRes]) => {
        if (cancelled) return;
        setContracts(contractsRes || []);
        setProperties(propertiesRes || []);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar contratos."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function propertyOf(id) {
    return properties.find((p) => p.id === id) || null;
  }

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const property = propertyOf(c.propertyId);
      if (query) {
        const haystack = `${c.contractNumber} ${property?.name || ""}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      if (typeFilter && c.contractType !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [contracts, properties, query, typeFilter, statusFilter]);

  function handleDelete() {
    // Não há endpoint de exclusão de contrato na API — cancelamento é feito via transitionContract.
    setActionError("Contratos não podem ser excluídos — use a transição de status para CANCELLED na página de detalhe.");
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPage() {
    setPage(1);
  }

  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const signingCount = contracts.filter((c) => c.status === "SIGNING").length;
  const totalValue = contracts.reduce((s, c) => s + Number(c.totalValue || 0), 0);

  const columns = [
    {
      key: "contractNumber",
      label: "Contrato",
      width: "26%",
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.nameMain}>{row.contractNumber}</span>
          <span className={styles.nameSub}>{propertyOf(row.propertyId)?.name || "Sem imóvel vinculado"}</span>
        </div>
      ),
    },
    {
      key: "contractType",
      label: "Tipo",
      width: "16%",
      render: (row) => <Badge tone={CONTRACT_TYPE_TONE[row.contractType]}>{CONTRACT_TYPE_LABELS[row.contractType]}</Badge>,
    },
    { key: "totalValue", label: "Valor", width: "16%", render: (row) => formatBRL(row.totalValue) },
    {
      key: "status",
      label: "Status",
      width: "22%",
      render: (row) => (
        <div className={styles.statusCell}>
          <Badge tone={CONTRACT_STATUS_TONE[row.status]}>{CONTRACT_STATUS_LABELS[row.status]}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "12%",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/contratos/lista/${row.id}`)}
          onEdit={() => router.push(`/painel/contratos/lista/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Contratos" backHref="/painel/contratos">
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Total de contratos" value={contracts.length} tone="neutral" icon="signature" />
        <StatTile label="Ativos" value={activeCount} tone="success" icon="check" />
        <StatTile label="Em assinatura" value={signingCount} tone="info" icon="pencil" />
        <StatTile label="Valor total" value={formatBRL(totalValue)} tone="neutral" icon="money" />
      </div>

      <Card title="Contratos" subtitle="Lista de contratos de venda, locação e prestação de serviço">
        <div className={styles.toolbar}>
          <SearchInput
            placeholder="Buscar por número ou imóvel..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
          />
          <Select className={styles.filter} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetPage(); }}>
            <option value="">Todos os tipos</option>
            {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}>
            <option value="">Todos os status</option>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Table columns={columns} rows={loading ? [] : pageItems} loading={loading} emptyMessage="Nenhum contrato encontrado." />
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
        <ContractsNavMenu />
        <Button href="/painel/contratos/lista/novo">
          <Icon name="signature" size={18} /> Novo contrato
        </Button>
      </StickyActionBar>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir contrato"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir o contrato <strong>{deleteTarget?.contractNumber}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
