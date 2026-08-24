import { forwardRef } from "react";
import styles from "./Checkbox.module.css";

const Checkbox = forwardRef(function Checkbox({ label, id, className = "", ...rest }, ref) {
  return (
    <label className={[styles.wrap, className].filter(Boolean).join(" ")} htmlFor={id}>
      <input ref={ref} type="checkbox" id={id} className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden="true">
        <svg viewBox="0 0 16 16" className={styles.check}>
          <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
});

export default Checkbox;
