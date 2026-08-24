import styles from "./Input.module.css";

export default function Input({ error = false, className = "", ...rest }) {
  return (
    <input
      className={[styles.input, error ? styles.error : "", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
