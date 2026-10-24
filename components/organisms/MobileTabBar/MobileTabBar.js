"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/atoms/Icon/Icon";
import { MOBILE_TABS, NAV_SECTIONS } from "@/app/painel/_nav";
import { hasPermission } from "@/lib/rbac/permissions";
import styles from "./MobileTabBar.module.css";

const PRIMARY_HREFS = new Set(MOBILE_TABS.filter((tab) => tab.label !== "Mais").map((tab) => tab.href));

function extraLinks() {
  const links = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.permission && !hasPermission(item.permission)) continue;
      if (item.children?.length) {
        for (const child of item.children) {
          if (child.permission && !hasPermission(child.permission)) continue;
          links.push({ label: `${item.label} · ${child.label}`, href: child.href });
        }
      } else if (!PRIMARY_HREFS.has(item.href)) {
        links.push({ label: item.label, href: item.href });
      }
    }
  }
  return links;
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const [tabs, setTabs] = useState(MOBILE_TABS);
  const [moreOpen, setMoreOpen] = useState(false);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    setTabs(MOBILE_TABS.filter((tab) => hasPermission(tab.permission)));
    setLinks(extraLinks());
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen ? (
        <div className={styles.sheet} role="dialog" aria-label="Outros módulos">
          {links.map((link) => (
            <Link key={link.href + link.label} href={link.href} className={styles.sheetLink}>
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
      <nav className={styles.bar} aria-label="Navegação principal">
        {tabs.map((tab) => {
          if (tab.label === "Mais") {
            return (
              <button
                key={tab.label}
                type="button"
                className={[styles.tab, moreOpen ? styles.active : ""].filter(Boolean).join(" ")}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <Icon name={tab.icon} size={22} className={styles.tabIcon} />
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            );
          }
          const active = pathname === tab.href || (tab.href !== "/painel" && pathname.startsWith(tab.href));
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
    </>
  );
}
