"use client";

import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listPersonRoleCatalog } from "@/lib/api/people";

// Papéis da pessoa (M3-02 / CRMX-002, DI-M3PE-2): as opções vêm do catálogo da empresa (GET /people/roles-catalog, parâmetro people.papeis em
// Configurações > Pessoas), com os cinco papéis do livro sempre presentes (cliente, proprietário, vendedor, locatário, fornecedor). Papel que a
// pessoa já tem e saiu do catálogo continua aparecendo marcado (pode ser desmarcado, não pode ser escolhido de novo).
export function roleOptions(catalog, selected) {
  const list = Array.isArray(catalog) ? catalog.map((r) => ({ code: r.code, label: r.label })) : [];
  for (const code of selected || []) if (!list.some((r) => r.code === code)) list.push({ code, label: code, foraDoCatalogo: true });
  return list;
}

export default function RoleChips({ selected, onToggle, styles }) {
  const query = useAsyncState(() => listPersonRoleCatalog(), { key: "pessoas:papeis", isEmpty: (data) => !data || data.length === 0 });
  return (
    <AsyncState result={query} loadingLabel="Carregando os papéis..." emptyTitle="Nenhum papel no catálogo" emptyDescription="Peça a quem administra para revisar o catálogo de papéis em Configurações > Pessoas.">
      <div className={styles.roleGrid}>
        {roleOptions(query.data, selected).map(({ code, label, foraDoCatalogo }) => (
          <button
            type="button"
            key={code}
            className={[styles.roleChip, selected.includes(code) ? styles.roleChipActive : ""].filter(Boolean).join(" ")}
            onClick={() => onToggle(code)}
            aria-pressed={selected.includes(code)}
            disabled={foraDoCatalogo && !selected.includes(code)}
            title={foraDoCatalogo ? "Papel fora do catálogo atual da empresa" : undefined}
          >
            {label}
          </button>
        ))}
      </div>
    </AsyncState>
  );
}
