import styles from "./StickyActionBar.module.css";

export default function StickyActionBar({ children }) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
