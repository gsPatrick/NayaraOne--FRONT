import styles from "./Table.module.css";

export default function Table({ columns = [], rows = [], loading = false, emptyMessage = "Nenhum registro encontrado.", minWidth }) {
  const hasWidths = columns.some((col) => col.width);

  return (
    <div className={styles.scroll}>
      <table
        className={[styles.table, hasWidths ? styles.fixed : ""].filter(Boolean).join(" ")}
        style={minWidth ? { minWidth } : undefined}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.sticky ? styles.stickyRight : undefined}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
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
                {columns.map((col) => {
                  const conteudo = col.render ? col.render(row) : row[col.key];
                  const vazio = conteudo === null || conteudo === undefined || conteudo === "" || conteudo === false;
                  // Célula nunca fica em branco: diz o que falta (colunas de ação: não há ação possível).
                  const textoVazio = col.emptyText || (col.label ? `Sem ${String(col.label).toLowerCase()}` : "Sem ações disponíveis");
                  return (
                    <td key={col.key} className={col.sticky ? styles.stickyRight : undefined}>
                      {vazio ? textoVazio : conteudo}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
