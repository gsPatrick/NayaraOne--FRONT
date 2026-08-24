import styles from "./Card.module.css";

export default function Card({ title, subtitle, actions, children, padded = true, className = "" }) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")}>
      {(title || actions) && (
        <div className={styles.header}>
          <div>
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      )}
      <div className={padded ? styles.body : undefined}>{children}</div>
    </div>
  );
}
