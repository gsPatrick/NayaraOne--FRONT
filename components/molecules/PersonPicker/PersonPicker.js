"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/atoms/Input/Input";
import Icon from "@/components/atoms/Icon/Icon";
import { PEOPLE } from "@/lib/mock/people";
import styles from "./PersonPicker.module.css";

// Campo de busca de contatos já cadastrados — substitui o texto livre de nome do
// proprietário/locatário por um vínculo real (personId) com o cadastro de Contatos.
export default function PersonPicker({ id, value, personId, onSelect, placeholder = "Buscar contato pelo nome..." }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const matches =
    query.trim().length > 0
      ? PEOPLE.filter((p) => p.status !== "MERGED" && p.legalName.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
      : [];

  function pick(person) {
    setQuery(person.legalName);
    setOpen(false);
    onSelect({ name: person.legalName, personId: person.id });
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.inputRow}>
        <Icon name="search" size={14} className={styles.searchIcon} />
        <Input
          id={id}
          placeholder={placeholder}
          value={query}
          className={styles.input}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onSelect({ name: e.target.value, personId: null });
          }}
          onFocus={() => setOpen(true)}
        />
        {personId ? <Icon name="check" size={14} className={styles.linkedIcon} /> : null}
      </div>
      {open && matches.length > 0 ? (
        <ul className={styles.dropdown}>
          {matches.map((p) => (
            <li key={p.id}>
              <button type="button" className={styles.option} onClick={() => pick(p)}>
                <span className={styles.optionName}>{p.legalName}</span>
                <span className={styles.optionDoc}>{p.taxIdNormalized}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {personId ? (
        <span className={styles.linkedHint}>Vinculado ao cadastro de Contatos</span>
      ) : query.trim() ? (
        <span className={styles.unlinkedHint}>Nenhum contato selecionado — será salvo apenas como texto.</span>
      ) : null}
    </div>
  );
}
