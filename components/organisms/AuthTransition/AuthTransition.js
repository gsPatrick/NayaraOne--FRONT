import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import styles from "./AuthTransition.module.css";

export default function AuthTransition({ variant = "enter", label }) {
  return (
    <div className={[styles.overlay, styles[variant]].join(" ")} role="status" aria-live="polite">
      <span className={styles.mark}>
        <BrandMark size="lg" tone={variant === "enter" ? "light" : "dark"} shape="square" />
      </span>
      {label ? <p className={styles.label}>{label}</p> : null}
    </div>
  );
}
