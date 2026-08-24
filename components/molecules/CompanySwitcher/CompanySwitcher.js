"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import { useCompany } from "@/lib/context/CompanyContext";
import styles from "./CompanySwitcher.module.css";

export default function CompanySwitcher() {
  const { company, memberships, switchCompany, hasMultipleCompanies, switching } = useCompany();
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

  if (!company) return null;

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => hasMultipleCompanies && setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Trocar de empresa"
        disabled={!hasMultipleCompanies || switching}
      >
        <span className={styles.iconWrap}>
          <Icon name="building" size={15} />
        </span>
        <span className={styles.companyName} key={company.id}>{company.name}</span>
        {hasMultipleCompanies ? <Icon name="chevronDown" size={14} className={styles.chevron} /> : null}
      </button>

      {open ? (
        <div className={styles.menu} role="menu">
          <span className={styles.menuLabel}>Trocar de empresa</span>
          <ul className={styles.list}>
            {memberships.map(({ company: c, role }) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={[styles.item, c.id === company.id ? styles.itemActive : ""].filter(Boolean).join(" ")}
                  role="menuitem"
                  onClick={() => {
                    switchCompany(c.id);
                    setOpen(false);
                  }}
                >
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{c.name}</span>
                    <span className={styles.itemRole}>{role}</span>
                  </span>
                  {c.id === company.id ? <Icon name="check" size={14} className={styles.itemCheck} /> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
