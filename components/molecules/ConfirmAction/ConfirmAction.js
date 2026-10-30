"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import { fetchImpact } from "@/lib/api/destructiveActions";
import { buildConfirmation, confirmState } from "@/lib/destructiveActions/state";
import ConfirmActionView from "./ConfirmActionView";

/**
 * ConfirmAction (M9-D852): modal único de confirmação das ações destrutivas ou críticas. Ao abrir, pede ao servidor o impacto da ação (`target` = rota /impact do
 * inventário), mostra contagens, valor e impedimentos e exige a confirmação do nível definido pela API. `onConfirm(confirmation)` recebe o corpo `confirmation`
 * ({understood?, typedCode?, justification?, impactToken}) para enviar junto da ação. Se o impacto mudou (409 GOV_ACTION_IMPACT_CHANGED) a simulação é refeita e a pessoa
 * revisa antes de confirmar de novo. O traceId do erro aparece com o botão "Copiar código".
 */
export default function ConfirmAction({ open, onClose, title, target, onConfirm, confirmLabel, cancelLabel, tone = "danger", children }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [justification, setJustification] = useState("");

  const targetKey = target ? `${target.method || "GET"} ${target.path}` : "";
  const load = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setLoadError(null);
    try {
      setImpact(await fetchImpact(target));
    } catch (err) {
      setImpact(null);
      setLoadError({ message: err.message, traceId: err.traceId || null });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  useEffect(() => {
    if (!open) return;
    setUnderstood(false);
    setTypedCode("");
    setJustification("");
    setSubmitError(null);
    load();
  }, [open, load]);

  async function confirm() {
    if (!impact || !confirmState({ impact, understood, typedCode, justification }).canConfirm) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await onConfirm(buildConfirmation({ impact, understood, typedCode, justification }));
    } catch (err) {
      setSubmitError({ message: err.message, traceId: err.traceId || null });
      if (err.code === "GOV_ACTION_IMPACT_CHANGED") {
        // O impacto mudou entre a simulação e a execução: nada foi executado; mostra o novo impacto para a pessoa revisar.
        setUnderstood(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title}>
      <ConfirmActionView
        impact={impact} loading={loading} loadError={loadError} submitError={submitError}
        understood={understood} typedCode={typedCode} justification={justification} busy={busy}
        confirmLabel={confirmLabel} cancelLabel={cancelLabel} tone={tone} intro={children}
        onUnderstood={setUnderstood} onTypedCode={setTypedCode} onJustification={setJustification}
        onConfirm={confirm} onCancel={onClose} onReload={load}
      />
    </Modal>
  );
}
