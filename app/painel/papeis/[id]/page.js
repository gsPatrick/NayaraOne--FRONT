"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import RoleForm from "@/components/organisms/RoleForm/RoleForm";
import { getRole, updateRole, listPermissionsCatalog } from "@/lib/api/roles";
import styles from "../page.module.css";

export default function EditarPapelPage({ params }) {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getRole(params.id), listPermissionsCatalog()])
      .then(([apiRole, apiCatalog]) => {
        if (cancelled) return;
        setRole(apiRole);
        setCatalog(apiCatalog);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o papel.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function handleSubmit(payload) {
    setSubmitError("");
    try {
      await updateRole(params.id, payload);
      router.push("/painel/papeis");
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível salvar as alterações.");
    }
  }

  return (
    <AppShell title={role ? `Editar papel — ${role.name}` : "Editar papel"} backHref="/painel/papeis">
      <div className={styles.formWrap}>
        {loadError ? (
          <Alert tone="danger" title="Não foi possível carregar o papel">{loadError}</Alert>
        ) : loading ? (
          <Spinner size="lg" />
        ) : (
          <RoleForm
            mode="edit"
            role={role}
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
