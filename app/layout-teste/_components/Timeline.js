import s from "./Timeline.module.css";

export default function Timeline({ items }) {
  return (
    <ol className={s.list}>
      {items.map((e, i) => (
        <li key={i} className={`${s.item} ${s[e.tone || "neutral"]}`}>
          <span className={s.dot} aria-hidden="true" />
          <div className={s.body}>
            <div className={s.title}>{e.title}</div>
            <div className={s.meta}>{e.when} · {e.who}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
