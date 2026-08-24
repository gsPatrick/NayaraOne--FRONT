"use client";

import { useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import styles from "./ClientAccessForm.module.css";

export default function ClientAccessForm({ onBack }) {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="chevronRight" size={16} className={styles.backIcon} />
        Voltar
      </button>

      <div className={styles.heading}>
        <h1 className={styles.title}>Acessar meu contrato</h1>
        <p className={styles.subtitle}>
          Informe o e-mail vinculado ao seu cadastro. Enviaremos um link seguro de acesso ao seu
          contrato, faturas ou informe de rendimentos.
        </p>
      </div>

      {sent ? (
        <div className={styles.sent}>
          <span className={styles.sentIcon}>
            <Icon name="check" size={20} />
          </span>
          <p className={styles.sentTitle}>Link enviado</p>
          <p className={styles.sentDesc}>
            Se este e-mail estiver vinculado a um cadastro, você vai receber um link de acesso em
            instantes.
          </p>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <FormField label="E-mail cadastrado" htmlFor="client-email" required>
            <Input
              id="client-email"
              type="email"
              name="email"
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
            />
          </FormField>

          <Button type="submit" className={styles.submit}>
            Enviar link de acesso
          </Button>
        </form>
      )}
    </div>
  );
}
