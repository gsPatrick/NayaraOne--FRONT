import styles from "./Radio.module.css";

export default function Radio({ label, id, className = "", ...rest }) {
  return (
    <label className={[styles.wrap, className].filter(Boolean).join(" ")} htmlFor={id}>
      <input type="radio" id={id} className={styles.input} {...rest} />
      <span className={styles.dot} aria-hidden="true" />
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
}
