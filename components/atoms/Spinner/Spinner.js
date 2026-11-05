import styles from "./Spinner.module.css";

// `decorative`: quando o texto ao lado e a região viva do AsyncState já dizem "Carregando…" (M9-D851), o giro é só visual.
export default function Spinner({ size = "md", className = "", decorative = false }) {
  const cls = [styles.spinner, styles[size], className].filter(Boolean).join(" ");
  if (decorative) return <span className={cls} aria-hidden="true" />;
  return <span className={cls} aria-label="Carregando" role="status" />;
}
