"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/atoms/Icon/Icon";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import AuthTransition from "@/components/organisms/AuthTransition/AuthTransition";
import { getCurrentUser, getUserMemberships, ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/mock/session";
import styles from "./LoginForm.module.css";

export default function LoginForm({ onBack }) {
  const router = useRouter();
  const [stage, setStage] = useState("form"); // form | selectCompany | entering

  const user = useMemo(() => getCurrentUser(), []);
  const memberships = useMemo(() => getUserMemberships(user), [user]);

  function completeLogin(companyId) {
    if (companyId) window.localStorage.setItem(ACTIVE_COMPANY_STORAGE_KEY, companyId);
    setStage("entering");
    window.setTimeout(() => router.push("/painel"), 1500);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (stage !== "form") return;
    if (memberships.length > 1) {
      setStage("selectCompany");
    } else {
      completeLogin(memberships[0]?.company.id);
    }
  };

  if (stage === "selectCompany") {
    return (
      <div className={styles.wrap}>
        <button type="button" className={styles.back} onClick={() => setStage("form")}>
          <Icon name="chevronRight" size={16} className={styles.backIcon} />
          Voltar
        </button>

        <div className={styles.heading}>
          <h1 className={styles.title}>Qual empresa?</h1>
          <p className={styles.subtitle}>Seu usuário tem acesso a mais de uma empresa. Escolha com qual deseja entrar.</p>
        </div>

        <div className={styles.companyList}>
          {memberships.map(({ company, role }) => (
            <button
              key={company.id}
              type="button"
              className={styles.companyOption}
              onClick={() => completeLogin(company.id)}
            >
              <span className={styles.companyOptionIcon}>
                <Icon name="building" size={20} />
              </span>
              <span className={styles.companyOptionText}>
                <span className={styles.companyOptionTitle}>{company.name}</span>
                <span className={styles.companyOptionDesc}>{role}</span>
              </span>
              <Icon name="chevronRight" size={18} className={styles.companyOptionArrow} />
            </button>
          ))}
        </div>
      </div>
    );
  }

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

        <Button type="submit" className={styles.submit}>Entrar</Button>
      </form>

      <p className={styles.switch}>Problemas para entrar? Fale com o suporte.</p>

      {stage === "entering" ? <AuthTransition variant="enter" label="Entrando" /> : null}
    </div>
  );
}
