"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import RoleForm from "@/components/organisms/RoleForm/RoleForm";
import { createRole, listPermissionsCatalog } from "@/lib/api/roles";
import styles from "../page.module.css";

export default function NovoPapelPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPermissionsCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o catálogo de permissões.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(payload) {
    setSubmitError("");
    try {
      await createRole(payload);
      router.push("/painel/papeis");
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível criar o papel.");
    }
  }

  return (
    <AppShell title="Novo papel" backHref="/painel/papeis">
      <div className={styles.formWrap}>
        {loadError ? <Alert tone="danger" title="Não foi possível carregar o catálogo de permissões">{loadError}</Alert> : null}
        {loading ? (
          <Spinner size="lg" />
        ) : (
          <RoleForm
            mode="create"
            catalog={catalog}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/painel/papeis")}
            submitError={submitError}
          />
        )}
      </div>
    </AppShell>
  );
}
