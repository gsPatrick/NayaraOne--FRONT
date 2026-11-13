"use client";

// Comparação pela NAY (Caderno M5 §11): a resposta com as fontes citadas e cada sugestão para uma pessoa aceitar ou rejeitar
// (POST /v1/ai/recommendations/:id/accept|reject). Aceitar não cobra nada nem muda a vistoria — responsabilidade e cobrança são
// decididas por uma pessoa. Com a NAY desligada, a tela mostra só as diferenças item a item.
import { useState } from "react";
import Alert from "@/components/molecules/Alert/Alert";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
import { acceptAiRecommendation, rejectAiRecommendation } from "@/lib/api/aiRecommendations";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import {
  comparisonRows, decidedStatus, NAY_HUMAN_NOTICE, RECOMMENDATION_STATUS_LABELS, RECOMMENDATION_STATUS_TONE, rejectReasonProblem, sourceText,
} from "@/lib/legal/inspectionNay";
import { CONDITION_LABELS } from "@/lib/labels/juridico";
import { splitItemName } from "@/lib/legal/inspectionCodes";
import styles from "./page.module.css";

const conditionText = (code) => (code ? CONDITION_LABELS[code] || "Estado não informado" : "Item ausente");

function Divergences({ comparison }) {
  const changed = comparisonRows(comparison).filter((r) => r.changed);
  if (changed.length === 0) return <p className={styles.itemNotes}>Nenhuma diferença entre a entrada e a saída.</p>;
  return (
    <ul data-testid="nay-divergences">
      {changed.map((r, idx) => {
        const names = splitItemName(r.itemName);
        return (
          <li key={`${r.roomCode || ""}-${r.itemCode || r.itemName}-${idx}`}>
            {names.room ? `${names.room} — ${names.item}` : names.item}: entrada {conditionText(r.before).toLowerCase()}, saída {conditionText(r.after).toLowerCase()}
          </li>
        );
      })}
    </ul>
  );
}

export default function InspectionNayPanel({ view, onError }) {
  const [statusById, setStatusById] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  if (!view.aiMode) {
    return (
      <div data-testid="nay-comparison">
        <Alert tone="info" title="Comparação item a item">{view.notice}</Alert>
        <Divergences comparison={view.comparison} />
      </div>
    );
  }

  const statusOf = (rec) => statusById[rec.id] || rec.status;

  async function decide(rec, action, rejectReason) {
    onError("");
    setBusyId(rec.id);
    try {
      const out = action === "accept" ? await acceptAiRecommendation(rec.id) : await rejectAiRecommendation(rec.id, rejectReason);
      setStatusById((prev) => ({ ...prev, [rec.id]: decidedStatus(out, action === "accept" ? "ACCEPTED" : "REJECTED") }));
      setRejectTarget(null);
    } catch (err) {
      onError(legalErrorMessage(err, action === "accept" ? "Não foi possível aceitar a sugestão." : "Não foi possível rejeitar a sugestão."));
    } finally {
      setBusyId(null);
    }
  }

  const problem = rejectReasonProblem(reason);
  return (
    <div data-testid="nay-comparison">
      <Alert tone="warning" title="Sugestão da NAY">{NAY_HUMAN_NOTICE}</Alert>
      {view.blocked ? (
        <p className={styles.itemNotes}>A NAY não deu uma resposta com fonte para esta comparação. Confira as diferenças item a item abaixo.</p>
      ) : (
        <p style={{ whiteSpace: "pre-wrap" }}>{view.answer}</p>
      )}
      {view.sources.length > 0 ? (
        <div>
          <strong>Fontes citadas</strong>
          <ul data-testid="nay-sources">
            {view.sources.map((source, idx) => {
              const text = sourceText(source);
              return <li key={`${source.ref || idx}`}>{text.head}{text.excerpt ? `: “${text.excerpt}”` : ""}</li>;
            })}
          </ul>
        </div>
      ) : null}
      {view.recommendations.length > 0 ? (
        <div>
          <strong>Sugestões para validar</strong>
          {view.recommendations.map((rec) => {
            const status = statusOf(rec);
            return (
              <div key={rec.id} className={styles.compareRow} data-testid="nay-recommendation">
                <span className={styles.compareItemName}>{rec.title || "Diferença sugerida pela NAY"}</span>
                {rec.rationale ? <span className={styles.compareItemMeta}>{rec.rationale}</span> : null}
                <span><Badge tone={RECOMMENDATION_STATUS_TONE[status] || "neutral"}>{RECOMMENDATION_STATUS_LABELS[status] || "Situação não informada"}</Badge></span>
                {status === "PENDING" ? (
                  <span className={styles.mediaList}>
                    <Button size="sm" variant="secondary" onClick={() => decide(rec, "accept")} loading={busyId === rec.id} disabled={Boolean(busyId)}>Aceitar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectTarget(rec); setReason(""); setTouched(false); }} disabled={Boolean(busyId)}>Rejeitar</Button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => busyId || setRejectTarget(null)}
        title="Rejeitar sugestão da NAY"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)} disabled={Boolean(busyId)}>Cancelar</Button>
            <Button variant="danger" onClick={() => decide(rejectTarget, "reject", reason.trim())} loading={Boolean(busyId)} disabled={Boolean(busyId) || Boolean(problem)}>Rejeitar</Button>
          </>
        }
      >
        <p>{rejectTarget?.title || "Diferença sugerida pela NAY"}</p>
        <FormField label="Motivo da rejeição" htmlFor="f-nay-reject-reason" required helper="Entre 5 e 500 caracteres. Fica registrado na decisão." error={touched && problem ? problem : undefined}>
          <textarea
            id="f-nay-reject-reason"
            rows={4}
            maxLength={500}
            style={{ width: "100%" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
          />
        </FormField>
      </Modal>
    </div>
  );
}
