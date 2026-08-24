"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import AuthVisual from "@/components/molecules/AuthVisual/AuthVisual";
import RequestOtpForm from "@/components/molecules/RequestOtpForm/RequestOtpForm";
import VerifyOtpForm from "@/components/molecules/VerifyOtpForm/VerifyOtpForm";
import ResetPasswordForm from "@/components/molecules/ResetPasswordForm/ResetPasswordForm";
import styles from "./PasswordRecovery.module.css";

export default function PasswordRecovery() {
  const router = useRouter();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  // Entra igual ao estágio "formStage" do login (50/50 — a mesma proporção da tela anterior)
  // e relaxa pra proporção padrão desta página (70/30) logo após montar, animando a transição
  // em vez de já nascer estática em 70/30.
  const [formStage, setFormStage] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFormStage(false));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleRequestSubmit = () => {
    setStep("verify");
  };

  const handleVerifySubmit = () => {
    if (code.length < 6) return;
    setCodeError("");
    setStep("reset");
  };

  const handleResend = () => {
    setCode("");
    setCodeError("");
  };

  const handleResetSubmit = () => {
    setStep("done");
  };

  return (
    <div className={[styles.shell, formStage ? styles.formStage : ""].filter(Boolean).join(" ")}>
      <div className={styles.visualPane}>
        <AuthVisual />
      </div>
      <div className={styles.panel}>
        <div className={styles.panelInner}>
          {step === "request" ? (
            <RequestOtpForm
              email={email}
              onEmailChange={setEmail}
              onSubmit={handleRequestSubmit}
              onBack={() => router.push("/entrar")}
            />
          ) : step === "verify" ? (
            <VerifyOtpForm
              email={email}
              code={code}
              onCodeChange={setCode}
              onSubmit={handleVerifySubmit}
              onResend={handleResend}
              onBack={() => setStep("request")}
              error={codeError}
            />
          ) : step === "reset" ? (
            <ResetPasswordForm onSubmit={handleResetSubmit} />
          ) : (
            <div className={styles.done}>
              <span className={styles.doneIcon}>
                <Icon name="check" size={22} />
              </span>
              <h1 className={styles.doneTitle}>Senha redefinida</h1>
              <p className={styles.doneDesc}>Sua senha foi alterada. Você já pode entrar com ela.</p>
              <Button className={styles.doneButton} onClick={() => router.push("/entrar")}>
                Ir para o login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
