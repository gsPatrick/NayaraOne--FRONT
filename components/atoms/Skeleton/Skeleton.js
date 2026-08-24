import styles from "./Skeleton.module.css";

// Bloco-base do "modelo fantasma" — usado sozinho ou compondo os padrões de
// components/molecules/SkeletonPatterns (linha de tabela, card, coluna de kanban etc).
export default function Skeleton({ width = "100%", height = "1em", circle = false, radius, className = "", style = {} }) {
  return (
    <span
      className={[styles.skeleton, circle ? styles.circle : "", className].filter(Boolean).join(" ")}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
