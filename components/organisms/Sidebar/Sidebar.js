"use client";

import { useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./Sidebar.module.css";

const SECTIONS = [
  {
    label: "Operação",
    items: [
      { label: "Painel", icon: "home", active: true },
      { label: "Imóveis", icon: "building" },
      { label: "Clientes", icon: "users" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Relatórios", icon: "chart" },
      { label: "Contratos", icon: "document" },
      { label: "Configurações", icon: "settings" },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(() => SECTIONS.map(() => true));

  return (
    <aside className={[styles.sidebar, collapsed ? styles.collapsed : ""].filter(Boolean).join(" ")}>
      <button className={styles.toggle} onClick={() => setCollapsed((v) => !v)} aria-label="Recolher menu">
        <Icon name="chevronRight" size={16} className={collapsed ? undefined : styles.flipped} />
      </button>
      {SECTIONS.map((section, i) => (
        <div key={section.label} className={styles.section}>
          <button
            className={styles.sectionHeader}
            onClick={() => setOpen((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
          >
            {!collapsed ? <span>{section.label}</span> : null}
          </button>
          {open[i] ? (
            <ul className={styles.list}>
              {section.items.map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    className={[styles.item, item.active ? styles.active : ""].filter(Boolean).join(" ")}
                  >
                    <Icon name={item.icon} size={18} />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </aside>
  );
}
