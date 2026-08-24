import Icon from "@/components/atoms/Icon/Icon";
import styles from "./EmptyState.module.css";

export default function EmptyState({ icon = "document", title, description }) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>
        <Icon name={icon} size={24} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}
