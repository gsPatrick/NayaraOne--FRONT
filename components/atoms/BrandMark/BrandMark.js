import Link from "next/link";
import styles from "./BrandMark.module.css";

function Frame({ shape }) {
  if (shape === "square") return <rect className={styles.frame} x="1.5" y="1.5" width="37" height="37" rx="10" />;
  if (shape === "circle") return <circle className={styles.frame} cx="20" cy="20" r="18.5" />;
  return null;
}

function HouseGlyph() {
  return (
    <g>
      <path className={styles.roof} d="M20 6 34.5 19.5H5.5Z" />
      <path className={styles.body} d="M9 19.5h22V32a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 9 32Z" />
      <path className={styles.door} d="M17 34.5v-7.8a3 3 0 0 1 6 0v7.8Z" />
    </g>
  );
}

export default function BrandMark({ size = "md", tone = "dark", shape = "none", href, title = "Nayara One", className = "" }) {
  const sizeClass = typeof size === "string" ? styles[`size-${size}`] : undefined;
  const style = typeof size === "number" ? { width: size, height: size } : undefined;

  const content = (
    <svg
      className={[styles.root, sizeClass, styles[`tone-${tone}`], styles[`shape-${shape}`], className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      viewBox="0 0 40 40"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      <Frame shape={shape} />
      <HouseGlyph />
    </svg>
  );

  if (href) {
    return (
      <Link href={href} aria-label={title} className={styles.link}>
        {content}
      </Link>
    );
  }

  return content;
}
