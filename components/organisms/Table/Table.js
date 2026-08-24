import styles from "./Table.module.css";

export default function Table({ columns = [], rows = [], loading = false, emptyMessage = "Nenhum registro encontrado." }) {
  const hasWidths = columns.some((col) => col.width);

  return (
    <div className={styles.scroll}>
      <table className={[styles.table, hasWidths ? styles.fixed : ""].filter(Boolean).join(" ")}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <span className={styles.skeleton} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
