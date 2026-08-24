import Icon from "@/components/atoms/Icon/Icon";
import styles from "./Alert.module.css";

const ICONS = { info: "bell", success: "check", warning: "filter", danger: "close" };

export default function Alert({ tone = "info", title, children }) {
  return (
    <div className={[styles.alert, styles[tone]].join(" ")} role="alert">
      <Icon name={ICONS[tone] || "bell"} size={18} className={styles.icon} />
      <div>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <p className={styles.body}>{children}</p> : null}
      </div>
    </div>
  );
}
