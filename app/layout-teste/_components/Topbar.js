import Icon from "./Icon";
import Avatar from "./Avatar";
import { CRUMBS } from "../_mock/nav";
import s from "../layout.module.css";

export default function Topbar({ pathname, onMenu }) {
  const crumbs = CRUMBS[pathname] || ["Início"];
  return (
    <header className={s.topbar}>
      <button type="button" className={`${s.iconBtn} ${s.menuBtn}`} onClick={onMenu} aria-label="Abrir menu">
        <Icon name="menu" size={18} />
      </button>
      <nav aria-label="Você está em" className={s.crumbs}>
        <ol>
          {crumbs.map((c, i) => (
            <li key={c} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</li>
          ))}
        </ol>
      </nav>
      <div className={s.topRight}>
        <label className={s.company}>
          <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Empresa</span>
          <select defaultValue="mat" aria-label="Empresa">
            <option value="mat">Nayara Imóveis (matriz)</option>
            <option value="obr">Nayara Construções</option>
            <option value="grp">Grupo consolidado</option>
          </select>
        </label>
        <div className={s.search}>
          <Icon name="search" size={14} />
          <input id="busca-global" type="search" placeholder="Buscar casos, contatos, imóveis" aria-label="Busca global" />
          <kbd>/</kbd>
        </div>
        <button type="button" className={s.iconBtn} aria-label="Notificações: 3 novas">
          <Icon name="bell" size={18} />
          <span className={s.badge} aria-hidden="true" />
        </button>
        <Avatar nome="Marina Albuquerque" size={28} />
      </div>
    </header>
  );
}
