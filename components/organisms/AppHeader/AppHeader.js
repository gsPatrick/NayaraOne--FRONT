"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/atoms/Icon/Icon";
import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import Tooltip from "@/components/atoms/Tooltip/Tooltip";
import UserMenu from "@/components/molecules/UserMenu/UserMenu";
import CompanySwitcher from "@/components/molecules/CompanySwitcher/CompanySwitcher";
import { useCompany } from "@/lib/context/CompanyContext";
import styles from "./AppHeader.module.css";

export default function AppHeader({ title, backHref, onOpenSearch }) {
  const [hidden, setHidden] = useState(false);
  const { user, role } = useCompany();

  useEffect(() => {
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      setHidden(y > lastY && y > 72);
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={[styles.header, hidden ? styles.hidden : ""].filter(Boolean).join(" ")}>
      <div className={styles.mobileBrand}>
        <BrandMark size="sm" tone="dark" shape="square" />
      </div>
      {backHref ? (
        <Tooltip label="Voltar" side="bottom">
          <Link href={backHref} className={styles.backBtn} aria-label="Voltar">
            <Icon name="chevronRight" size={18} className={styles.backIcon} />
          </Link>
        </Tooltip>
      ) : null}
      <h1 className={styles.title}>{title}</h1>
      <CompanySwitcher />
      <div className={styles.actions}>
        <Tooltip label="Buscar" side="bottom">
          <button type="button" className={styles.iconBtn} aria-label="Buscar" onClick={onOpenSearch}>
            <Icon name="search" size={18} />
          </button>
        </Tooltip>
        <Tooltip label="Notificações" side="bottom">
          <button type="button" className={styles.iconBtn} aria-label="Notificações">
            <Icon name="bell" size={18} />
          </button>
        </Tooltip>
        <UserMenu name={user?.name} role={role} />
      </div>
    </header>
  );
}
