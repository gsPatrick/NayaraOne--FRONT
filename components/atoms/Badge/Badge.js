import styles from "./Badge.module.css";

export default function Badge({ tone = "neutral", onMedia = false, children, className = "" }) {
  return (
    <span className={[styles.badge, styles[tone], onMedia ? styles.onMedia : "", className].filter(Boolean).join(" ")}>
      <span className={styles.dot} aria-hidden="true" />
      {/* Rede de segurança (achado pelo cliente, 05/10/2026): quando o container é estreito
          demais pro texto (ex.: coluna de tabela pequena), corta com reticências em vez de
          cortar abruptamente no meio da palavra — `title` repõe o texto completo no hover. */}
      <span className={styles.label} title={typeof children === "string" ? children : undefined}>
        {children}
      </span>
    </span>
  );
}
