import s from "./PageHeader.module.css";

export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className={s.head}>
      <div className={s.text}>
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.sub}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </header>
  );
}
