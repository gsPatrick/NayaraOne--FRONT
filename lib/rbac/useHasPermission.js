"use client";

import { useEffect, useState } from "react";
import { hasAnyPermission } from "@/lib/rbac/permissions";

// Hook de apresentação (R8): true quando a sessão tem ao menos uma das permissões informadas.
// Avalia depois de montar (a sessão vive no navegador) para o primeiro render coincidir com o
// servidor. Só espelha o que a API já aplica; a autorização real continua sendo do backend.
export function useHasPermission(codes) {
  const key = Array.isArray(codes) ? codes.join("|") : codes || "";
  const [allowed, setAllowed] = useState(true);
  useEffect(() => {
    setAllowed(!key || hasAnyPermission(key.split("|")));
  }, [key]);
  return allowed;
}
