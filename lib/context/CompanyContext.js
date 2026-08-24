"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSession } from "@/lib/auth/session";
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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.companyId]);

  const memberships = useMemo(
    () => (company ? [{ role: roleLabel, company }] : []),
    [company, roleLabel]
  );

  const value = {
    user,
    memberships,
    activeMembership: memberships[0] || null,
    company,
    role: roleLabel,
    switching: false,
    switchingToCompany: null,
    // Login real hoje resolve uma única empresa ativa por sessão — trocar de empresa exige
    // novo login (ver docs/INTEGRACAO_API.md). Mantido no contrato para não quebrar consumidores.
    switchCompany: () => {},
    hasMultipleCompanies: false,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany deve ser usado dentro de CompanyProvider");
  return ctx;
}
