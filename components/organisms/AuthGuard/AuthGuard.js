"use client";

// Guarda de rota real para o painel: exige uma sessão válida (token salvo em
// lib/auth/session.js), senão redireciona para /entrar. Também bloqueia o acesso a uma rota
// cuja permissão o usuário não tem (ex.: digitar /painel/financeiro na URL sem finance:read) —
// o menu já esconde esses links, isso cobre quem chega direto pela URL. A API recusaria a
// chamada de qualquer forma; isso só evita renderizar uma tela vazia/quebrada nesse caso.

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Button from "@/components/atoms/Button/Button";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { getRequiredPermission } from "@/lib/rbac/routePermissions";
import styles from "./AuthGuard.module.css";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState("checking"); // checking | allowed | denied

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) {
      router.replace("/entrar");
      return;
    }
    const requiredPermission = getRequiredPermission(pathname);
    setStatus(hasPermission(requiredPermission) ? "allowed" : "denied");
  }, [router, pathname]);

  if (status === "checking") {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className={styles.loading}>
        <EmptyState
          icon="shield"
          title="Sem permissão para acessar esta tela"
          description="Fale com um administrador se acha que deveria ter acesso a esta área."
        />
        <Button variant="secondary" href="/painel">Voltar ao painel</Button>
      </div>
    );
  }

  return children;
}
