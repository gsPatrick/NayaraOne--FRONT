import styles from "./FormField.module.css";

export default function FormField({ label, htmlFor, helper, error, required, children }) {
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
          {required ? <span className={styles.required}> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : helper ? (
        <span className={styles.helper}>{helper}</span>
      ) : null}
    </div>
  );
}
