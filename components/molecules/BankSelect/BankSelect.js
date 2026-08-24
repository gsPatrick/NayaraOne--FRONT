"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BANKS } from "@/lib/mock/banks";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./BankSelect.module.css";

export default function BankSelect({ value, onChange, placeholder = "Buscar banco por nome ou código..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selected = BANKS.find((b) => b.code === value) || null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BANKS;
    return BANKS.filter((b) => b.name.toLowerCase().includes(q) || b.code.includes(q));
  }, [query]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(bank) {
    onChange(bank.code);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        {selected ? (
          <span className={styles.selectedRow}>
            <BankLogo bankCode={selected.code} size={22} />
            <span className={styles.selectedText}>{selected.name}</span>
          </span>
        ) : (
          <span className={styles.placeholder}>Selecione o banco...</span>
        )}
        <Icon name="chevronDown" size={16} className={styles.chevron} />
      </button>

      {open ? (
        <div className={styles.panel}>
          <div className={styles.searchRow}>
            <Icon name="search" size={14} />
            <input
              autoFocus
              className={styles.searchInput}
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className={styles.list}>
            {results.length === 0 ? (
              <li className={styles.empty}>Nenhum banco encontrado.</li>
            ) : (
              results.map((bank) => (
                <li key={bank.code}>
                  <button type="button" className={styles.option} onClick={() => pick(bank)}>
                    <BankLogo bankCode={bank.code} size={24} />
                    <span className={styles.optionText}>
                      <span className={styles.optionName}>{bank.name}</span>
                      <span className={styles.optionCode}>{bank.code}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
