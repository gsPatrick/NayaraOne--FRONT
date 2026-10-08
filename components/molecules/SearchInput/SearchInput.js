import Icon from "@/components/atoms/Icon/Icon";
import styles from "./SearchInput.module.css";

export default function SearchInput({ placeholder = "Buscar...", "aria-label": ariaLabel, ...rest }) {
  // FIX (auditoria de acessibilidade mobile, Marco 7): o <label> envolvia o ícone e o <input>
  // mas não tinha nenhum texto — nome acessível vazio, leitor de tela anunciava só "campo de
  // busca" sem dizer o quê. placeholder some ao digitar, então nunca é uma fonte confiável de
  // nome acessível; usamos aria-label explícito (prioridade) ou o próprio placeholder como
  // nome acessível estável, que continua presente mesmo com o campo preenchido.
  return (
    <label className={styles.wrap}>
      <Icon name="search" size={16} className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={styles.input}
        {...rest}
      />
    </label>
  );
}
