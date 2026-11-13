"use client";

import Badge from "@/components/atoms/Badge/Badge";
import { formatBRL, formatDateTime } from "@/lib/format";
import styles from "./PropertyFilesPanel.module.css";

const TYPE = { SALE: "Venda", RENT: "Locação", SEASONAL: "Temporada" };
const STATUS = { SUPERSEDED: "Substituída", PAUSED: "Pausada", CLOSED: "Encerrada" };

// Ofertas que não estão ativas (Marco 3, M3-07): a substituída mostra qual oferta a substituiu e quando — a substituição é
// controlada e auditada na API; a oferta substituída não volta a valer.
export default function OfferHistoryList({ offers = [] }) {
  const old = offers.filter((o) => o.status !== "ACTIVE");
  if (old.length === 0) return null;
  const byId = Object.fromEntries(offers.map((o) => [o.id, o]));
  return (
    <ul className={styles.list} aria-label="Ofertas anteriores">
      {old.map((o) => {
        const by = o.supersededByOfferId ? byId[o.supersededByOfferId] : null;
        return (
          <li className={styles.item} key={o.id}>
            <div className={styles.info}>
              <span className={styles.name}>{TYPE[o.offerType] || o.offerType} · {formatBRL(o.askingPrice)}</span>
              <span className={styles.meta}>
                <Badge tone="neutral">{STATUS[o.status] || o.status}</Badge>
                {o.status === "SUPERSEDED" ? ` substituída ${by ? `pela oferta de ${formatBRL(by.askingPrice)}` : "por outra oferta"}${o.supersededAt ? ` em ${formatDateTime(o.supersededAt)}` : ""}` : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
