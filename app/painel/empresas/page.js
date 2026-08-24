"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import Select from "@/components/atoms/Select/Select";
import { COMPANIES, COMPANY_STATUS_LABELS } from "@/lib/mock/companies";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

export default function EmpresasPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState(COMPANIES);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

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

      <Table columns={columns} rows={pageItems} emptyMessage="Nenhuma empresa cadastrada." />
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
