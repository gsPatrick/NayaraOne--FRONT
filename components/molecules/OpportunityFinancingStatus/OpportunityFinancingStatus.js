import Link from "next/link";
import Badge from "@/components/atoms/Badge/Badge";
import { formatDateTime } from "@/lib/format";
import { financingSnapshotView } from "@/lib/crm/financingSnapshot";
import styles from "./OpportunityFinancingStatus.module.css";

// CAD-09 (Marco 3 §9): status do financiamento vinculado à oportunidade, atualizado pela API por evento do Correspondente.
// Mostra só o status e a data (nenhum dado bancário chega ao CRM); o detalhe do caso fica na tela do Correspondente.
export default function OpportunityFinancingStatus({ opportunity }) {
  const view = financingSnapshotView(opportunity);
  return (
    <div className={styles.box}>
      <p className={styles.title}>Financiamento</p>
      {view ? (
        <div className={styles.row}>
          <Badge tone={view.tone}>{view.label}</Badge>
          <span className={styles.meta}>Atualizado em {formatDateTime(view.at)}</span>
          {view.caseHref ? (
            <Link className={styles.link} href={view.caseHref}>Abrir caso no Correspondente</Link>
          ) : null}
        </div>
      ) : (
        <p className={styles.meta}>Nenhum financiamento vinculado a esta oportunidade.</p>
      )}
    </div>
  );
}
