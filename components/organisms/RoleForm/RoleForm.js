"use client";

import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Icon from "@/components/atoms/Icon/Icon";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import { groupPermissions, actionLabel, permissionActionKey } from "@/lib/rbac/permissionLabels";
import styles from "./RoleForm.module.css";

// Formulário de papel (RBAC) reaproveitado por /painel/papeis/novo e /painel/papeis/[id] —
// tela cheia (não modal), pra caber confortavelmente as permissões de todos os módulos.
export default function RoleForm({ mode, role, catalog, onSubmit, onCancel, submitError }) {
  const isSystem = Boolean(role?.isSystem);
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [permissionIds, setPermissionIds] = useState(
    () => new Set((role?.permissions || []).map((p) => p.id))
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const groupedCatalog = groupPermissions(catalog);

  // "Ver" é a permissão base de cada módulo — sem ela, nenhuma das outras (criar/editar/
  // apagar/ações especiais) faz sentido nem pode ficar marcada. Desmarcar "Ver" desmarca o
  // resto do grupo junto; as outras só ficam clicáveis com "Ver" já marcada.
  function togglePermission(id, group) {
    const readPermission = group.permissions.find((p) => permissionActionKey(p.code) === "read");
    setPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (readPermission && id === readPermission.id) {
          for (const p of group.permissions) next.delete(p.id);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleGroup(groupPermissionsList, checked) {
    setPermissionIds((prev) => {
      const next = new Set(prev);
      for (const p of groupPermissionsList) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Dê um nome para o papel.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Higiene final: nenhuma permissão de criar/editar/apagar/etc. sobrevive sem o "Ver" do
    // mesmo grupo marcado, mesmo que o papel carregado (edição) já viesse assim de antes.
    const cleaned = new Set(permissionIds);
    for (const group of groupedCatalog) {
      const readPermission = group.permissions.find((p) => permissionActionKey(p.code) === "read");
      if (readPermission && !cleaned.has(readPermission.id)) {
        for (const p of group.permissions) cleaned.delete(p.id);
      }
    }

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        permissionIds: Array.from(cleaned),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {isSystem ? (
        <div className={styles.systemNote}>
          <Icon name="shield" size={14} />
          Este é um papel de sistema — nome e permissões não podem ser alterados.
        </div>
      ) : null}

      {submitError ? <Alert tone="danger" title="Não foi possível salvar o papel">{submitError}</Alert> : null}

      <Card title="Dados do papel" className={styles.card}>
        <div className={styles.formGrid}>
          <div className={styles.span2}>
            <FormField label="Nome do papel" htmlFor="role-name" required error={errors.name}>
              <Input
                id="role-name"
                value={name}
                disabled={isSystem}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Corretor, Gerente Financeiro, Jurídico..."
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField
              label="Descrição"
              htmlFor="role-description"
              helper="Opcional — ajuda a equipe a entender para quem esse papel serve."
            >
              <Input
                id="role-description"
                value={description}
                disabled={isSystem}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Acesso a imóveis, CRM e radar, sem financeiro."
              />
            </FormField>
          </div>
        </div>
      </Card>

      <Card title="Permissões por tela" className={styles.card}>
        <div className={styles.permissionsWrap}>
          {groupedCatalog.map((group) => {
            const allChecked = group.permissions.every((p) => permissionIds.has(p.id));
            const someChecked = !allChecked && group.permissions.some((p) => permissionIds.has(p.id));
            const readPermission = group.permissions.find((p) => permissionActionKey(p.code) === "read");
            const otherPermissions = group.permissions.filter((p) => p !== readPermission);
            const readChecked = readPermission ? permissionIds.has(readPermission.id) : true;

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
                    disabled={isSystem}
                    onChange={(e) => toggleGroup(group.permissions, e.target.checked)}
                  />
                </div>
                <div className={styles.permissionBody}>
                  {readPermission ? (
                    <Checkbox
                      className={styles.readCheckbox}
                      label={actionLabel(permissionActionKey(readPermission.code))}
                      checked={permissionIds.has(readPermission.id)}
                      disabled={isSystem}
                      onChange={() => togglePermission(readPermission.id, group)}
                    />
                  ) : null}
                  <div className={styles.permissionList}>
                    {otherPermissions.map((permission) => (
                      <Checkbox
                        key={permission.id}
                        label={actionLabel(permissionActionKey(permission.code))}
                        checked={permissionIds.has(permission.id)}
                        disabled={isSystem || !readChecked}
                        onChange={() => togglePermission(permission.id, group)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        {!isSystem ? (
          <Button type="submit" loading={saving}>
            {mode === "edit" ? "Salvar alterações" : "Criar papel"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
