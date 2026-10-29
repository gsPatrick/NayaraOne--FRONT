import s from "./StatusChip.module.css";

// tom: neutral | info | warning | success | danger | brand
export default function StatusChip({ tone = "neutral", children, dot = true }) {
  return (
    <span className={`${s.chip} ${s[tone]}`}>
      {dot && <span className={s.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
