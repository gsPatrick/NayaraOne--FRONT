"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/atoms/Icon/Icon";
import { MOBILE_TABS } from "@/app/painel/_nav";
import { hasPermission } from "@/lib/rbac/permissions";
import styles from "./MobileTabBar.module.css";

export default function MobileTabBar() {
  const pathname = usePathname();
  const [tabs, setTabs] = useState(MOBILE_TABS);

  useEffect(() => {
    setTabs(MOBILE_TABS.filter((tab) => hasPermission(tab.permission)));
  }, []);

  return (
    <nav className={styles.bar} aria-label="Navegação principal">
      {tabs.map((tab) => {
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
