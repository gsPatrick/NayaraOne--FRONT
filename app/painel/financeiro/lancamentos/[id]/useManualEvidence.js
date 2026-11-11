"use client";

// F03/A4 (conferência 18/10/2026): pagamento sem confirmação do banco só é dado como pago com comprovante e motivo, ANEXADOS antes da
// aprovação (quem aprova vê o arquivo). `context()` devolve, na hora da ação, a ficha atual e os setters da página.
import { useState } from "react";
import { attachSettlementEvidence } from "@/lib/api/finance";
import { uploadFile } from "@/lib/api/legal";
import { friendlyFinanceError } from "@/lib/finance/extras";

export default function useManualEvidence(context) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualFile, setManualFile] = useState(null);
  const [manualReason, setManualReason] = useState("");
  const [manualError, setManualError] = useState("");

  function validateManualEvidence() {
    if (!manualFile) return "Selecione o comprovante do pagamento (PDF ou imagem).";
    if (!manualReason.trim()) return "Informe o motivo da baixa manual (por que o pagamento foi feito fora da integração bancária).";
    return "";
  }

  function resetManualEvidence() {
    setManualOpen(false);
    setManualFile(null);
    setManualReason("");
    setManualError("");
  }

  async function handleAttachEvidence() {
    const { entry, confirm, setBusy, setNotice, load } = context();
    const problem = validateManualEvidence();
    setManualError(problem);
    if (problem) return;
    const ok = await confirm({
      title: "Anexar comprovante?",
      message: "O comprovante e o motivo ficam vinculados a este pagamento. Aprovações já concedidas são invalidadas: a aprovação precisa ser feita depois, por outra pessoa, vendo o comprovante.",
      confirmLabel: "Anexar comprovante",
    });
    if (!ok) return;
    setBusy(true);
    setNotice(null);
    try {
      const uploaded = await uploadFile(manualFile);
      await attachSettlementEvidence(entry.id, { evidenceFileId: uploaded.id, reason: manualReason.trim() });
      resetManualEvidence();
      load();
      setNotice({ tone: "success", text: "Comprovante anexado. Agora solicite a aprovação — ela precisa ser feita por outra pessoa." });
    } catch (err) {
      setManualError(friendlyFinanceError(err, "Não foi possível anexar o comprovante."));
    } finally {
      setBusy(false);
    }
  }

  /** Sem o comprovante anexado, abre o cartão do comprovante em vez de seguir com a baixa (devolve true quando bloqueou). */
  function requireAttachedEvidence() {
    const { needsManualEvidence, evidenceAttached, setPartialOpen } = context();
    if (!needsManualEvidence || evidenceAttached) return false;
    setPartialOpen(false);
    setManualOpen(true);
    return true;
  }

  return {
    manualOpen, setManualOpen, manualFile, setManualFile, manualReason, setManualReason, manualError,
    handleAttachEvidence, requireAttachedEvidence, resetManualEvidence,
  };
}
