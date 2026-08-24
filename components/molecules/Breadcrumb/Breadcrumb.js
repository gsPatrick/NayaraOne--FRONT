import Icon from "@/components/atoms/Icon/Icon";
import styles from "./Breadcrumb.module.css";

export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className={styles.wrap}>
      <ol className={styles.list}>
        {items.map((item, i) => (
          <li key={item.label} className={styles.item}>
            {i > 0 ? <Icon name="chevronRight" size={14} className={styles.sep} /> : null}
            {i === items.length - 1 ? (
              <span className={styles.current} aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href || "#"} className={styles.link}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
