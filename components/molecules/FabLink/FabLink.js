import Link from "next/link";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./FabLink.module.css";

export default function FabLink({ href, icon = "plus", label }) {
  return (
    <Link href={href} className={styles.fab} aria-label={label}>
      <Icon name={icon} size={22} />
    </Link>
  );
}
