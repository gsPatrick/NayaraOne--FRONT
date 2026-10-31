"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import RoleForm from "@/components/organisms/RoleForm/RoleForm";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import MfaSetupRequiredNotice from "@/components/molecules/MfaSetupRequiredNotice/MfaSetupRequiredNotice";
import { getRole, updateRole, listPermissionsCatalog } from "@/lib/api/roles";
import styles from "../page.module.css";

export default function EditarPapelPage({ params }) {
  const router = useRouter();
  // M9-D940: papel e catálogo vêm do padrão único de estados (carregando, erro com "tentar de novo", sem acesso, sem conexão).
  const roleQuery = useAsyncState(async () => {
    const [apiRole, apiCatalog] = await Promise.all([getRole(params.id), listPermissionsCatalog()]);
    return { role: apiRole, catalog: apiCatalog || [] };
  }, { key: `papel:${params.id}`, deps: [params.id], isEmpty: () => false });
  const role = roleQuery.data?.role || null;
  const catalog = roleQuery.data?.catalog || [];
  const [submitError, setSubmitError] = useState("");
  const [pendingPayload, setPendingPayload] = useState(null);
  const [mfaSetupNeeded, setMfaSetupNeeded] = useState(false);

  async function handleSubmit(payload) {
    setSubmitError("");
    setMfaSetupNeeded(false);
    try {
      await updateRole(params.id, payload);
      router.push("/painel/papeis");
    } catch (err) {
      if (err?.code === "MFA_STEP_UP_REQUIRED") {
        setPendingPayload(payload);
        return;
      }
      if (err?.code === "MFA_REQUIRED_NOT_ENABLED") {
        setMfaSetupNeeded(true);
        return;
      }
      setSubmitError(err?.message || "Não foi possível salvar as alterações.");
    }
  }

  return (
    <AppShell title={role ? `Editar papel — ${role.name}` : "Editar papel"} backHref="/painel/papeis">
      <div className={styles.formWrap}>
        <AsyncState result={roleQuery} loadingLabel="Carregando papel...">
          <>
            {mfaSetupNeeded ? <MfaSetupRequiredNotice /> : null}
            <RoleForm
              mode="edit"
              role={role}
              catalog={catalog}
              onSubmit={handleSubmit}
              onCancel={() => router.push("/painel/papeis")}
              submitError={submitError}
            />
          </>
        </AsyncState>
      </div>

      <MfaVerifyModal
        open={Boolean(pendingPayload)}
        onClose={() => setPendingPayload(null)}
        actionLabel="salvar as alterações deste papel"
        onVerified={async () => {
          const payload = pendingPayload;
          setPendingPayload(null);
          await handleSubmit(payload);
        }}
      />
    </AppShell>
  );
}
