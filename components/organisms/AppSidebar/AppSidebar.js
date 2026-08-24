"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import Icon from "@/components/atoms/Icon/Icon";
import Tooltip from "@/components/atoms/Tooltip/Tooltip";
import { NAV_SECTIONS } from "@/app/painel/_nav";
import styles from "./AppSidebar.module.css";

export default function AppSidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [openMenus, setOpenMenus] = useState(() =>
    new Set(
      NAV_SECTIONS.flatMap((section) => section.items)
        .filter((item) => item.children?.some((child) => pathname === child.href.split("?")[0]) || pathname === item.href)
        .map((item) => item.label)
    )
  );

  useEffect(() => setMounted(true), []);
  useEffect(() => setHoveredItem(null), [collapsed]);

  function toggleMenu(label) {
    setOpenMenus((prev) => (prev.has(label) ? new Set() : new Set([label])));
  }

  function showItemTooltip(event, label) {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredItem({ label, top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  function hideItemTooltip() {
    setHoveredItem(null);
  }

  return (
    <aside className={[styles.sidebar, collapsed ? styles.collapsed : ""].filter(Boolean).join(" ")}>
      <div className={styles.brandRow}>
        <Link href="/painel" className={styles.brandLink} aria-label="Nayara One">
          <BrandMark size="md" tone="dark" />
          {!collapsed ? <span className={styles.brandWord}>Nayara One</span> : null}
        </Link>
      </div>

      {mounted
        ? createPortal(
            <Tooltip
              label={collapsed ? "Expandir menu" : "Recolher menu"}
              side="right"
              className={styles.toggleTooltip}
              style={{ left: collapsed ? "63px" : "247px" }}
            >
              <button
                type="button"
                className={styles.toggle}
                onClick={onToggle}
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                <Icon name="chevronRight" size={14} className={collapsed ? undefined : styles.toggleIconFlipped} />
              </button>
            </Tooltip>,
            document.body
          )
        : null}

      {mounted && collapsed && hoveredItem
        ? createPortal(
            <span
              className={styles.floatingTooltip}
              style={{ top: hoveredItem.top, left: hoveredItem.left }}
              role="tooltip"
            >
              {hoveredItem.label}
            </span>,
            document.body
          )
        : null}

      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className={styles.section}>
            {!collapsed ? <span className={styles.sectionLabel}>{section.label}</span> : null}
            <ul className={styles.list}>
              {section.items.map((item) => {
                const hasChildren = Boolean(item.children?.length);
                const active = pathname === item.href || (hasChildren && item.children.some((c) => pathname === c.href.split("?")[0]));
                const menuOpen = openMenus.has(item.label);

                if (hasChildren && !collapsed) {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        className={[styles.item, styles.itemButton, active ? styles.active : ""].filter(Boolean).join(" ")}
                        onClick={() => toggleMenu(item.label)}
                        aria-expanded={menuOpen}
                      >
                        <Icon name={item.icon} size={18} className={styles.itemIcon} />
                        <span className={styles.itemLabel}>{item.label}</span>
                        <Icon name="chevronRight" size={14} className={[styles.chevron, menuOpen ? styles.chevronOpen : ""].filter(Boolean).join(" ")} />
                      </button>
                      {menuOpen ? (
                        <ul className={styles.subList}>
                          {item.children.map((child) => (
                            <li key={child.label}>
                              <Link href={child.href} className={[styles.subItem, pathname === child.href.split("?")[0] ? styles.active : ""].filter(Boolean).join(" ")}>
                                <span className={styles.itemLabel}>{child.label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={[styles.item, active ? styles.active : "", item.soon ? styles.soon : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={collapsed ? (e) => showItemTooltip(e, item.label) : undefined}
                      onMouseLeave={collapsed ? hideItemTooltip : undefined}
                      onFocus={collapsed ? (e) => showItemTooltip(e, item.label) : undefined}
                      onBlur={collapsed ? hideItemTooltip : undefined}
                    >
                      <Icon name={item.icon} size={18} className={styles.itemIcon} />
                      {!collapsed ? <span className={styles.itemLabel}>{item.label}</span> : null}
                      {!collapsed && item.soon ? <span className={styles.badge}>em breve</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
