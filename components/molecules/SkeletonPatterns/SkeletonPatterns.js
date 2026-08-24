import Skeleton from "@/components/atoms/Skeleton/Skeleton";
import styles from "./SkeletonPatterns.module.css";

// Padrões prontos de "modelo fantasma" — cada tela usa o que combina com o layout real
// dela (grade de cards, kanban, ficha de detalhe, lista) em vez do Spinner genérico.

export function SkeletonCardGrid({ count = 8 }) {
  return (
    <div className={styles.cardGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div className={styles.card} key={i}>
          <Skeleton height="120px" radius="var(--radius-md)" />
          <Skeleton height="16px" width="70%" />
          <Skeleton height="13px" width="45%" />
          <Skeleton height="13px" width="55%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonKanban({ columns = 4, cardsPerColumn = 2 }) {
  return (
    <div className={styles.kanban}>
      {Array.from({ length: columns }).map((_, c) => (
        <div className={styles.kanbanColumn} key={c}>
          <Skeleton height="14px" width="60%" />
          {Array.from({ length: cardsPerColumn }).map((_, i) => (
            <div className={styles.kanbanCard} key={i}>
              <Skeleton height="14px" width="80%" />
              <Skeleton height="12px" width="55%" />
              <Skeleton height="30px" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetail({ sections = 3 }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailTop}>
        <Skeleton height="24px" width="240px" />
        <Skeleton height="34px" width="120px" radius="var(--radius-md)" />
      </div>
      {Array.from({ length: sections }).map((_, i) => (
        <div className={styles.detailSection} key={i}>
          <Skeleton height="15px" width="30%" />
          <Skeleton height="13px" width="90%" />
          <Skeleton height="13px" width="80%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <div className={styles.listRow} key={i}>
          <Skeleton circle width="36px" height="36px" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton height="13px" width="50%" />
            <Skeleton height="11px" width="30%" />
          </div>
        </div>
      ))}
    </div>
  );
}
