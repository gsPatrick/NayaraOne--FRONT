import styles from "./Pagination.module.css";

export default function Pagination({ page = 1, totalPages = 1, onChange = () => {} }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className={styles.wrap} aria-label="Paginação">
      <button className={styles.step} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <ul className={styles.pages}>
        {pages.map((p) => (
          <li key={p}>
            <button
              className={[styles.page, p === page ? styles.active : ""].filter(Boolean).join(" ")}
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
      <button className={styles.step} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Próxima
      </button>
    </nav>
  );
}
