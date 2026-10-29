"use client";
import s from "./Tabs.module.css";

export default function Tabs({ tabs, active, onChange, label = "Seções do caso" }) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          className={`${s.tab} ${active === t.id ? s.on : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && <span className={s.count}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
