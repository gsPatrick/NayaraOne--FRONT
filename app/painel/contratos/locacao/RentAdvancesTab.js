"use client";

// Aba "Antecipação" da Locação (extraída de page.js no fechamento do M5 — arquivo ≤400 linhas). Produto separado:
// principal e custo ficam separados no Financeiro; cada POST da cobrança leva Idempotency-Key (lib/api/billing.js).
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Modal from "@/components/organisms/Modal/Modal";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { requestRentAdvance, proposeRentAdvance, acceptRentAdvance, payRentAdvance, recoverRentAdvance } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatBRL, formatContractLabel, toNumber } from "@/lib/format";
import styles from "./page.module.css";

import { RENT_ADVANCE_STATUS_TONE, rentAdvanceAction, rentAdvanceStatusLabel } from "@/lib/legal/rentAdvanceStatus";

export default function RentAdvancesTab({ rentAdvances, leaseContracts, onChanged, onError }) {
  const load = onChanged;
  const setActionError = onError;
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({ contractId: "", monthsAdvanced: "", principalAmount: "", costAmount: "" });
  const [recoverTarget, setRecoverTarget] = useState(null);
  const [recoverAmount, setRecoverAmount] = useState("");

  async function handleRequestAdvance() {
    setActionError("");
    try {
      await requestRentAdvance({
        contractId: advanceForm.contractId,
        monthsAdvanced: toNumber(advanceForm.monthsAdvanced),
        principalAmount: toNumber(advanceForm.principalAmount),
        costAmount: advanceForm.costAmount ? toNumber(advanceForm.costAmount) : undefined,
      });
      setAdvanceOpen(false);
      setAdvanceForm({ contractId: "", monthsAdvanced: "", principalAmount: "", costAmount: "" });
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao solicitar antecipação de aluguel."));
    }
  }

  async function handleAdvanceTransition(id, fn) {
    setActionError("");
    try {
      await fn(id);
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao atualizar antecipação de aluguel."));
    }
  }

  async function handleRecoverAdvance() {
    setActionError("");
    try {
      await recoverRentAdvance(recoverTarget.id, toNumber(recoverAmount));
      setRecoverTarget(null);
      setRecoverAmount("");
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao registrar recuperação da antecipação."));
    }
  }

  const rentAdvanceColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "monthsAdvanced", label: "Meses", render: (row) => row.monthsAdvanced },
    { key: "principalAmount", label: "Principal", render: (row) => formatBRL(row.principalAmount) },
    { key: "status", label: "Status", render: (row) => <Badge tone={RENT_ADVANCE_STATUS_TONE[row.status] || "neutral"}>{rentAdvanceStatusLabel(row.status)}</Badge> },
    {
      key: "actions",
      label: "Ações",
      render: (row) => {
        // UAT M5 C12: a ação segue o estado que a API devolve (nasce em ELIGIBILITY_PENDING), lib/legal/rentAdvanceStatus.js.
        const action = rentAdvanceAction(row.status);
        if (action.text) return action.text;
        if (action.kind === "recover") return <Button variant="secondary" size="sm" onClick={() => { setRecoverTarget(row); setRecoverAmount(""); }}>{action.label}</Button>;
        const call = { propose: proposeRentAdvance, accept: acceptRentAdvance, pay: payRentAdvance }[action.kind];
        return <Button variant="secondary" size="sm" onClick={() => handleAdvanceTransition(row.id, call)}>{action.label}</Button>;
      },
    },
  ];

  return (
    <>
      <Card title="Antecipação de aluguel" subtitle="Produto separado — principal e custo ficam separados no Financeiro">
                <Card title="Antecipação de aluguel" subtitle="Produto separado — principal e custo ficam separados no Financeiro">
        <div className={styles.toolbarRow}>
          <Button onClick={() => setAdvanceOpen(true)}>Solicitar antecipação</Button>
        </div>
        <Table columns={rentAdvanceColumns} rows={rentAdvances} emptyMessage="Nenhuma antecipação solicitada ainda." />
                </Card>
      </Card>
      <Modal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        title="Solicitar antecipação de aluguel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdvanceOpen(false)}>Cancelar</Button>
            <Button onClick={handleRequestAdvance} disabled={!advanceForm.contractId || !advanceForm.monthsAdvanced || !advanceForm.principalAmount}>Solicitar</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={advanceForm.contractId} onChange={(e) => setAdvanceForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Meses antecipados" required>
          <DecimalInput value={advanceForm.monthsAdvanced} onChange={(e) => setAdvanceForm((f) => ({ ...f, monthsAdvanced: e.target.value }))} />
        </FormField>
        <FormField label="Valor principal" required>
          <DecimalInput value={advanceForm.principalAmount} onChange={(e) => setAdvanceForm((f) => ({ ...f, principalAmount: e.target.value }))} />
        </FormField>
        <FormField label="Custo da operação" helper="Opcional — fica separado do principal no Financeiro.">
          <DecimalInput value={advanceForm.costAmount} onChange={(e) => setAdvanceForm((f) => ({ ...f, costAmount: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(recoverTarget)}
        onClose={() => setRecoverTarget(null)}
        title="Registrar recuperação de antecipação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecoverTarget(null)}>Cancelar</Button>
            <Button onClick={handleRecoverAdvance} disabled={!recoverAmount}>Registrar</Button>
          </>
        }
      >
        <FormField label="Valor recuperado do locatário" required>
          <DecimalInput value={recoverAmount} onChange={(e) => setRecoverAmount(e.target.value)} />
        </FormField>
      </Modal>
    </>
  );
}
