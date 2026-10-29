import Link from "next/link";
import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge";
import styles from "./CommandCenter.module.css";

const SEVERITY_TEXT = { CRITICAL: "Crítico", WARNING: "Atenção", INFO: "Informativo" };

// M9-D685 — um item do Centro de Comando. Tudo vem pronto do servidor (título, texto, valor formatado, severidade, link). A cor nunca é a única informação: a
// severidade sempre aparece escrita. Item de indicador traz o selo de atualização (M9-D609); o dinheiro parado e perdido lista os componentes e a natureza de cada um.
export default function CommandItem({ item, projects = {} }) {
  const components = item.components || [];
  const projectName = item.projectId ? projects[item.projectId] : null;
  const title = projectName ? item.title.replace(`Obra ${item.projectId.slice(0, 8)}`, projectName) : item.title;
  return (
    <li className={[styles.item, item.highlight ? styles.highlight : ""].filter(Boolean).join(" ")} data-command-item={item.type} data-command-source={item.source?.metricCode || item.source?.alertId || ""}>
      <div className={styles.itemHead}>
        <span className={[styles.severity, styles[item.severity]].join(" ")}>{SEVERITY_TEXT[item.severity] || item.severity}</span>
        <span className={styles.itemTitle}>{title}</span>
        {item.overdue ? <span className={styles.severity + " " + styles.CRITICAL}>Vencido</span> : null}
        {item.aged ? <span className={styles.severity + " " + styles.WARNING}>Envelhecido</span> : null}
      </div>
      {item.detail ? <p className={styles.itemDetail}>{item.detail}</p> : null}
      {components.length ? (
        <ul className={styles.components}>
          {components.map((c) => (
            <li key={c.metricCode} className={styles.component}>
              <span>{c.label}{c.apart ? <span className={styles.apart}> (dinheiro de terceiros, à parte)</span> : null}{c.highlight ? <span className={styles.apart}> — parado além do prazo de alerta</span> : null}</span>
              <span>{c.formatted} <span className={styles.itemDetail}>{c.valueNatureLabel}</span></span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.itemFoot}>
        {item.formatted ? <span className={styles.value}>{item.formatted}</span> : null}
        {item.metric ? <FreshnessBadge metric={item.metric} /> : null}
        {item.link?.href ? <Link className={styles.link} href={item.link.href}>Ver no painel de origem</Link> : null}
      </div>
    </li>
  );
}
