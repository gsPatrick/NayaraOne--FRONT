"use client";

import { useMemo, useState } from "react";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import styles from "./page.module.css";

// Seleção dos imóveis do carrinho (livro do Marco 3 §14: "Usuário seleciona imóveis de uma oportunidade").
export default function CartPropertyPicker({ idPrefix, properties, selected, onChange }) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => `${p.name} ${p.internalCode} ${p.city}`.toLowerCase().includes(q));
  }, [properties, search]);
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <FormField label="Buscar imóvel" htmlFor={`${idPrefix}-search`} helper={`${selected.length} selecionado(s).`}>
        <Input id={`${idPrefix}-search`} placeholder="Nome, código ou cidade" value={search} onChange={(e) => setSearch(e.target.value)} />
      </FormField>
      <div className={styles.picker} role="group" aria-label="Imóveis do carrinho">
        {visible.map((p) => (
          <Checkbox
            key={p.id}
            id={`${idPrefix}-p-${p.id}`}
            label={`${p.name}${p.internalCode ? ` (${p.internalCode})` : ""}${p.city ? ` — ${p.city}` : ""}`}
            checked={selected.includes(p.id)}
            onChange={() => toggle(p.id)}
          />
        ))}
        {visible.length === 0 ? <p className={styles.meta}>Nenhum imóvel encontrado.</p> : null}
      </div>
    </div>
  );
}
