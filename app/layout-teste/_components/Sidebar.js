import Link from "next/link";
import Icon from "./Icon";
import { NAV } from "../_mock/nav";
import s from "../layout.module.css";

const isActive = (it, p) => it.href && (p === it.href || (it.href !== "/layout-teste" && p.startsWith(it.href)) || it.also?.some((a) => p.startsWith(a)));

export default function Sidebar({ pathname, collapsed, onToggle, onClose }) {
  return (
    <aside className={s.sidebar} aria-label="Menu principal">
      <div className={s.brand}>
        <span className={s.logo} aria-hidden="true">N</span>
        <span className={s.brandName}>Nayara One</span>
        <button type="button" className={s.iconBtnDark} onClick={onClose} aria-label="Fechar menu" data-mobile-only>
          <Icon name="x" size={16} />
        </button>
      </div>
      <nav className={s.nav}>
        {NAV.map((g) => (
          <div key={g.group} className={s.group}>
            <div className={s.groupLabel}>{g.group}</div>
            <ul>
              {g.items.map((it) => {
                const active = isActive(it, pathname);
                const inner = (<><Icon name={it.icon} size={16} /><span className={s.itemText}>{it.label}</span></>);
                return (
                  <li key={it.label}>
                    {it.href ? (
                      <Link href={it.href} className={`${s.item} ${active ? s.active : ""}`} aria-current={active ? "page" : undefined} title={it.label}>{inner}</Link>
                    ) : (
                      <button type="button" className={s.item} title={`${it.label} (fora do escopo do teste)`}>{inner}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <button type="button" className={s.collapseBtn} onClick={onToggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} aria-pressed={collapsed}>
        <Icon name={collapsed ? "chevR" : "chevL"} size={16} />
        <span className={s.itemText}>Recolher menu</span>
      </button>
    </aside>
  );
}
