import styles from "./Divider.module.css";

export default function Divider({ orientation = "horizontal", className = "" }) {
  return <span className={[styles.divider, styles[orientation], className].filter(Boolean).join(" ")} role="separator" />;
}
