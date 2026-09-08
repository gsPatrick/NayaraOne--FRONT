"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import AppShell from "@/components/organisms/AppShell/AppShell";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import Badge from "@/components/atoms/Badge/Badge";
import Modal from "@/components/organisms/Modal/Modal";
import { getCurrentUser, isMfaSetupRequired, clearMfaSetupRequired } from "@/lib/auth/session";
import { setupMfa, confirmMfa, disableMfa } from "@/lib/api/mfa";
import styles from "./page.module.css";

// Tela de segurança/MFA — Caderno técnico Nayara: "MFA obrigatório para diretoria, financeiro,
// jurídico, administradores e alterações críticas" (TOTP, RFC 6238; SMS não é preferencial).
// Fluxo: setup (gera otpauth://) -> confirm (primeiro código, habilita + mostra recovery codes
// uma única vez) -> disable (exige código atual válido).
export default function PerfilPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const [mfaEnabled, setMfaEnabled] = useState(Boolean(currentUser?.mfaEnabled));
  const [mfaRequired, setMfaRequired] = useState(false);
  const [completedRequiredSetup, setCompletedRequiredSetup] = useState(false);

  useEffect(() => {
    setMfaRequired(isMfaSetupRequired());
  }, []);

  const [step, setStep] = useState("idle"); // idle | setup | confirm | recovery
  const [otpauthUri, setOtpauthUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableError, setDisableError] = useState("");
  const [disableBusy, setDisableBusy] = useState(false);

  useEffect(() => {
    if (!otpauthUri) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(""); });
    return () => { cancelled = true; };
  }, [otpauthUri]);

  async function handleStartSetup() {
    setError("");
    setBusy(true);
    try {
      const { otpauthUri: uri } = await setupMfa();
      setOtpauthUri(uri);
      setStep("confirm");
    } catch (err) {
      setError(err?.message || "Não foi possível iniciar a configuração do MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!confirmCode.trim()) {
      setError("Informe o código gerado pelo aplicativo autenticador.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const { recoveryCodes: codes } = await confirmMfa(confirmCode.trim());
      setRecoveryCodes(codes);
      setStep("recovery");
      setMfaEnabled(true);
      setConfirmCode("");
      if (mfaRequired) {
        clearMfaSetupRequired();
        setMfaRequired(false);
        setCompletedRequiredSetup(true);
      }
    } catch (err) {
      setError(err?.message || "Código inválido. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function handleFinish() {
    setStep("idle");
    setOtpauthUri("");
    setQrDataUrl("");
    setRecoveryCodes([]);
    if (completedRequiredSetup) {
      router.push("/painel");
    }
  }

  async function handleDisable() {
    if (!disableCode.trim()) {
      setDisableError("Informe o código atual do seu aplicativo autenticador.");
      return;
    }
    setDisableBusy(true);
    setDisableError("");
    try {
      await disableMfa(disableCode.trim());
      setMfaEnabled(false);
      setDisableOpen(false);
      setDisableCode("");
      handleFinish();
    } catch (err) {
      setDisableError(err?.message || "Código inválido — não foi possível desabilitar o MFA.");
    } finally {
      setDisableBusy(false);
    }
  }

  return (
    <AppShell title="Meu perfil">
      <EmptyState
        icon="users"
        title="Perfil do usuário"
        description="Dados pessoais, foto e preferências de conta."
      />

      <Card
        title="Segurança — verificação em duas etapas (MFA)"
        subtitle="Aplicativo autenticador (TOTP) — Google Authenticator, Authy, 1Password, etc."
        className={styles.securityCard}
      >
        {mfaRequired ? (
          <Alert tone="warning" title="Configuração de MFA obrigatória">
            Sua empresa exige verificação em duas etapas para o seu perfil de acesso. Configure o
            MFA abaixo para continuar usando o painel.
          </Alert>
        ) : null}

        {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}

        {step === "idle" && (
          <div className={styles.statusRow}>
            <Badge tone={mfaEnabled ? "success" : "warning"}>
              {mfaEnabled ? "MFA habilitado" : "MFA não configurado"}
            </Badge>
            {mfaEnabled ? (
              <Button variant="danger" size="sm" onClick={() => setDisableOpen(true)}>
                Desabilitar MFA
              </Button>
            ) : (
              <Button size="sm" onClick={handleStartSetup} loading={busy}>
                Configurar MFA
              </Button>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className={styles.setupBlock}>
            <p className={styles.instructions}>
              1. Escaneie o QR code abaixo com seu aplicativo autenticador (ou copie o código manualmente).
            </p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code do segredo TOTP" className={styles.qr} />
            ) : null}
            <p className={styles.manualLabel}>Ou copie manualmente:</p>
            <code className={styles.manualCode}>{otpauthUri}</code>

            <p className={styles.instructions}>2. Informe o código gerado pelo aplicativo para confirmar:</p>
            <Input
              className={styles.codeInput}
              inputMode="numeric"
              placeholder="000000"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
            />
            <div className={styles.actionsRow}>
              <Button variant="secondary" onClick={handleFinish}>Cancelar</Button>
              <Button onClick={handleConfirm} loading={busy}>Confirmar e habilitar</Button>
            </div>
          </div>
        )}

        {step === "recovery" && (
          <div className={styles.setupBlock}>
            <Alert tone="warning" title="Guarde estes códigos agora">
              Cada código de recuperação só pode ser usado uma vez, e esta é a única vez que eles
              são exibidos. Guarde em um local seguro (gerenciador de senhas, cofre) — eles
              permitem entrar mesmo sem acesso ao aplicativo autenticador.
            </Alert>
            <ul className={styles.recoveryList}>
              {recoveryCodes.map((code) => (
                <li key={code} className={styles.recoveryCode}>{code}</li>
              ))}
            </ul>
            <div className={styles.actionsRow}>
              <Button onClick={handleFinish}>Já guardei os códigos</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={disableOpen}
        onClose={() => { setDisableOpen(false); setDisableCode(""); setDisableError(""); }}
        title="Desabilitar MFA"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisableOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDisable} loading={disableBusy}>Desabilitar</Button>
          </>
        }
      >
        {disableError ? <Alert tone="danger" title="Não foi possível desabilitar">{disableError}</Alert> : null}
        <p>Para desabilitar o MFA, confirme o código atual do seu aplicativo autenticador.</p>
        <Input
          className={styles.codeInput}
          inputMode="numeric"
          placeholder="000000"
          value={disableCode}
          onChange={(e) => setDisableCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleDisable(); }}
        />
      </Modal>
    </AppShell>
  );
}
