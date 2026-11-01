import Alert from "@/components/molecules/Alert/Alert";
import { metricTitle } from "@/lib/analytics/ptLabels";
import BiBannerDetail from "./BiBannerDetail";
import styles from "./BiBanner.module.css";

// M9-D634/M9-D697 — faixa de qualidade: o primeiro bloco de todo painel de BI. Lista, antes dos números, os indicadores que não estão confiáveis
// (dado incompleto, desatualizado ou antigo). Tudo vem pronto do servidor; sem aviso, mostra só a confirmação.
export default function BiBanner({ widget }) {
  const banner = widget.banner;
  if (!banner) return null;
  if (!banner.visible) {
    return <p className={styles.ok} data-bi-banner="ok">{banner.message}</p>;
  }
  return (
    <div className={styles.wrap} data-bi-banner="attention">
      <Alert tone="warning" title="Qualidade dos dados">{banner.message}</Alert>
      <ul className={styles.list}>
        {banner.degradedMetrics.map((m) => (
          <li key={m.metricCode} className={styles.item}>
            <strong title={m.metricCode}>{metricTitle(m.metricCode, m.title)}</strong>
            <span className={styles.reason}>{m.reason}</span>
            <BiBannerDetail metric={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}
