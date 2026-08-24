"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import { listRoles, deleteRole } from "@/lib/api/roles";
import styles from "./page.module.css";

export default function PapeisPage() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function loadRoles() {
    setLoading(true);
    setLoadError("");
    return listRoles()
      .then(setRoles)
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os papéis."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRoles();
  }, []);

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await loadRoles();
    } catch (err) {
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
          {roles.length} papel(éis) cadastrado(s) — marque as permissões de cada tela/ação por papel.
        </span>
        <Button href="/painel/papeis/novo">
          <Icon name="plus" size={16} /> Novo papel
        </Button>
      </div>

      {loadError ? <Alert tone="danger" title="Não foi possível carregar os papéis">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Table columns={columns} rows={roles} loading={loading} emptyMessage="Nenhum papel cadastrado ainda." />

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
    </AppShell>
  );
}
