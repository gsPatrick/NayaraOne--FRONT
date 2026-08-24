"use client";

// Guarda de rota real para o painel: exige uma sessão válida (token salvo em
// lib/auth/session.js), senão redireciona para /entrar. Reaproveita o Spinner já existente
// no design system enquanto a checagem inicial acontece no cliente.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { getSession } from "@/lib/auth/session";
import styles from "./AuthGuard.module.css";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.accessToken) {
      router.replace("/entrar");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    );
  }

  return children;
}
