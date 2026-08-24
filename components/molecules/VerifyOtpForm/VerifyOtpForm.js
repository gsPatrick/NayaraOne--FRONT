"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import OtpInput from "@/components/atoms/OtpInput/OtpInput";
import Button from "@/components/atoms/Button/Button";
import styles from "./VerifyOtpForm.module.css";

const RESEND_SECONDS = 30;

export default function VerifyOtpForm({ email, code, onCodeChange, onSubmit, onResend, onBack, error }) {
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = () => {
    onResend();
    setCooldown(RESEND_SECONDS);
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="chevronRight" size={16} className={styles.backIcon} />
        Voltar
      </button>

      <div className={styles.heading}>
        <h1 className={styles.title}>Digite o código</h1>
        <p className={styles.subtitle}>
          Enviamos um código de 6 dígitos para <strong className={styles.email}>{email || "seu e-mail"}</strong>.
        </p>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <OtpInput value={code} onChange={onCodeChange} error={Boolean(error)} />
        {error ? <p className={styles.errorText}>{error}</p> : null}

        <Button type="submit" className={styles.submit} disabled={code.length < 6}>
          Verificar código
        </Button>
      </form>

      <p className={styles.resend}>
        {cooldown > 0 ? (
          <span>Reenviar código em {cooldown}s</span>
        ) : (
          <button type="button" className={styles.resendLink} onClick={handleResend}>
            Reenviar código
          </button>
        )}
      </p>
    </div>
  );
}
