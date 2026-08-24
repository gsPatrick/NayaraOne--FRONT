"use client";

import { useState } from "react";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import PasswordStrengthMeter from "@/components/molecules/PasswordStrengthMeter/PasswordStrengthMeter";
import styles from "./ResetPasswordForm.module.css";

export default function ResetPasswordForm({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Nova senha</h1>
        <p className={styles.subtitle}>Crie uma senha nova para a sua conta.</p>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!mismatch) onSubmit();
        }}
      >
        <FormField label="Nova senha" htmlFor="reset-password" required helper="Mínimo de 8 caracteres">
          <Input
            id="reset-password"
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <PasswordStrengthMeter password={password} />
        </FormField>

        <FormField
          label="Confirmar nova senha"
          htmlFor="reset-password-confirm"
          required
          error={mismatch ? "As senhas não coincidem" : undefined}
        >
          <Input
            id="reset-password-confirm"
            type="password"
            name="passwordConfirm"
            placeholder="••••••••"
            autoComplete="new-password"
            error={mismatch}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </FormField>

        <Button type="submit" className={styles.submit}>
          Redefinir senha
        </Button>
      </form>
    </div>
  );
}
