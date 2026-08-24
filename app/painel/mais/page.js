import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Icon from "@/components/atoms/Icon/Icon";
import LogoutButton from "@/components/molecules/LogoutButton/LogoutButton";
import styles from "./page.module.css";

const MORE_ITEMS = [
  { label: "Contatos", href: "/painel/pessoas", icon: "users" },
  { label: "Empresas & Unidades", href: "/painel/empresas", icon: "layers" },
  { label: "Usuários & Acessos", href: "/painel/usuarios", icon: "shield" },
  { label: "Financeiro", href: "/painel/mais", icon: "document", soon: true },
  { label: "Contratos", href: "/painel/mais", icon: "document", soon: true },
  { label: "Obras", href: "/painel/mais", icon: "settings", soon: true },
  { label: "NAY · IA", href: "/painel/mais", icon: "bell", soon: true },
];

export default function MaisPage() {
  return (
    <AppShell title="Mais">
      <ul className={styles.list}>
        {MORE_ITEMS.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className={styles.item}>
              <span className={styles.itemIcon}>
                <Icon name={item.icon} size={18} />
              </span>
              <span className={styles.itemLabel}>{item.label}</span>
              {item.soon ? <span className={styles.badge}>em breve</span> : null}
              <Icon name="chevronRight" size={16} className={styles.itemArrow} />
            </Link>
          </li>
        ))}
        <li>
          <LogoutButton className={[styles.item, styles.logout].join(" ")}>
            <span className={styles.itemIcon}>
              <Icon name="logout" size={18} />
            </span>
            <span className={styles.itemLabel}>Sair</span>
          </LogoutButton>
        </li>
      </ul>
    </AppShell>
  );
}
