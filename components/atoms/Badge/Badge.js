import styles from "./Badge.module.css";

export default function Badge({ tone = "neutral", onMedia = false, children, className = "" }) {
  return (
    <span className={[styles.badge, styles[tone], onMedia ? styles.onMedia : "", className].filter(Boolean).join(" ")}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
