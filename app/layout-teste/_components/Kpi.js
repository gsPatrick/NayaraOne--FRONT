import Icon from "./Icon";
import StatusChip from "./StatusChip";
import s from "./Kpi.module.css";

// delta: { text, good: true|false|null, dir: "up"|"down" }
export default function Kpi({ label, value, delta, source, fresh = "FRESCO", ageMin = 7, children, small }) {
  return (
    <div className={s.kpi}>
      <div className={s.label}>{label}</div>
      <div className={`${s.value} ${small ? s.small : ""}`}>{value}</div>
      {delta && (
        <div className={`${s.delta} ${delta.good === true ? s.good : delta.good === false ? s.bad : ""}`}>
          <Icon name={delta.dir === "down" ? "down" : "up"} size={12} strokeWidth={2} />
          {delta.text}
        </div>
      )}
      {children}
      {source && (
        <div className={s.foot}>
          <span>{source} · há {ageMin} min</span>
          <StatusChip tone={fresh === "FRESCO" ? "success" : "warning"} dot={false}>{fresh}</StatusChip>
        </div>
      )}
    </div>
  );
}
