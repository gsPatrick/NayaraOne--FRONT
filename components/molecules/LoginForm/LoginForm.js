"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/atoms/Icon/Icon";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import AuthTransition from "@/components/organisms/AuthTransition/AuthTransition";
import Alert from "@/components/molecules/Alert/Alert";
import { loginRequest } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import styles from "./LoginForm.module.css";

export default function LoginForm({ onBack }) {
  const router = useRouter();
  const [stage, setStage] = useState("form"); // form | entering
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (stage !== "form" || submitting) return;

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");

    setError("");
    setSubmitting(true);
    try {
      const data = await loginRequest(email, password);
      saveSession(data);
      setStage("entering");
      window.setTimeout(() => router.push("/painel"), 1500);
    } catch (err) {
      setError(err?.message || "Não foi possível entrar. Tente novamente.");
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="chevronRight" size={16} className={styles.backIcon} />
        Voltar
      </button>

      <div className={styles.heading}>
        <h1 className={styles.title}>Entrar</h1>
        <p className={styles.subtitle}>Acesse o painel com seu e-mail e senha corporativos.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error ? <Alert tone="danger" title="Não foi possível entrar">{error}</Alert> : null}

        <FormField label="E-mail" htmlFor="login-email" required>
          <Input id="login-email" type="email" name="email" placeholder="voce@nayaraone.com.br" autoComplete="email" required />
        </FormField>

        <FormField label="Senha" htmlFor="login-password" required>
          <Input id="login-password" type="password" name="password" placeholder="••••••••" autoComplete="current-password" required />
        </FormField>

        <div className={styles.row}>
          <Checkbox id="login-remember" name="remember" label="Manter conectado" defaultChecked />
          <Link href="/esqueci-senha" className={styles.link}>Esqueci minha senha</Link>
        </div>

        <Button type="submit" className={styles.submit} loading={submitting}>
          Entrar
        </Button>
      </form>

      <p className={styles.switch}>Problemas para entrar? Fale com o suporte.</p>

      {stage === "entering" ? <AuthTransition variant="enter" label="Entrando" /> : null}
    </div>
  );
}
