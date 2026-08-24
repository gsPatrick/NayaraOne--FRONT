import Icon from "@/components/atoms/Icon/Icon";
import Input from "@/components/atoms/Input/Input";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import styles from "./RequestOtpForm.module.css";

export default function RequestOtpForm({ email, onEmailChange, onSubmit, onBack }) {
  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="chevronRight" size={16} className={styles.backIcon} />
        Voltar para o login
      </button>

      <div className={styles.heading}>
        <h1 className={styles.title}>Esqueci minha senha</h1>
        <p className={styles.subtitle}>
          Informe seu e-mail. Vamos enviar um código de verificação de 6 dígitos.
        </p>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <FormField label="E-mail" htmlFor="otp-email" required>
          <Input
            id="otp-email"
            type="email"
            name="email"
            placeholder="voce@nayaraone.com.br"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            required
          />
        </FormField>

        <Button type="submit" className={styles.submit}>
          Enviar código
        </Button>
      </form>
    </div>
  );
}
