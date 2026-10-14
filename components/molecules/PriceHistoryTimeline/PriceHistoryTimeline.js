import { formatBRL, formatDate } from "@/lib/format";
import styles from "./PriceHistoryTimeline.module.css";

// BUG REAL CORRIGIDO (auditoria Claude Browser, rodada 3, 13/10/2026, §3): código técnico
// cru ("OFFER_CREATED") aparecendo no histórico de preço do imóvel. Traduz os códigos reais
// emitidos pelo backend (propertyOffers.service.js/propertyPriceHistory.service.js); qualquer
// código novo/desconhecido cai num fallback legível em vez de mostrar a constante crua.
const REASON_LABELS = {
  OFFER_CREATED: "Oferta criada",
  PRICE_UPDATE: "Preço atualizado",
};

function reasonLabel(reason) {
  if (!reason) return "";
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  return String(reason)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

export default function PriceHistoryTimeline({ entries = [] }) {
  return (
    <ol className={styles.list}>
      {entries.map((entry, i) => (
        <li key={entry.id} className={styles.item}>
          <div className={styles.rail}>
            <span className={styles.dot} aria-hidden="true" />
            {i < entries.length - 1 ? <span className={styles.line} aria-hidden="true" /> : null}
          </div>
          <div className={styles.content}>
            <div className={styles.top}>
              <span className={styles.price}>{formatBRL(entry.price)}</span>
              <span className={styles.date}>{formatDate(entry.recordedAt)}</span>
            </div>
            <p className={styles.reason}>{reasonLabel(entry.reason)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
