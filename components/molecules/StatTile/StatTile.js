import Icon from "@/components/atoms/Icon/Icon";
import styles from "./StatTile.module.css";

export default function StatTile({ label, value, delta, tone = "neutral", icon }) {
  const isLong = typeof value === "string" && value.length > 8;
  return (
    <div className={styles.tile}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon ? <Icon name={icon} size={18} className={styles.icon} /> : null}
      </div>
      <p className={[styles.value, isLong ? styles.valueLong : ""].filter(Boolean).join(" ")}>{value}</p>
      {delta ? <span className={[styles.delta, styles[tone]].join(" ")}>{delta}</span> : null}
    </div>
  );
}
