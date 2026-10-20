"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSession, saveSession } from "@/lib/auth/session";
import { apiFetch } from "@/lib/api/client";

const CompanyContext = createContext(null);

// Contexto de empresa ativa — antes construído a partir de múltiplos vínculos mockados
// (lib/mock/session), agora a partir da sessão real: o login já resolve a empresa ativa
// (companyId no token). Buscamos os dados da empresa (nome) via GET /companies/:id para
// preencher o mesmo formato de `company` que o header/switcher já esperam.
export function CompanyProvider({ children }) {
  const session = useMemo(() => getSession(), []);
  const user = session?.user || null;
  const roleLabel = session?.roles?.[0] || null;

  const [company, setCompany] = useState(null);
  // Empresas com vínculo ativo do usuário (GET /auth/companies) — alimenta o seletor.
  const [available, setAvailable] = useState([]);
  const [switching, setSwitching] = useState(false);
  const [switchingToCompany, setSwitchingToCompany] = useState(null);

  useEffect(() => {
    if (!session?.companyId) return;
    let cancelled = false;
    apiFetch(`/companies/${session.companyId}`)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch(() => {
        if (!cancelled) setCompany(null);
      });
    apiFetch("/auth/companies")
      .then((data) => {
        if (!cancelled) setAvailable(Array.isArray(data?.companies) ? data.companies : []);
      })
      .catch(() => {
        if (!cancelled) setAvailable([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.companyId]);

  const memberships = useMemo(() => {
    if (available.length > 0) {
      return available.map((c) => ({
        role: (c.roles && c.roles[0]) || null,
        company: { id: c.id, name: c.name },
      }));
    }
    return company ? [{ role: roleLabel, company }] : [];
  }, [available, company, roleLabel]);

  // Troca a empresa ativa: a API revoga a sessão atual e devolve novos tokens da outra empresa.
  // Recarrega o painel por navegação completa para descartar qualquer dado em memória da empresa
  // anterior.
  async function switchCompany(companyId) {
    if (!companyId || companyId === session?.companyId || switching) return;
    setSwitching(true);
    setSwitchingToCompany(companyId);
    try {
      const data = await apiFetch("/auth/switch-company", { method: "POST", body: { companyId } });
      saveSession(data);
      window.location.assign("/painel");
    } catch (err) {
      setSwitching(false);
      setSwitchingToCompany(null);
      if (typeof window !== "undefined") {
        window.alert(err?.message || "Não foi possível trocar de empresa.");
      }
    }
  }

  const value = {
    user,
    memberships,
    activeMembership: memberships.find((m) => m.company.id === session?.companyId) || memberships[0] || null,
    company,
    role: roleLabel,
    switching,
    switchingToCompany,
    switchCompany,
    hasMultipleCompanies: memberships.length > 1,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany deve ser usado dentro de CompanyProvider");
  return ctx;
}
