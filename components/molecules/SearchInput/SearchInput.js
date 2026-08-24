import Icon from "@/components/atoms/Icon/Icon";
import styles from "./SearchInput.module.css";

export default function SearchInput({ placeholder = "Buscar...", ...rest }) {
  return (
    <label className={styles.wrap}>
      <Icon name="search" size={16} className={styles.icon} />
      <input type="search" placeholder={placeholder} className={styles.input} {...rest} />
    </label>
  );
}
