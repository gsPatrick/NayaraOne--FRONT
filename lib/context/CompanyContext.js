"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, getUserMemberships, ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/mock/session";

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const user = useMemo(() => getCurrentUser(), []);
  const memberships = useMemo(() => getUserMemberships(user), [user]);

  const [companyId, setCompanyId] = useState(memberships[0]?.company.id || null);
  const [switching, setSwitching] = useState(false);
  const [pendingCompanyId, setPendingCompanyId] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored && memberships.some((m) => m.company.id === stored)) {
      setCompanyId(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchCompany(id) {
    if (!id || id === companyId || switching) return;
    setPendingCompanyId(id);
    setSwitching(true);
    // Tempos alongados de propósito para a troca de empresa ser perceptível
    // (não é um clique instantâneo — representa reautenticação de tenant).
    window.setTimeout(() => {
      setCompanyId(id);
      window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, id);
      window.setTimeout(() => {
        setSwitching(false);
        setPendingCompanyId(null);
      }, 900);
    }, 1400);
  }

  const activeMembership = memberships.find((m) => m.company.id === companyId) || memberships[0] || null;
  const pendingMembership = memberships.find((m) => m.company.id === pendingCompanyId) || null;

  const value = {
    user,
    memberships,
    activeMembership,
    company: activeMembership?.company || null,
    role: activeMembership?.role || null,
    switching,
    switchingToCompany: pendingMembership?.company || null,
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
