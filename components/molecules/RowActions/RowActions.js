import Icon from "@/components/atoms/Icon/Icon";
import styles from "./RowActions.module.css";

export default function RowActions({ onView, onEdit, onDelete }) {
  return (
    <div className={styles.wrap} onClick={(e) => e.stopPropagation()}>
      {onView ? (
        <button type="button" className={styles.btn} title="Ver detalhes" aria-label="Ver detalhes" onClick={onView}>
          <Icon name="eye" size={16} />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className={styles.btn} title="Editar" aria-label="Editar" onClick={onEdit}>
          <Icon name="pencil" size={16} />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className={[styles.btn, styles.danger].join(" ")} title="Excluir" aria-label="Excluir" onClick={onDelete}>
          <Icon name="trash" size={16} />
        </button>
      ) : null}
    </div>
  );
}
