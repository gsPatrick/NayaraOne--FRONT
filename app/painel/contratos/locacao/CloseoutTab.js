"use client";

// Aba "Encerramento" da Locação (extraída de page.js no fechamento do M5 — arquivo ≤400 linhas): gate único de
// encerramento (M45-RECONF F1), pendências do servidor em português.
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import { checkCloseoutEligibility, closeoutContract } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

const CLOSEOUT_PENDENCY_LABELS = {
  OPEN_BILLING: "Cobrança em aberto",
  OPEN_COLLECTION_CASE: "Caso de cobrança aberto",
  PENDING_UTILITY_TRANSFER: "Transferência de consumo (água/luz/gás) pendente",
  ACTIVE_GUARANTEE: "Garantia ainda ativa",
  DEPOSIT_BALANCE: "Saldo de caução a devolver",
  OPEN_LEGAL_CASE: "Processo jurídico aberto",
  OPEN_LEGAL_DEADLINE: "Prazo jurídico em aberto",
  OPEN_NOTICE: "Notificação em aberto",
};

export default function CloseoutTab({ leaseContracts, onChanged, onError }) {
  const load = onChanged;
  const setActionError = onError;
  const [closeoutContractId, setCloseoutContractId] = useState("");
  const [closeoutResult, setCloseoutResult] = useState(null);
  const [closeoutBusy, setCloseoutBusy] = useState(false);

  async function handleCheckCloseout() {
    if (!closeoutContractId) return;
    setCloseoutBusy(true);
    setCloseoutResult(null);
    setActionError("");
    try {
      // Gate único (M45-RECONF F1): a API devolve { contractId, eligible, reasons }.
      const result = await checkCloseoutEligibility(closeoutContractId);
      const reasons = Array.isArray(result) ? result : (Array.isArray(result?.reasons) ? result.reasons : []);
      setCloseoutResult({ reasons });
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao checar elegibilidade de encerramento."));
    } finally {
      setCloseoutBusy(false);
    }
  }

  async function handleCloseout() {
    if (!closeoutContractId) return;
    setCloseoutBusy(true);
    setActionError("");
    try {
      await closeoutContract(closeoutContractId);
      setCloseoutResult({ reasons: [], closed: true });
      load();
    } catch (err) {
      if (err?.code === "CLOSEOUT_BLOCKED") {
        setCloseoutResult({ reasons: Array.isArray(err.details?.reasons) ? err.details.reasons : [], closed: false });
      } else {
        setActionError(legalErrorMessage(err, "Erro ao encerrar contrato."));
      }
    } finally {
      setCloseoutBusy(false);
    }
  }

  return (
    <Card title="Encerramento de contrato" subtitle="Bloqueado enquanto houver cobrança em aberto ou transferência de utilidade pendente">
                <Card title="Encerramento de contrato" subtitle="Bloqueado enquanto houver cobrança em aberto ou transferência de utilidade pendente">
                  <div className={styles.form}>
                    <FormField label="Contrato" required>
                      <Select value={closeoutContractId} onChange={(e) => { setCloseoutContractId(e.target.value); setCloseoutResult(null); }}>
                        <option value="">Selecione...</option>
                        {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
                      </Select>
                    </FormField>
                    <div className={styles.toolbarRow}>
                      <Button variant="secondary" onClick={handleCheckCloseout} loading={closeoutBusy} disabled={!closeoutContractId || closeoutBusy}>Checar elegibilidade</Button>
                      <Button onClick={handleCloseout} loading={closeoutBusy} disabled={!closeoutContractId || closeoutBusy}>Encerrar contrato</Button>
                    </div>
                    {closeoutResult?.closed ? (
                      <Alert tone="success">Contrato encerrado com sucesso.</Alert>
                    ) : closeoutResult ? (
                      closeoutResult.reasons.length === 0 ? (
                        <Alert tone="success">Elegível para encerramento — nenhuma pendência crítica.</Alert>
                      ) : (
                        <Alert tone="warning">
                          Bloqueado por {closeoutResult.reasons.length} pendência(s):
                          <ul>{closeoutResult.reasons.map((r, i) => <li key={i}><strong>{CLOSEOUT_PENDENCY_LABELS[r.type] || "Pendência"}:</strong> {r.detail}</li>)}</ul>
                        </Alert>
                      )
                    ) : null}
                  </div>
                </Card>
    </Card>
  );
}
