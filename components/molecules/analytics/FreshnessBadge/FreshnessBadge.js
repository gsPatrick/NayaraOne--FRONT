import { freshnessDisplay } from "@/lib/analytics/freshness";
import styles from "./FreshnessBadge.module.css";

// M9-D609 — selo de atualização de todo número do BI. Recebe a métrica como a API devolve ({ value, status, freshness }) e mostra o rótulo
// escrito pelo servidor ("Atualizado às 14:05", "Desatualizado há 3 h", "Dado antigo, não use para decidir"). A cor nunca é a única
// informação: o texto sempre aparece, e o estado vai também para leitores de tela.
export default function FreshnessBadge({ metric }) {
  const { tone, text } = freshnessDisplay(metric);
  const state = metric && metric.freshness ? metric.freshness.state : "UNKNOWN";
  return (
    <span className={[styles.badge, styles[tone]].join(" ")} data-freshness-state={state} role={tone === "ok" ? undefined : "status"}>
      {text}
    </span>
  );
}
