import { forwardRef } from "react";
import styles from "./Input.module.css";

const Input = forwardRef(function Input({ error = false, className = "", ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={[styles.input, error ? styles.error : "", className].filter(Boolean).join(" ")}
      {...(error ? { "aria-invalid": true } : {})}
      {...rest}
    />
  );
});

export default Input;
