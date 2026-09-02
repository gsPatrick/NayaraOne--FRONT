"use client";

// Seletor de conta bancária com a logo do banco — <select><option> nativo não consegue exibir
// imagem dentro das opções (limitação do HTML), por isso é um dropdown próprio, no mesmo
// padrão do BankSelect (usado pra escolher o banco na hora de cadastrar a conta).

import { useEffect, useMemo, useRef, useState } from "react";
import BankLogo from "@/components/atoms/BankLogo/BankLogo";
import Icon from "@/components/atoms/Icon/Icon";
import { bankAccountLabel } from "@/lib/finance/labels";
import styles from "./BankAccountSelect.module.css";

export default function BankAccountSelect({
  accounts = [],
  value,
  onChange,
  placeholder = "Selecione a conta bancária...",
  ownerNameOf,
  allowEmpty = false,
  emptyLabel = "Nenhuma",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selected = accounts.find((a) => a.id === value) || null;

  const labelOf = (account) => bankAccountLabel(account, ownerNameOf ? ownerNameOf(account.ownerPersonId) : undefined);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => labelOf(a).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, accounts]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(account) {
    onChange(account ? account.id : "");
    setQuery("");
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        {selected ? (
          <span className={styles.selectedRow}>
            <BankLogo bankCode={selected.bankCode} size={22} />
            <span className={styles.selectedText}>{labelOf(selected)}</span>
          </span>
        ) : (
          <span className={styles.placeholder}>{allowEmpty ? emptyLabel : placeholder}</span>
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
              placeholder="Buscar conta por banco, agência ou número..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className={styles.list}>
            {allowEmpty ? (
              <li>
                <button type="button" className={styles.option} onClick={() => pick(null)}>
                  <span className={styles.optionText}>
                    <span className={styles.optionName}>{emptyLabel}</span>
                  </span>
                </button>
              </li>
            ) : null}
            {results.length === 0 ? (
              <li className={styles.empty}>Nenhuma conta encontrada.</li>
            ) : (
              results.map((account) => (
                <li key={account.id}>
                  <button type="button" className={styles.option} onClick={() => pick(account)}>
                    <BankLogo bankCode={account.bankCode} size={24} />
                    <span className={styles.optionText}>
                      <span className={styles.optionName}>{labelOf(account)}</span>
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
