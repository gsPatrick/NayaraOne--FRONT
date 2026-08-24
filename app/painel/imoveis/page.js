"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Icon from "@/components/atoms/Icon/Icon";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Pagination from "@/components/molecules/Pagination/Pagination";
import PropertyCard from "@/components/molecules/PropertyCard/PropertyCard";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FabLink from "@/components/molecules/FabLink/FabLink";
import { PROPERTIES, AVAILABILITY_STATUS_LABELS } from "@/lib/mock/properties";
import styles from "./page.module.css";

const PAGE_SIZE = 8;

export default function ImoveisPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return PROPERTIES.filter((p) => {
      const matchesQuery = query.trim().length === 0 ||
        `${p.name} ${p.neighborhood} ${p.city}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesType = typeFilter === "todos" || p.type === typeFilter;
      const matchesStatus = statusFilter === "todos" || p.availabilityStatus === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [query, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppShell title="Imóveis">
      <div className={styles.toolbar}>
        <SearchInput
          placeholder="Buscar por nome, bairro ou cidade..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        />
        <Select className={styles.filter} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
          <option value="todos">Todos os tipos</option>
          <option value="Residencial">Residencial</option>
          <option value="Comercial">Comercial</option>
          <option value="Terreno">Terreno</option>
          <option value="Rural">Rural</option>
        </Select>
        <Select className={styles.filter} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="todos">Todos os status</option>
          {Object.entries(AVAILABILITY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Button href="/painel/imoveis/novo" className={styles.createBtn}>
          <Icon name="plus" size={16} /> Novo imóvel
        </Button>
      </div>

      {pageItems.length === 0 ? (
        <div className={styles.empty}>
          <EmptyState icon="building" title="Nenhum imóvel encontrado" description="Ajuste os filtros ou o termo de busca para ver outros resultados." />
        </div>
      ) : (
        <div className={styles.grid}>
          {pageItems.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={(p) => router.push(`/painel/imoveis/${p.id}`)}
            />
          ))}
        </div>
      )}

      <div className={styles.paginationRow}>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <FabLink href="/painel/imoveis/novo" label="Novo imóvel" />
    </AppShell>
  );
}
