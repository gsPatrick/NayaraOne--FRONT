import Icon from "@/components/atoms/Icon/Icon";
import styles from "./GateChoice.module.css";

export default function GateChoice({ onSelectStaff, onSelectClient }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Bem-vindo</h1>
        <p className={styles.subtitle}>Selecione como você acessa o Nayara One.</p>
      </div>

      <button type="button" className={styles.option} onClick={onSelectStaff}>
        <span className={styles.optionIcon}>
          <Icon name="building" size={20} />
        </span>
        <span className={styles.optionText}>
          <span className={styles.optionTitle}>Sou da equipe</span>
          <span className={styles.optionDesc}>Entrar com e-mail e senha</span>
        </span>
        <Icon name="chevronRight" size={18} className={styles.optionArrow} />
      </button>

      <button type="button" className={styles.option} onClick={onSelectClient}>
        <span className={styles.optionIcon}>
          <Icon name="document" size={20} />
        </span>
        <span className={styles.optionText}>
          <span className={styles.optionTitle}>Sou cliente ou proprietário</span>
          <span className={styles.optionDesc}>Acessar contrato, fatura ou informes</span>
        </span>
        <Icon name="chevronRight" size={18} className={styles.optionArrow} />
      </button>
    </div>
  );
}
