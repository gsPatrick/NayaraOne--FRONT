"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import LogoutButton from "@/components/molecules/LogoutButton/LogoutButton";
import styles from "./UserMenu.module.css";

const ITEMS = [
  { label: "Ver perfil", href: "/painel/perfil", icon: "users" },
  { label: "Configurações", href: "/painel/configuracoes", icon: "settings" },
];

export default function UserMenu({ name = "Renata Souza", role = "Gerente" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Menu do usuário"
      >
        <Avatar name={name} size="sm" />
        <Icon name="chevronDown" size={14} className={styles.chevron} />
      </button>

      {open ? (
        <div className={styles.menu} role="menu">
          <div className={styles.identity}>
            <Avatar name={name} size="md" />
            <div className={styles.identityText}>
              <span className={styles.identityName}>{name}</span>
              <span className={styles.identityRole}>{role}</span>
            </div>
          </div>

          <div className={styles.divider} />

          <ul className={styles.list}>
            {ITEMS.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className={styles.item} role="menuitem" onClick={() => setOpen(false)}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.divider} />

          <LogoutButton className={[styles.item, styles.logout].join(" ")} role="menuitem">
            <Icon name="logout" size={16} />
            Sair
          </LogoutButton>
        </div>
      ) : null}
    </div>
  );
}
