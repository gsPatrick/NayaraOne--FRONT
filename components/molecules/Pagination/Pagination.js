import styles from "./Pagination.module.css";

function buildPageWindow(page, totalPages) {
  const delta = 1;
  const range = [];
  const withDots = [];
  let last;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (last !== undefined) {
      if (i - last === 2) {
        withDots.push(last + 1);
      } else if (i - last > 2) {
        withDots.push("...");
      }
    }
    withDots.push(i);
    last = i;
  }

  return withDots;
}

export default function Pagination({
  page = 1,
  totalPages = 1,
  onChange = () => {},
  pageSize,
  pageSizeOptions = [5, 10, 15, 20, 25],
  onPageSizeChange,
}) {
  const items = buildPageWindow(page, totalPages);
  const showPageSize = pageSize !== undefined && typeof onPageSizeChange === "function";

  return (
    <nav className={styles.wrap} aria-label="Paginação">
      <button className={styles.step} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <ul className={styles.pages}>
        {items.map((p, idx) =>
          p === "..." ? (
            <li key={`dots-${idx}`} className={styles.dots} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                className={[styles.page, p === page ? styles.active : ""].filter(Boolean).join(" ")}
                onClick={() => onChange(p)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ul>
      <button className={styles.step} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Próxima
      </button>
      {showPageSize && (
        <label className={styles.pageSize}>
          Itens por página:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}
