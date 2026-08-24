import styles from "./Select.module.css";

export default function Select({ error = false, className = "", children, ...rest }) {
  return (
    <div className={[styles.wrap, error ? styles.error : "", className].filter(Boolean).join(" ")}>
      <select className={styles.select} {...rest}>
        {children}
      </select>
      <svg className={styles.chevron} viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
