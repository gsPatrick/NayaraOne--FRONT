"use client";

// Ações do contrato SÓ pelas transições do livro (Guia §3, espelho em lib/labels/juridico.js). Não existe "Cancelar":
// antes da aprovação o contrato volta para rascunho; depois de em vigor é rescindido (encerrado) e arquivado.
import { useState } from "react";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import ConfirmAction from "@/components/molecules/ConfirmAction/ConfirmAction";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import {
  transitionContract,
  suspendContract,
  reactivateContract,
  terminateContract,
  closeContract,
  approveContractVersion,
  sendContractVersionForSignature,
} from "@/lib/api/legal";
import { allowedContractTransitions, CONTRACT_STATUS_LABELS, PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import styles from "./page.module.css";

// Transição simples pela rota /transition: rótulo do botão e texto da confirmação.
const SIMPLE = {
  "DRAFT>DOCUMENTS_PENDING": { label: "Enviar para documentos", icon: "document", message: "O contrato passa a aguardar os documentos do checklist." },
  "DRAFT>LEGAL_REVIEW": { label: "Enviar para revisão jurídica", icon: "scale", message: "O contrato vai para a revisão jurídica. Os documentos obrigatórios desta etapa precisam estar anexados ou dispensados." },
  "DOCUMENTS_PENDING>LEGAL_REVIEW": { label: "Enviar para revisão jurídica", icon: "scale", message: "O contrato vai para a revisão jurídica. Os documentos obrigatórios desta etapa precisam estar anexados ou dispensados." },
  "LEGAL_REVIEW>DRAFT": { label: "Devolver para rascunho", icon: "refreshCcw", variant: "secondary", message: "O contrato volta para rascunho para ajustes antes de nova análise." },
  "SIGNING>SIGNED": { label: "Marcar como assinado", icon: "check", message: "Todas as partes obrigatórias precisam ter assinado a versão vigente." },
  "SIGNING>APPROVED": { label: "Voltar para aprovado", icon: "refreshCcw", variant: "secondary", message: "O envio para assinatura é interrompido e o contrato volta para aprovado (use quando o documento precisa mudar)." },
  "SIGNED>ACTIVE": { label: "Ativar contrato", icon: "check", message: "O contrato entra em vigor. Garantias e documentos de ativação são conferidos pelo sistema." },
};

const REASONED = {
  suspend: { fn: suspendContract, label: "Suspender contrato", confirmLabel: "Suspender", success: "Contrato suspenso.", tone: "danger" },
  reactivate: { fn: reactivateContract, label: "Reativar contrato", confirmLabel: "Reativar", success: "Contrato reativado.", tone: "primary" },
  close: { fn: closeContract, label: "Encerrar contrato", confirmLabel: "Encerrar", success: "Contrato encerrado.", tone: "primary" },
};

export default function ContractActions({ contract, latestVersion, parties, personOf, onChanged, onError, onNotice }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [reasonAction, setReasonAction] = useState(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [signers, setSigners] = useState([]);
  const [sendError, setSendError] = useState("");

  const allowed = allowedContractTransitions(contract.status);
  const versionStatus = latestVersion ? latestVersion.status || "DRAFT" : null;

  async function run(fn, successText) {
    onError("");
    setBusy(true);
    try {
      await fn();
      onNotice({ tone: "success", text: successText });
      await onChanged();
      return true;
    } catch (err) {
      onError(legalErrorMessage(err, "Não foi possível mudar a situação do contrato."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSimple(target) {
    const cfg = SIMPLE[`${contract.status}>${target}`];
    const ok = await confirm({ title: `${cfg.label}?`, message: cfg.message, confirmLabel: cfg.label });
    if (!ok) return;
    await run(() => transitionContract(contract.id, target), `Contrato agora está em "${CONTRACT_STATUS_LABELS[target]}".`);
  }

  async function handleApproveVersion() {
    if (!latestVersion) {
      onError("Crie a versão do documento antes de aprovar.");
      return;
    }
    const ok = await confirm({
      title: `Aprovar a versão ${latestVersion.versionNumber}?`,
      message: "O sistema confere o hash do arquivo guardado e registra você como aprovador. Uma versão criada depois disso precisa de nova aprovação.",
      confirmLabel: "Aprovar versão",
    });
    if (!ok) return;
    await run(() => approveContractVersion(latestVersion.id), `Versão ${latestVersion.versionNumber} aprovada.`);
  }

  function openSend() {
    setSendError("");
    setSigners(parties.map((p) => p.personId));
    setSendOpen(true);
  }

  async function handleSend() {
    if (!signers.length) {
      setSendError("Escolha ao menos um signatário.");
      return;
    }
    setSendError("");
    setBusy(true);
    try {
      await sendContractVersionForSignature(latestVersion.id, signers);
      setSendOpen(false);
      onNotice({ tone: "success", text: `Versão ${latestVersion.versionNumber} enviada para assinatura.` });
      await onChanged();
    } catch (err) {
      setSendError(legalErrorMessage(err, "Não foi possível enviar para assinatura."));
    } finally {
      setBusy(false);
    }
  }

  function openReason(action) {
    setReason("");
    setReasonError("");
    setReasonAction(action);
  }

  async function handleReason() {
    if (!reason.trim()) {
      setReasonError("Informe o motivo — fica registrado na auditoria.");
      return;
    }
    const cfg = REASONED[reasonAction];
    setBusy(true);
    setReasonError("");
    try {
      await cfg.fn(contract.id, reason.trim());
      setReasonAction(null);
      onNotice({ tone: "info", text: cfg.success });
      await onChanged();
    } catch (err) {
      setReasonError(legalErrorMessage(err, "Não foi possível mudar a situação do contrato."));
    } finally {
      setBusy(false);
    }
  }

  async function handleTerminate(confirmation) {
    await terminateContract(contract.id, confirmation.justification, confirmation);
    setTerminateOpen(false);
    onNotice({ tone: "info", text: "Contrato encerrado (rescisão registrada)." });
    await onChanged();
  }

  const buttons = [];
  for (const target of allowed) {
    const key = `${contract.status}>${target}`;
    if (SIMPLE[key]) {
      const cfg = SIMPLE[key];
      buttons.push(
        <Button key={key} variant={cfg.variant || "primary"} onClick={() => handleSimple(target)} disabled={busy}>
          <Icon name={cfg.icon} size={16} /> {cfg.label}
        </Button>
      );
    }
  }
  if (contract.status === "LEGAL_REVIEW") {
    buttons.unshift(
      <Button key="approve" onClick={handleApproveVersion} disabled={busy || !latestVersion} data-testid="contract-approve-version">
        <Icon name="check" size={16} /> Aprovar versão vigente
      </Button>
    );
  }
  if (contract.status === "APPROVED") {
    if (versionStatus === "DRAFT") {
      buttons.push(
        <Button key="approve-new" onClick={handleApproveVersion} disabled={busy} data-testid="contract-approve-new-version">
          <Icon name="check" size={16} /> Aprovar nova versão
        </Button>
      );
    }
    buttons.push(
      <Button key="send" onClick={openSend} disabled={busy || versionStatus !== "APPROVED"} data-testid="contract-send-signature"
        title={versionStatus !== "APPROVED" ? "A versão vigente precisa estar aprovada para ir à assinatura." : undefined}>
        <Icon name="signature" size={16} /> Enviar para assinatura
      </Button>
    );
  }
  if (allowed.includes("SUSPENDED")) buttons.push(<Button key="suspend" variant="secondary" onClick={() => openReason("suspend")} disabled={busy}><Icon name="ban" size={16} /> Suspender</Button>);
  if (contract.status === "SUSPENDED" && allowed.includes("ACTIVE")) buttons.push(<Button key="reactivate" variant="secondary" onClick={() => openReason("reactivate")} disabled={busy}><Icon name="check" size={16} /> Reativar</Button>);
  if (allowed.includes("TERMINATED")) buttons.push(<Button key="terminate" variant="secondary" onClick={() => { onError(""); setTerminateOpen(true); }} disabled={busy}><Icon name="ban" size={16} /> Rescindir</Button>);
  if (allowed.includes("CLOSED")) buttons.push(<Button key="close" onClick={() => openReason("close")} disabled={busy}><Icon name="check" size={16} /> Encerrar</Button>);

  const cfg = reasonAction ? REASONED[reasonAction] : null;
  return (
    <>
      <div className={styles.actions}>{buttons}</div>

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Enviar para assinatura"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendOpen(false)} disabled={busy}>Voltar</Button>
            <Button onClick={handleSend} loading={busy} disabled={busy || !signers.length} data-testid="contract-send-signature-confirm">Enviar para assinatura</Button>
          </>
        }
      >
        {sendError ? <Alert tone="danger" className={styles.notice}>{sendError}</Alert> : null}
        <p className={styles.partyRole}>Vai para assinatura a versão {latestVersion?.versionNumber} aprovada. Escolha quem assina:</p>
        <div className={styles.formGrid}>
          {parties.map((p) => (
            <Checkbox
              key={p.id}
              id={`f-signer-${p.personId}`}
              label={`${personOf(p.personId)?.legalName || "Pessoa"} — ${PARTY_ROLE_LABELS[p.partyRole] || "Parte"}`}
              checked={signers.includes(p.personId)}
              onChange={(e) => setSigners((prev) => (e.target.checked ? [...new Set([...prev, p.personId])] : prev.filter((id) => id !== p.personId)))}
            />
          ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(cfg)}
        onClose={() => setReasonAction(null)}
        title={cfg ? cfg.label : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReasonAction(null)} disabled={busy}>Voltar</Button>
            <Button variant={cfg && cfg.tone === "danger" ? "danger" : "primary"} onClick={handleReason} loading={busy} disabled={busy}>{cfg ? cfg.confirmLabel : ""}</Button>
          </>
        }
      >
        {reasonError ? <Alert tone="danger" className={styles.notice}>{reasonError}</Alert> : null}
        <FormField label="Motivo" htmlFor="f-state-reason" required helper="Registrado na auditoria junto com a mudança.">
          <Input id="f-state-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Inadimplência em negociação com o locatário" />
        </FormField>
      </Modal>

      <ConfirmAction
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Rescindir contrato"
        confirmLabel="Rescindir"
        target={{ method: "GET", path: `/legal/contracts/${contract.id}/impact` }}
        onConfirm={handleTerminate}
      />
      <ConfirmDialog />
    </>
  );
}
