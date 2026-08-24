import styles from "./Tooltip.module.css";

// Tooltip minimalista, só CSS (hover/focus) — sem JS, sem delay de portal.
// side: "top" (padrão), "right", "bottom", "left"
export default function Tooltip({ label, side = "top", children, className = "", style }) {
  if (!label) return children;

  return (
    <span className={[styles.wrap, className].filter(Boolean).join(" ")} style={style}>
      {children}
      <span className={[styles.bubble, styles[side]].join(" ")} role="tooltip">
        {label}
      </span>
    </span>
  );
}
