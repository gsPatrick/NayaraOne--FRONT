import styles from "./Spinner.module.css";

export default function Spinner({ size = "md", className = "" }) {
  return <span className={[styles.spinner, styles[size], className].filter(Boolean).join(" ")} aria-label="Carregando" role="status" />;
}
