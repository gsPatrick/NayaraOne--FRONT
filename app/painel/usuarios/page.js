"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { ROLE_TONE } from "@/lib/mock/users";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_TONE = { Ativo: "success", Suspenso: "danger" };

// A API real não devolve "Ativo"/"Suspenso" — devolve status.status = "ACTIVE" (ver
// NayaraOne--API/src/models/User.js). Mapeamos aqui pra manter os badges já existentes na tela.
function toDisplayStatus(apiStatus) {
  return apiStatus === "ACTIVE" ? "Ativo" : "Suspenso";
}

// GET /users não devolve os vínculos (empresa/unidade/papel) do usuário — isso vem de
// GET /memberships (ver NayaraOne--API/src/features/memberships/membership.service.js,
// que inclui role/unit/company). Junta os dois pra manter a coluna existente na tabela.
function buildMemberships(userId, memberships) {
  return memberships
    .filter((m) => m.userId === userId)
    .map((m) => ({
      company: m.company?.name || "—",
      role: m.role?.name || "Sem papel",
      unit: m.unit?.name || null,
    }));
}

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([apiFetch("/users"), apiFetch("/memberships")])
      .then(([apiUsers, apiMemberships]) => {
        if (cancelled) return;
        const mapped = (apiUsers || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          status: toDisplayStatus(u.status),
          lastAccessAt: u.lastLoginAt,
          memberships: buildMemberships(u.id, apiMemberships || []),
        }));
        setUsers(mapped);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os usuários.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const pageItems = users.slice((page - 1) * pageSize, page * pageSize);

  function toggleStatus(userId) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: u.status === "Ativo" ? "Suspenso" : "Ativo" } : u))
    );
  }

  function handleDelete() {
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "name",
      label: "Usuário",
      render: (row) => (
        <div
          role="button"
          tabIndex={0}
          className={styles.rowButton}
          onClick={() => router.push(`/painel/usuarios/${row.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/painel/usuarios/${row.id}`);
            }
          }}
        >
          <div className={styles.userCell}>
            <Avatar name={row.name} size="sm" />
            <div className={styles.userText}>
              <span className={styles.userName}>{row.name}</span>
              <span className={styles.userEmail}>{row.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "memberships",
      label: "Empresa, unidade & papel",
      render: (row) => (
        <div className={styles.membershipCell}>
          {row.memberships.map((m) => (
            <div key={m.company} className={styles.membershipRow}>
              <span className={styles.membershipText}>
                <span className={styles.membershipCompany}>{m.company}</span>
                <span className={styles.membershipUnit}>{m.unit || "Sem unidade — acesso a toda a empresa"}</span>
              </span>
              <Badge tone={ROLE_TONE[m.role] || "neutral"}>{m.role}</Badge>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
    },
    {
      key: "lastAccessAt",
      label: "Último acesso",
      render: (row) => formatDateTime(row.lastAccessAt),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className={styles.actionsCell}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(row.id);
            }}
            aria-label={row.status === "Ativo" ? "Suspender acesso" : "Reativar acesso"}
            title={row.status === "Ativo" ? "Suspender acesso" : "Reativar acesso"}
          >
            <Icon name={row.status === "Ativo" ? "ban" : "check"} size={16} />
          </button>
          <RowActions
            onView={() => router.push(`/painel/usuarios/${row.id}`)}
            onEdit={() => router.push(`/painel/usuarios/${row.id}`)}
            onDelete={() => setDeleteTarget(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Usuários & Acessos">
      <div className={styles.toolbar}>
        <span className={styles.toolbarInfo}>{users.length} usuários com acesso ao Nayara One</span>
        <Button href="/painel/usuarios/novo">
          <Icon name="plus" size={16} /> Convidar usuário
        </Button>
      </div>

      {loadError ? (
        <Alert tone="danger" title="Não foi possível carregar os usuários">{loadError}</Alert>
      ) : null}

      <Table columns={columns} rows={loading ? [] : pageItems} loading={loading} emptyMessage="Nenhum usuário cadastrado." />
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
        title="Excluir usuário"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir o acesso de <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}
