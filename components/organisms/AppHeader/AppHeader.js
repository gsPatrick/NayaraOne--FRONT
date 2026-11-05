"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/atoms/Icon/Icon";
import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import Tooltip from "@/components/atoms/Tooltip/Tooltip";
import UserMenu from "@/components/molecules/UserMenu/UserMenu";
import CompanySwitcher from "@/components/molecules/CompanySwitcher/CompanySwitcher";
import { useCompany } from "@/lib/context/CompanyContext";
import styles from "./AppHeader.module.css";

// Marca que a página já foi aberta uma vez: AppShell remonta a cada tela, então a 1ª montagem é a abertura da página (sem mexer no foco) e as seguintes são navegação.
let pageOpened = false;

export default function AppHeader({ title, backHref, onOpenSearch }) {
  const [hidden, setHidden] = useState(false);
  const { user, role } = useCompany();

  // M9-D851 (WCAG 2.4.2 e 2.4.3): cada tela tem o seu título na aba ("Papéis & Permissões — Nayara One") e, ao navegar para ela, o foco vai ao título da
  // tela (h1) para o leitor de tela anunciar onde a pessoa chegou, em vez de ficar no <body> ou num link que sumiu.
  const titleRef = useRef(null);
  useEffect(() => {
    if (typeof title === "string" && title.trim()) document.title = `${title.trim()} — Nayara One`;
  }, [title]);
  // Só na montagem (chegada à tela), nunca quando o título muda por dados que chegam depois: o foco não pode sair do campo onde a pessoa está.
  useEffect(() => {
    if (pageOpened && titleRef.current) titleRef.current.focus({ preventScroll: true });
    pageOpened = true;
  }, []);

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
      <h1 className={styles.title} tabIndex={-1} ref={titleRef}>{title}</h1>
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
