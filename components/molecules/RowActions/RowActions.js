"use client";

import { useHasPermission } from "@/lib/rbac/useHasPermission";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./RowActions.module.css";

// editRequires/deleteRequires (R8): permissão exigida para editar/excluir; sem ela o botão some.
export default function RowActions({ onView, onEdit, onDelete, editRequires, deleteRequires }) {
  const canEdit = useHasPermission(editRequires);
  const canDelete = useHasPermission(deleteRequires);
  return (
    <div className={styles.wrap} onClick={(e) => e.stopPropagation()}>
      {onView ? (
        <button type="button" className={styles.btn} title="Ver detalhes" aria-label="Ver detalhes" onClick={onView}>
          <Icon name="eye" size={16} />
        </button>
      ) : null}
      {onEdit && canEdit ? (
        <button type="button" className={styles.btn} title="Editar" aria-label="Editar" onClick={onEdit}>
          <Icon name="pencil" size={16} />
        </button>
      ) : null}
      {onDelete && canDelete ? (
        <button type="button" className={[styles.btn, styles.danger].join(" ")} title="Excluir" aria-label="Excluir" onClick={onDelete}>
          <Icon name="trash" size={16} />
        </button>
      ) : null}
    </div>
  );
}
