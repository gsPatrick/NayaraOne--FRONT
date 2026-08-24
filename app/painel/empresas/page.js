"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import Select from "@/components/atoms/Select/Select";
import { COMPANY_STATUS_LABELS } from "@/lib/mock/companies";
import { apiFetch } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

// A API real não devolve as unidades dentro de GET /companies (Company não tem esse campo —
// ver NayaraOne--API/src/features/companies/companies.service.js). Unidades vêm de GET /units
// (NayaraOne--API/src/features/units/units.service.js), agrupadas por companyId aqui pra manter
// a coluna "Unidades" que a tela já tinha.
// Observação: o serializador da API devolve created_at/updated_at em snake_case (mesmo com os
// demais campos em camelCase) — normalizamos aqui pra manter a coluna "Cadastro" funcionando.
function attachUnits(companies, units) {
  return companies.map((c) => ({
    ...c,
    createdAt: c.createdAt || c.created_at,
    units: units.filter((u) => u.companyId === c.id),
  }));
}

export default function EmpresasPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([apiFetch("/companies"), apiFetch("/units")])
      .then(([apiCompanies, apiUnits]) => {
        if (cancelled) return;
        setCompanies(attachUnits(apiCompanies || [], apiUnits || []));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar as empresas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleDelete() {
    setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const totalPages = Math.max(1, Math.ceil(companies.length / pageSize));
  const pageItems = companies.slice((page - 1) * pageSize, page * pageSize);

  const columns = [
    {
      key: "name",
      label: "Empresa",
      render: (row) => (
        <div
          role="button"
          tabIndex={0}
          className={styles.nameCell}
          onClick={() => router.push(`/painel/empresas/${row.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/painel/empresas/${row.id}`);
            }
          }}
        >
          <span className={styles.companyIcon}>
            <Icon name="layers" size={16} />
          </span>
          <div>
            <p className={styles.companyName}>{row.name}</p>
            <p className={styles.companyLegalName}>{row.legalName}</p>
          </div>
        </div>
      ),
    },
    { key: "taxId", label: "CNPJ" },
    {
      key: "units",
      label: "Unidades",
      render: (row) => `${row.units.length} unidade${row.units.length === 1 ? "" : "s"}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={row.status === "ACTIVE" ? "success" : "neutral"}>{COMPANY_STATUS_LABELS[row.status] || row.status}</Badge>,
    },
    {
      key: "createdAt",
      label: "Cadastro",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/empresas/${row.id}`)}
          onEdit={() => router.push(`/painel/empresas/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Empresas & Unidades">
      <div className={styles.toolbar}>
        <span className={styles.toolbarInfo}>
          {companies.length} empresas · {companies.reduce((sum, c) => sum + c.units.length, 0)} unidades
        </span>
        <Button href="/painel/empresas/novo">
          <Icon name="plus" size={16} /> Nova empresa
        </Button>
      </div>

      {loadError ? (
        <Alert tone="danger" title="Não foi possível carregar as empresas">{loadError}</Alert>
      ) : null}

      {loading ? (
        <div className={styles.toolbar}>
          <Spinner size="lg" />
        </div>
      ) : (
        <Table columns={columns} rows={pageItems} emptyMessage="Nenhuma empresa cadastrada." />
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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir empresa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
