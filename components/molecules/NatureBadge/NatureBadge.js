import Icon from "@/components/atoms/Icon/Icon";
import { ENTRY_NATURE_LABELS, ENTRY_NATURE_TONE, ENTRY_NATURE_ICON } from "@/lib/mock/finance";
import styles from "./NatureBadge.module.css";

export default function NatureBadge({ nature, size = 14 }) {
  return (
    <span className={[styles.badge, styles[ENTRY_NATURE_TONE[nature] || "neutral"]].join(" ")}>
      <Icon name={ENTRY_NATURE_ICON[nature] || "swapHorizontal"} size={size} />
      {ENTRY_NATURE_LABELS[nature] || nature}
    </span>
  );
}
