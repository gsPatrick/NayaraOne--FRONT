"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./FinanceNavMenu.module.css";

const ITEMS = [
  { label: "Visão geral", href: "/painel/financeiro", icon: "money" },
  { label: "Lançamentos", href: "/painel/financeiro/lancamentos", icon: "document" },
  { label: "Contas bancárias", href: "/painel/financeiro/contas-bancarias", icon: "money" },
  { label: "Conciliação", href: "/painel/financeiro/conciliacao", icon: "check" },
  { label: "Aprovações", href: "/painel/financeiro/aprovacoes", icon: "shield" },
  { label: "Comissões & Repasses", href: "/painel/financeiro/comissoes-repasses", icon: "layers" },
];

export default function FinanceNavMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = ITEMS.find((i) => i.href === pathname) || ITEMS[0];

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        <Icon name="panelLeft" size={16} />
        <span className={styles.triggerLabel}>{current.label}</span>
        <Icon name="chevronDown" size={14} className={[styles.chevron, open ? styles.chevronOpen : ""].filter(Boolean).join(" ")} />
      </button>

      {open ? (
        <div className={styles.panel}>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[styles.option, item.href === pathname ? styles.optionActive : ""].filter(Boolean).join(" ")}
              onClick={() => setOpen(false)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
