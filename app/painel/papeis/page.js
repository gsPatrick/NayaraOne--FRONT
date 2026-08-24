"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import RowActions from "@/components/molecules/RowActions/RowActions";
import { listRoles, createRole, updateRole, deleteRole, listPermissionsCatalog } from "@/lib/api/roles";
import { groupPermissions, actionLabel, permissionActionKey } from "@/lib/rbac/permissionLabels";
import styles from "./page.module.css";

const EMPTY_FORM = { name: "", description: "", permissionIds: new Set() };

export default function PapeisPage() {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // null = criando
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function loadAll() {
    setLoading(true);
    setLoadError("");
    return Promise.all([listRoles(), listPermissionsCatalog()])
      .then(([apiRoles, apiCatalog]) => {
        setRoles(apiRoles);
        setCatalog(apiCatalog);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os papéis."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  const groupedCatalog = useMemo(() => groupPermissions(catalog), [catalog]);

  function openCreate() {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(role) {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || "",
      permissionIds: new Set((role.permissions || []).map((p) => p.id)),
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function togglePermission(id) {
    setForm((prev) => {
      const next = new Set(prev.permissionIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, permissionIds: next };
    });
  }

  function toggleGroup(groupPermissionsList, checked) {
    setForm((prev) => {
      const next = new Set(prev.permissionIds);
      for (const p of groupPermissionsList) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return { ...prev, permissionIds: next };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Dê um nome para o papel.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setActionError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        permissionIds: Array.from(form.permissionIds),
      };
      if (editingRole) {
        await updateRole(editingRole.id, payload);
      } else {
        await createRole(payload);
      }
      setFormOpen(false);
      await loadAll();
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar o papel.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
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
            onEdit={() => openEdit(role)}
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
        <Button onClick={openCreate}>
          <Icon name="plus" size={16} /> Novo papel
        </Button>
      </div>

      {loadError ? <Alert tone="danger" title="Não foi possível carregar os papéis">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <Table columns={columns} rows={roles} loading={loading} emptyMessage="Nenhum papel cadastrado ainda." />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingRole ? `Editar papel — ${editingRole.name}` : "Novo papel"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingRole ? "Salvar alterações" : "Criar papel"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {editingRole?.isSystem ? (
            <div className={styles.systemNote}>
              <Icon name="shield" size={14} />
              Este é um papel de sistema — nome e permissões não podem ser alterados.
            </div>
          ) : null}

          <div className={styles.formGrid}>
            <div className={styles.span2}>
              <FormField label="Nome do papel" htmlFor="role-name" required error={formErrors.name}>
                <Input
                  id="role-name"
                  value={form.name}
                  disabled={editingRole?.isSystem}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex.: Corretor, Gerente Financeiro, Jurídico..."
                />
              </FormField>
            </div>
            <div className={styles.span2}>
              <FormField label="Descrição" htmlFor="role-description" helper="Opcional — ajuda a equipe a entender para quem esse papel serve.">
                <Input
                  id="role-description"
                  value={form.description}
                  disabled={editingRole?.isSystem}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex.: Acesso a imóveis, CRM e radar, sem financeiro."
                />
              </FormField>
            </div>
          </div>

          <FormField label="Permissões por tela" htmlFor="role-permissions">
            <div className={styles.permissionsWrap} id="role-permissions">
              {groupedCatalog.map((group) => {
                const allChecked = group.permissions.every((p) => form.permissionIds.has(p.id));
                const someChecked = !allChecked && group.permissions.some((p) => form.permissionIds.has(p.id));
                return (
                  <div className={styles.permissionGroup} key={group.groupKey}>
                    <div className={styles.permissionGroupHeader}>
                      <span className={styles.permissionGroupTitle}>{group.label}</span>
                      <Checkbox
                        label={`Marcar todas (${group.permissions.length})`}
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked;
                        }}
                        disabled={editingRole?.isSystem}
                        onChange={(e) => toggleGroup(group.permissions, e.target.checked)}
                      />
                    </div>
                    <div className={styles.permissionList}>
                      {group.permissions.map((permission) => (
                        <Checkbox
                          key={permission.id}
                          label={actionLabel(permissionActionKey(permission.code))}
                          checked={form.permissionIds.has(permission.id)}
                          disabled={editingRole?.isSystem}
                          onChange={() => togglePermission(permission.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </FormField>
        </form>
      </Modal>

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
