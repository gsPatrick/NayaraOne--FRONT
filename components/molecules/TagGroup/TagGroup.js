import styles from "./TagGroup.module.css";

export function Tag({ children, onRemove }) {
  return (
    <span className={styles.tag}>
      {children}
      {onRemove ? (
        <button className={styles.remove} onClick={onRemove} aria-label={`Remover ${children}`}>
          ×
        </button>
      ) : null}
    </span>
  );
}

export default function TagGroup({ tags = [], onRemove }) {
  return (
    <div className={styles.group}>
      {tags.map((tag) => (
        <Tag key={tag} onRemove={onRemove ? () => onRemove(tag) : undefined}>
          {tag}
        </Tag>
      ))}
    </div>
  );
}
