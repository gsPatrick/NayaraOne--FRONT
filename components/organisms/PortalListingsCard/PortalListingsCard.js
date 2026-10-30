"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import { listPortalListings, publishToPortals, unpublishFromPortals } from "@/lib/api/portalListings";
import styles from "./PortalListingsCard.module.css";

const STATUS_LABELS = {
  PENDING_SYNC: "Aguardando envio",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicado",
  REJECTED: "Reprovado",
  UNPUBLISHING: "Removendo",
  UNPUBLISHED: "Removido",
  ERROR: "Com erro",
};
const STATUS_TONES = { PUBLISHED: "success", PUBLISHING: "warning", UNPUBLISHING: "warning", REJECTED: "danger", ERROR: "danger", UNPUBLISHED: "neutral", PENDING_SYNC: "neutral" };

// Cada portal é independente: o estado, o motivo e a remoção aguardando confirmação aparecem por portal (nunca um erro geral).
export default function PortalListingsCard({ propertyId }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await listPortalListings(propertyId));
      setError("");
    } catch (err) {
      setError(err?.message || "Não foi possível carregar os anúncios nos portais.");
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  async function run(action, okText) {
    setBusy(true);
    setNotice("");
    try {
      await action(propertyId);
      setNotice(okText);
      await load();
    } catch (err) {
      setError(err?.message || "A operação não pôde ser concluída.");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items || [];
  return (
    <Card
      title="Anúncios nos portais"
      subtitle={data ? `${data.published} de ${data.total} portais publicados` : undefined}
      actions={(
        <div className={styles.actions}>
          <Button requires="properties:update" size="sm" loading={busy} onClick={() => run(publishToPortals, "Publicação iniciada: acompanhe o status de cada portal.")}>Publicar nos portais</Button>
          <Button requires="properties:update" size="sm" variant="secondary" loading={busy} onClick={() => run(unpublishFromPortals, "Remoção iniciada: acompanhe o status de cada portal.")}>Despublicar</Button>
        </div>
      )}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {data && items.length === 0 ? <p className={styles.empty}>Nenhum portal contratado. Cadastre a integração em Integrações.</p> : null}
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.connectionId} className={styles.row}>
            <div>
              <strong>{item.providerCode}</strong>
              {item.externalListingId ? <span className={styles.meta}> · anúncio {item.externalListingId}</span> : null}
              {item.statusMessage ? <p className={styles.meta}>{item.statusMessage}</p> : null}
              {item.rejectionReason ? <p className={styles.meta}>Motivo: {item.rejectionReason}</p> : null}
              {item.lastError ? <p className={styles.meta}>{item.lastError}</p> : null}
            </div>
            <Badge tone={STATUS_TONES[item.status] || "neutral"}>{item.status ? STATUS_LABELS[item.status] || item.status : "Não publicado"}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
