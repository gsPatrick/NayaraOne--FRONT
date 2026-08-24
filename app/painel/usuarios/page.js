"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { USERS, ROLES, ROLE_TONE } from "@/lib/mock/users";
import { COMPANIES } from "@/lib/mock/companies";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_TONE = { Ativo: "success", Suspenso: "danger" };

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState(USERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

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
        <Button onClick={() => setInviteOpen(true)}>
          <Icon name="plus" size={16} /> Convidar usuário
        </Button>
      </div>

      <Table columns={columns} rows={pageItems} emptyMessage="Nenhum usuário cadastrado." />
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

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

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

function InviteUserModal({ open, onClose }) {
  const [companyId, setCompanyId] = useState(COMPANIES[0]?.id || "");
  const company = COMPANIES.find((c) => c.id === companyId) || COMPANIES[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convidar usuário"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={onClose}>Enviar convite</Button>
        </>
      }
    >
      <Alert tone="info" title="Acesso provisionado pelo administrador">
        Não existe autocadastro no Nayara One. Ao convidar, o usuário recebe um e-mail com um link
        de ativação vinculado à empresa, unidade (opcional) e papel definidos abaixo.
      </Alert>
      <div className={styles.formGrid}>
        <FormField label="Nome completo" htmlFor="u-name" required>
          <Input id="u-name" placeholder="Nome do colaborador" />
        </FormField>
        <FormField label="E-mail corporativo" htmlFor="u-email" required>
          <Input id="u-email" type="email" placeholder="nome@nayaraimoveis.com.br" />
        </FormField>
        <FormField label="Empresa" htmlFor="u-company" required>
          <Select id="u-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {COMPANIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Unidade" htmlFor="u-unit" helper="Opcional — deixe em branco para acesso a toda a empresa.">
          <Select id="u-unit" defaultValue="">
            <option value="">Sem unidade específica</option>
            {(company?.units || []).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </FormField>
        <div className={styles.span2}>
          <FormField label="Papel" htmlFor="u-role" required>
            <Select id="u-role" defaultValue={ROLES[2]}>
              {ROLES.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>
    </Modal>
  );
}
