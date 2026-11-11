"use client";

// Modal de conciliação da transação de extrato (1:1 ou em grupo), separado de page.js. Mostra os candidatos elegíveis com a razão da sugestão do motor.
import { useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Select from "@/components/atoms/Select/Select";
import { formatCalendarDay } from "@/lib/finance/extras";
import { formatBRL, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

// Razão da sugestão em português (vem do motor: "Valor igual", "Mesma conta bancária"...).
function reasonSuffix(suggested, entryId) {
  const hit = suggested.find((c) => c.financialEntryId === entryId);
  if (!hit || !Array.isArray(hit.reasons) || hit.reasons.length === 0) return "";
  return ` (${hit.reasons.join(", ").toLowerCase()})`;
}

export default function ReconcileModal({ transaction, candidates, matchClass, suggested = [], onClose, onConfirm, groupEntries = [], onConfirmGroup }) {
  const [entryId, setEntryId] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [picked, setPicked] = useState([]);
  const toCents = (v) => Math.round(Math.abs(Number(v) || 0) * 100);
  const pickedCents = groupEntries.filter((e) => picked.includes(e.id)).reduce((acc, e) => acc + toCents(e.amount), 0);
  const targetCents = transaction ? toCents(transaction.amount) : 0;
  const groupMatches = picked.length >= 2 && pickedCents === targetCents;

  if (!transaction) return null;

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      title="Conciliar transação"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          {groupMode ? (
            <Button onClick={() => groupMatches && onConfirmGroup && onConfirmGroup(picked)} disabled={!groupMatches}>Conciliar em grupo</Button>
          ) : (
            <Button onClick={() => entryId && onConfirm(entryId)} disabled={!entryId}>Conciliar</Button>
          )}
        </>
      }
    >
      <p className={styles.modalIntro}>
        {humanizeText(transaction.description)} — {formatBRL(transaction.amount)} em {formatCalendarDay(transaction.transactionDate)}
      </p>
      {matchClass === "AMBIGUOUS" ? (
        <Alert tone="warning" className={styles.notice}>
          Mais de um lançamento combina com esta transação com a mesma força. Quando há dúvida, a
          conciliação nunca é automática: confira os dados abaixo e escolha o lançamento correto.
        </Alert>
      ) : null}
      {groupMode ? (
        <div>
          <p className={styles.modalIntro}>
            Marque dois ou mais lançamentos cuja soma bata exatamente com a transação. Soma marcada: {formatBRL(pickedCents / 100)} de {formatBRL(targetCents / 100)}.
          </p>
          {groupEntries.length === 0 ? (
            <Alert tone="warning" title="Nenhum lançamento em aberto">Não há lançamentos sem conciliação para esta conta.</Alert>
          ) : (
            groupEntries.map((e) => (
              <label key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                <input
                  type="checkbox"
                  checked={picked.includes(e.id)}
                  onChange={(ev) => setPicked((prev) => (ev.target.checked ? [...prev, e.id] : prev.filter((x) => x !== e.id)))}
                />
                <span>{humanizeText(e.description)} — {formatBRL(e.amount)}</span>
              </label>
            ))
          )}
          {picked.length >= 2 && !groupMatches ? (
            <Alert tone="warning">A soma marcada ainda não bate com a transação. A conciliação em grupo só é aceita quando bate no centavo.</Alert>
          ) : null}
          <Button variant="secondary" onClick={() => { setGroupMode(false); setPicked([]); }}>Voltar para conciliação de um lançamento</Button>
        </div>
      ) : candidates.length === 0 ? (
        <Alert tone="warning" title="Nenhum lançamento com valor compatível">
          Nenhum lançamento sozinho tem o valor desta transação.{" "}
          <Button variant="secondary" onClick={() => setGroupMode(true)}>Conciliar vários lançamentos juntos</Button>
        </Alert>
      ) : (
        <Select value={entryId} onChange={(e) => setEntryId(e.target.value)}>
          <option value="">Selecione o lançamento...</option>
          {candidates.map((e) => (
            <option key={e.id} value={e.id}>{humanizeText(e.description)} — {formatBRL(e.amount)}{reasonSuffix(suggested, e.id)}</option>
          ))}
        </Select>
      )}
      {!groupMode && candidates.length > 0 ? (
        <p className={styles.modalIntro}>
          <Button variant="secondary" onClick={() => setGroupMode(true)}>Conciliar vários lançamentos juntos</Button>
        </p>
      ) : null}
    </Modal>
  );
}
