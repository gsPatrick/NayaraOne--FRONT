"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/atoms/Icon/Icon";
import { MOBILE_TABS } from "@/app/painel/_nav";
import styles from "./MobileTabBar.module.css";

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.bar} aria-label="Navegação principal">
      {MOBILE_TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={[styles.tab, active ? styles.active : ""].filter(Boolean).join(" ")}
          >
            <Icon name={tab.icon} size={22} className={styles.tabIcon} />
            <span className={styles.tabLabel}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
