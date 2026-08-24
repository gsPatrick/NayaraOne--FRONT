import Link from "next/link";
import styles from "./Button.module.css";

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  href,
  className = "",
  children,
  ...rest
}) {
  const classes = [styles.btn, styles[variant], styles[size], loading ? styles.loading : "", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled || loading} {...rest}>
        <span className={styles.label}>{children}</span>
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
