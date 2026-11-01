import { formatDateTime } from "@/lib/format";
import styles from "./BiBanner.module.css";

// M9-D697 (reabertura F08/F10) — a linha da faixa de qualidade diz POR QUE o indicador não está confiável (texto pronto do servidor) e quando a fonte foi
// atualizada pela última vez. Sem data, diz que a fonte nunca foi atualizada. Nada é calculado aqui.
export default function BiBannerDetail({ metric }) {
  if (!metric.detail && metric.lastUpdateAt === undefined) return null;
  return (
    <span className={styles.detail} data-bi-banner-detail>
      {metric.detail ? `${metric.detail} ` : ""}
      {metric.lastUpdateAt ? `Última atualização: ${formatDateTime(metric.lastUpdateAt)}.` : "Sem atualização registrada."}
    </span>
  );
}
