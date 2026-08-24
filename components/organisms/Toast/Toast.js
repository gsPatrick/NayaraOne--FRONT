import Icon from "@/components/atoms/Icon/Icon";
import styles from "./Toast.module.css";

const ICONS = { info: "bell", success: "check", warning: "filter", danger: "close" };

export default function Toast({ tone = "success", title, description, onClose }) {
  return (
    <div className={[styles.toast, styles[tone]].join(" ")} role="status">
      <Icon name={ICONS[tone] || "bell"} size={18} className={styles.icon} />
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        {description ? <p className={styles.desc}>{description}</p> : null}
      </div>
      {onClose ? (
        <button className={styles.close} onClick={onClose} aria-label="Fechar notificação">
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </div>
  );
}
