import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./NavBar.module.css";

const NAV_ITEMS = ["Painel", "Imóveis", "Clientes", "Contratos", "Financeiro"];

export default function NavBar({ active = "Painel" }) {
  return (
    <header className={styles.wrap}>
      <div className={styles.topbar}>
        <span>CRECI 12345-J · (11) 4002-8922 · contato@nayaraone.com.br</span>
      </div>
      <nav className={styles.nav}>
        <BrandMark tone="light" size="md" title="Nayara One" />
        <ul className={styles.links}>
          {NAV_ITEMS.map((item) => (
            <li key={item}>
              <a href="#" className={[styles.link, item === active ? styles.active : ""].filter(Boolean).join(" ")}>
                {item}
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <button className={styles.iconBtn} aria-label="Notificações">
            <Icon name="bell" size={18} />
          </button>
          <Avatar name="Renata Souza" size="sm" tone="inverse" />
        </div>
      </nav>
    </header>
  );
}
