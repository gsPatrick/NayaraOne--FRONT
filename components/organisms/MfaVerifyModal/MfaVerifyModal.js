"use client";

// Modal reutilizável de step-up MFA — usado antes de confirmar ações sensíveis (decidir
// aprovação de risco alto, liquidar lançamento, editar conta bancária). Chama
// POST /users/me/mfa/verify e só invoca onVerified() se a API confirmar o código — a ação
// real (chamada de negócio) continua sendo feita pela tela que abriu o modal, nunca aqui.
import { useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import { verifyMfa } from "@/lib/api/mfa";
import styles from "./MfaVerifyModal.module.css";

export default function MfaVerifyModal({ open, onClose, onVerified, actionLabel = "esta ação" }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  function handleClose() {
    setCode("");
    setError("");
    setLocked(false);
    onClose?.();
  }

  async function handleConfirm() {
    if (locked) return;
    if (!code.trim()) {
      setError("Informe o código do seu aplicativo autenticador.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await verifyMfa(code.trim());
      setCode("");
      onVerified?.();
    } catch (err) {
      if (err?.code === "MFA_NOT_ENABLED") {
        setError("Você ainda não tem MFA habilitado. Configure em Meu perfil > Segurança antes de continuar.");
      } else if (err?.code === "MFA_LOCKED") {
        // Bloqueio por tentativas falhas (política de segurança) — travar o botão evita o
        // usuário martelar "Confirmar" enquanto o bloqueio ainda está ativo no servidor.
        setLocked(true);
        setError(err.message);
      } else {
        setError(err?.message || "Código inválido. Tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Verificação em duas etapas"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={busy} disabled={locked}>Confirmar e continuar</Button>
        </>
      }
    >
      <p className={styles.description}>
        Para {actionLabel}, confirme o código do seu aplicativo autenticador (ou um código de
        recuperação).
      </p>
      {error ? (
        <Alert tone={locked ? "warning" : "danger"} title={locked ? "Bloqueado temporariamente" : "Não foi possível verificar"}>
          {error}
        </Alert>
      ) : null}
      <Input
        className={styles.codeInput}
        inputMode="numeric"
        autoFocus
        placeholder="000000"
        maxLength={11}
        value={code}
        disabled={locked}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
      />
    </Modal>
  );
}
