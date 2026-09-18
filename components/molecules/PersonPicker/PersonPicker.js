"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/atoms/Input/Input";
import Icon from "@/components/atoms/Icon/Icon";
import { listPeople } from "@/lib/api/people";
import styles from "./PersonPicker.module.css";

// Campo de busca de contatos já cadastrados — substitui o texto livre de nome do
// proprietário/locatário por um vínculo real (personId) com o cadastro de Contatos.
//
// FIX (reportado pela cliente 18/09/2026, Radar não localizava contato existente): este
// componente buscava contra `lib/mock/people` (uma lista estática de exemplo), nunca contra a
// API real — nenhum contato cadastrado de verdade aparecia, o campo sempre caía no fallback de
// "salvar apenas como texto". Corrigido: busca a lista real de pessoas uma vez (cache em
// memória do componente) e filtra localmente por nome, já que a API hoje não expõe busca por
// texto em /people — filtro client-side é o caminho correto sem exigir mudança de contrato da
// API para este fix.
export default function PersonPicker({ id, value, personId, onSelect, placeholder = "Buscar contato pelo nome..." }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState([]);
  const [loadError, setLoadError] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    let cancelled = false;
    listPeople()
      .then((res) => { if (!cancelled) setPeople(res || []); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao buscar contatos."); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const matches =
    query.trim().length > 0
      ? people.filter((p) => p.status !== "MERGED" && (p.legalName || "").toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
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
      {loadError ? (
        <span className={styles.unlinkedHint}>Não foi possível carregar os contatos cadastrados: {loadError}</span>
      ) : personId ? (
        <span className={styles.linkedHint}>Vinculado ao cadastro de Contatos</span>
      ) : query.trim() ? (
        <span className={styles.unlinkedHint}>Nenhum contato selecionado — será salvo apenas como texto.</span>
      ) : null}
    </div>
  );
}
