"use client";

// Seção "Recomendações da NAY para você": as sugestões pendentes dirigidas a quem está logado (lead esquecido, resumo de mensagem,
// proposta de mensagem, próxima ação), 20 por página. "Marcar como vista" só registra que a pessoa viu: não executa nada.
import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Card from "@/components/molecules/Card/Card";
import Pagination from "@/components/molecules/Pagination/Pagination";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { acceptAiRecommendation, listAiRecommendations } from "@/lib/api/ai";
import { formatDateTime } from "@/lib/format";
import { RECOMMENDATIONS_PAGE_SIZE as PAGE_SIZE, nayErrorMessage, recommendationType, totalPagesOf } from "./nayComercial.format.js";
import styles from "./page.module.css";

function Recomendacao({ item, onSeen }) {
  const [saving, setSaving] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const isMessage = String(item.recommendationType || "").toUpperCase() === "PROPOSTA_ENVIO_MENSAGEM";

  async function markSeen() {
    setSaving(true);
    setAcceptError("");
    try {
      await acceptAiRecommendation(item.id);
      onSeen();
    } catch (err) {
      setAcceptError(nayErrorMessage(err, { notFound: "Esta recomendação não está mais disponível para você." }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className={styles.row}>
      <div className={styles.rowTop}>
        <div>
          <p className={styles.rowTitle}>{item.title || "Sugestão da NAY"}</p>
          <p className={styles.rowMeta}>{item.createdAt ? `Criada em ${formatDateTime(item.createdAt)}` : "Data de criação não informada"}</p>
        </div>
        <Badge tone="info">{recommendationType(item.recommendationType)}</Badge>
      </div>
      {item.rationale ? <p className={styles.rowText}><strong>Motivo:</strong> {item.rationale}</p> : null}
      {isMessage ? (
        <>
          <p className={styles.rowText}>{item.payload?.texto || "A proposta não trouxe o texto da mensagem."}</p>
          <Alert tone="info" title="Nenhuma mensagem foi enviada">A NAY não envia: envie você pelas mensagens do CRM.</Alert>
        </>
      ) : null}
      {acceptError ? <Alert tone="danger" title="Não foi possível marcar como vista">{acceptError}</Alert> : null}
      <div>
        <Button size="sm" variant="secondary" loading={saving} onClick={markSeen}>Marcar como vista</Button>
      </div>
    </li>
  );
}

export default function RecomendacoesSection() {
  const [page, setPage] = useState(1);
  const query = useAsyncState(() => listAiRecommendations({ status: "PENDING", page, limit: PAGE_SIZE }), { deps: [page] });

  return (
    <Card title="Recomendações da NAY para você" subtitle="Sugestões pendentes dirigidas a você. Marcar como vista não executa nada.">
      <AsyncState result={query} loadingLabel="Carregando recomendações..." emptyTitle="Nenhuma recomendação pendente para você.">
        {(data) => (
          <>
            <ul className={styles.list}>{(data?.items || []).map((item) => <Recomendacao key={item.id} item={item} onSeen={query.reload} />)}</ul>
            <Pagination page={page} totalPages={totalPagesOf({ total: data?.total, limit: data?.limit, page, count: (data?.items || []).length })} onChange={setPage} />
          </>
        )}
      </AsyncState>
      {query.status === UI_STATE.EMPTY && page > 1 ? <Button size="sm" variant="secondary" onClick={() => setPage(1)}>Voltar para a primeira página</Button> : null}
    </Card>
  );
}
