"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import RoleForm from "@/components/organisms/RoleForm/RoleForm";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import MfaSetupRequiredNotice from "@/components/molecules/MfaSetupRequiredNotice/MfaSetupRequiredNotice";
import { createRole, listPermissionsCatalog } from "@/lib/api/roles";
import styles from "../page.module.css";

export default function NovoPapelPage() {
  const router = useRouter();
  // M9-D940: o catálogo de permissões vem do padrão único de estados (carregando, erro com "tentar de novo", sem acesso, sem conexão).
  const catalogQuery = useAsyncState(() => listPermissionsCatalog().then((data) => data || []), { key: "papeis-novo:catalogo", isEmpty: () => false });
  const catalog = catalogQuery.data || [];
  const [submitError, setSubmitError] = useState("");
  const [mfaSetupNeeded, setMfaSetupNeeded] = useState(false);
  // Criar papel exige MFA recente (concessão de permissão é ação HIGH) — se a API recusar por
  // isso, guardamos o payload e abrimos o modal de verificação em vez de só mostrar o erro cru
  // (que citaria um endpoint de API, inútil para quem não é técnico).
  const [pendingPayload, setPendingPayload] = useState(null);

  async function handleSubmit(payload) {
    setSubmitError("");
    setMfaSetupNeeded(false);
    try {
      await createRole(payload);
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
      setSubmitError(err?.message || "Não foi possível criar o papel.");
    }
  }

  return (
    <AppShell title="Novo papel" backHref="/painel/papeis">
      <div className={styles.formWrap}>
        {mfaSetupNeeded ? <MfaSetupRequiredNotice /> : null}
        <AsyncState result={catalogQuery} loadingLabel="Carregando catálogo de permissões...">
          <RoleForm
            mode="create"
            catalog={catalog}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/painel/papeis")}
            submitError={submitError}
          />
        </AsyncState>
      </div>

      <MfaVerifyModal
        open={Boolean(pendingPayload)}
        onClose={() => setPendingPayload(null)}
        actionLabel="criar este papel"
        onVerified={async () => {
          const payload = pendingPayload;
          setPendingPayload(null);
          await handleSubmit(payload);
        }}
      />
    </AppShell>
  );
}
