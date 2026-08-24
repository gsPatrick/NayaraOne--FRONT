"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Badge from "@/components/atoms/Badge/Badge";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import Select from "@/components/atoms/Select/Select";
import { RADARS } from "@/lib/mock/radars";
import { PEOPLE } from "@/lib/mock/people";
import { PROPERTIES } from "@/lib/mock/properties";
import { matchRadarToProperties, PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import { formatBRL } from "@/lib/format";
import styles from "./page.module.css";

export default function RadarPage() {
  const router = useRouter();
  const [radars, setRadars] = useState(RADARS);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const rows = useMemo(
    () =>
      radars.map((radar) => ({
        radar,
        person: PEOPLE.find((p) => p.id === radar.personId),
        matches: matchRadarToProperties(radar, PROPERTIES),
      })),
    [radars]
  );

  const tableRows = rows.map((r) => ({ ...r, id: r.radar.id }));
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const pageItems = tableRows.slice((page - 1) * pageSize, page * pageSize);

  function handleDelete() {
    setRadars((prev) => prev.filter((r) => r.id !== deleteTarget.radar.id));
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "person",
      label: "Contato",
      render: (row) => (
        <div
          role="button"
          tabIndex={0}
          className={styles.personCell}
          onClick={() => router.push(`/painel/radar/${row.radar.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/painel/radar/${row.radar.id}`);
            }
          }}
        >
          <Avatar name={row.person?.legalName || "—"} size="sm" />
          <div>
            <p className={styles.personName}>{row.person?.legalName || "Contato removido"}</p>
            <p className={styles.personDoc}>{row.person?.taxIdNormalized || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo · Finalidade",
      render: (row) => (
        <div className={styles.tagRow}>
          <Badge tone="neutral">{PROPERTY_TYPE_LABELS[row.radar.criteriaJson.propertyType] || "—"}</Badge>
          <Badge tone="neutral">{OFFER_TYPE_LABELS[row.radar.criteriaJson.offerType] || "—"}</Badge>
        </div>
      ),
    },
    {
      key: "price",
      label: "Faixa de preço",
      render: (row) => {
        const c = row.radar.criteriaJson;
        return (
          <span className={styles.priceRange}>
            {c.minPrice != null ? formatBRL(c.minPrice) : "—"} – {c.maxPrice != null ? formatBRL(c.maxPrice) : "—"}
          </span>
        );
      },
    },
    {
      key: "location",
      label: "Localização",
      render: (row) => {
        const c = row.radar.criteriaJson;
        return [c.city, c.state].filter(Boolean).join(" — ") || "Qualquer";
      },
    },
    {
      key: "matches",
      label: "Matches",
      render: (row) => (
        <span className={styles.matchCount}>
          <Icon name="radar" size={12} />
          {row.matches.length}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={row.radar.status === "ACTIVE" ? "success" : "neutral"}>{row.radar.status === "ACTIVE" ? "Ativo" : row.radar.status}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/radar/${row.radar.id}`)}
          onEdit={() => router.push(`/painel/radar/${row.radar.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Radar">
      <div className={styles.toolbar}>
        <span className={styles.toolbarInfo}>{radars.length} perfis de busca ativos</span>
        <Button href="/painel/radar/novo">
          <Icon name="plus" size={16} /> Novo radar
        </Button>
      </div>

      <Table columns={columns} rows={pageItems} emptyMessage="Nenhum radar cadastrado." />
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
        title="Excluir radar"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir este radar de <strong>{deleteTarget?.person?.legalName || "contato removido"}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
