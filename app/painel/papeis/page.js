"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import MfaSetupRequiredNotice from "@/components/molecules/MfaSetupRequiredNotice/MfaSetupRequiredNotice";
import { listRoles, deleteRole } from "@/lib/api/roles";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import styles from "./page.module.css";

export default function PapeisPage() {
  const router = useRouter();
  // M9-D850: o estado da lista (carregando, vazio, sem acesso, sem conexão, tentar de novo) vem do padrão único.
  const rolesQuery = useAsyncState(() => listRoles(), { key: "papeis" });
  const roles = rolesQuery.data || [];
  const [actionError, setActionError] = useState("");

  // M9-D851: depois de excluir, o botão da linha some e o foco cairia no <body>; o aviso de sucesso (role=status) recebe o foco e é lido.
  const [deletedName, setDeletedName] = useState("");
  const deletedRef = useRef(null);
  useEffect(() => { if (deletedName && deletedRef.current) deletedRef.current.focus(); }, [deletedName]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [mfaRetryOpen, setMfaRetryOpen] = useState(false);
  const [mfaSetupNeeded, setMfaSetupNeeded] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    setDeletedName("");
    setMfaSetupNeeded(false);
    try {
      const removedName = deleteTarget.name;
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await rolesQuery.reload();
      setDeletedName(removedName);
    } catch (err) {
      if (err?.code === "MFA_STEP_UP_REQUIRED") {
        setMfaRetryOpen(true);
        return;
      }
      if (err?.code === "MFA_REQUIRED_NOT_ENABLED") {
        setMfaSetupNeeded(true);
        return;
      }
      setActionError(err?.message || "Não foi possível excluir o papel.");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    {
      key: "name",
      label: "Papel",
      render: (role) => (
        <div className={styles.nameCell}>
          <span className={styles.roleName}>
            {role.name}
            {role.isSystem ? <Badge tone="neutral">Sistema</Badge> : null}
          </span>
          {role.description ? <span className={styles.roleDescription}>{role.description}</span> : null}
        </div>
      ),
    },
    {
      key: "permissions",
      label: "Permissões",
      render: (role) => <Badge tone="info">{role.permissions?.length || 0}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (role) => (
        <div className={styles.actionsCell}>
          <RowActions
            onEdit={() => router.push(`/painel/papeis/${role.id}`)}
            onDelete={role.isSystem ? undefined : () => setDeleteTarget(role)}
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Papéis & Permissões">
      <div className={styles.toolbar}>
        <span className={styles.toolbarInfo}>
          {rolesQuery.data ? `${roles.length} papel(éis) cadastrado(s) — ` : ""}marque as permissões de cada tela/ação por papel.
        </span>
        <Button href="/painel/papeis/novo">
          <Icon name="plus" size={16} /> Novo papel
        </Button>
      </div>

      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
      {deletedName ? <div role="status" tabIndex={-1} ref={deletedRef}><Alert tone="success">{`O papel ${deletedName} foi excluído.`}</Alert></div> : null}
      {mfaSetupNeeded ? <MfaSetupRequiredNotice /> : null}

      <AsyncState
        result={rolesQuery}
        emptyTitle="Nenhum papel cadastrado ainda"
        emptyDescription="Crie um papel para definir o que cada pessoa pode ver e fazer."
        emptyAction={{ label: "Novo papel", href: "/painel/papeis/novo" }}
      >
        {() => <Table columns={columns} rows={roles} />}
      </AsyncState>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir papel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir papel</Button>
          </>
        }
      >
        <p>
          Tem certeza que deseja excluir o papel <strong>{deleteTarget?.name}</strong>? Se houver algum
          usuário ativo com esse papel, a exclusão será bloqueada até o vínculo ser revogado ou reatribuído.
        </p>
      </Modal>

      <MfaVerifyModal
        open={mfaRetryOpen}
        onClose={() => setMfaRetryOpen(false)}
        actionLabel="excluir este papel"
        onVerified={async () => {
          setMfaRetryOpen(false);
          await handleDelete();
        }}
      />
    </AppShell>
  );
}
