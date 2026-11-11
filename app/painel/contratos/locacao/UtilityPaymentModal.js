"use client";

// Pagamento de um vencimento da obrigação da locação (Caderno M5 §12 "comprovante e status"): o pagamento é de UM vencimento (ciclo)
// e exige o comprovante. Com vencimento em aberto, escolhe-se qual está sendo pago; sem nenhum, informa-se a data do vencimento.
// Vencimento já pago ou dispensado não recebe outro pagamento (a API recusa). Pago por quem não é o responsável, gera reembolso.
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { uploadFile } from "@/lib/api/legal";
import { listUtilityObligationCycles, recordUtilityPayment } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CYCLE_STATUS_LABELS, openCycles, PAID_BY_LABELS, paymentPayload, paymentProblems } from "@/lib/legal/obligationCycles";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const EMPTY_PROOF = { fileId: "", fileName: "" };

export default function UtilityPaymentModal({ obligation, initialCycleId, onClose, onPaid, onError }) {
  const open = Boolean(obligation);
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("TENANT");
  const [cycleId, setCycleId] = useState("");
  const [referenceDueOn, setReferenceDueOn] = useState("");
  const [proof, setProof] = useState(EMPTY_PROOF);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const cyclesQuery = useAsyncState(() => listUtilityObligationCycles(obligation.id), { deps: [obligation?.id], enabled: open, isEmpty: () => false });
  const pending = openCycles(Array.isArray(cyclesQuery.data) ? cyclesQuery.data : []);

  useEffect(() => {
    if (!obligation) return;
    setAmount("");
    setPaidBy(obligation.responsibleParty || "TENANT");
    setReferenceDueOn("");
    setProof(EMPTY_PROOF);
    setCycleId(initialCycleId || "");
  }, [obligation, initialCycleId]);

  useEffect(() => {
    // Sem escolha válida, o vencimento mais antigo em aberto vem escolhido.
    const list = openCycles(Array.isArray(cyclesQuery.data) ? cyclesQuery.data : []);
    if (list.length > 0 && !list.some((c) => c.id === cycleId)) setCycleId(list[0].id);
  }, [cyclesQuery.data, cycleId]);

  const problems = paymentProblems({ amount, proofFileId: proof.fileId, cycleId, referenceDueOn, hasOpenCycles: pending.length > 0 });

  async function handleUpload(file) {
    if (!file) return;
    onError("");
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      setProof({ fileId: uploaded.id, fileName: file.name });
    } catch (err) {
      onError(legalErrorMessage(err, "Erro ao enviar o comprovante."));
    } finally {
      setUploading(false);
    }
  }

  async function handlePay() {
    if (problems.length > 0) return;
    onError("");
    setBusy(true);
    try {
      await recordUtilityPayment(obligation.id, paymentPayload({ amount, paidByParty: paidBy, proofFileId: proof.fileId, cycleId: pending.length > 0 ? cycleId : "", referenceDueOn }));
      onPaid();
    } catch (err) {
      onError(legalErrorMessage(err, "Erro ao registrar pagamento da obrigação."));
      if (err?.code === "UTILITY_CYCLE_ALREADY_SETTLED") cyclesQuery.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Registrar pagamento de obrigação"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handlePay} loading={busy} disabled={busy || uploading || problems.length > 0}>Registrar</Button>
        </>
      }
    >
      <AsyncState result={cyclesQuery} loadingLabel="Carregando vencimentos da obrigação...">
        {pending.length > 0 ? (
          <FormField label="Vencimento pago" htmlFor="utility-pay-cycle" required>
            <Select id="utility-pay-cycle" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              {pending.map((c) => (
                <option key={c.id} value={c.id}>{formatDate(c.dueOn)} — {CYCLE_STATUS_LABELS[c.status]}</option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label="Data do vencimento pago" htmlFor="utility-pay-due" required helper="Esta obrigação não tem vencimento em aberto: informe a data do vencimento que está sendo pago.">
            <Input id="utility-pay-due" type="date" min="1900-01-01" max="2100-12-31" value={referenceDueOn} onChange={(e) => setReferenceDueOn(e.target.value)} />
          </FormField>
        )}
      </AsyncState>
      <FormField label="Quem pagou" htmlFor="utility-pay-by" helper="Se não for o responsável pela obrigação, o sistema gera o reembolso a receber do responsável.">
        <Select id="utility-pay-by" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {Object.entries(PAID_BY_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </Select>
      </FormField>
      <FormField label="Valor" htmlFor="utility-pay-amount" required>
        <DecimalInput id="utility-pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 150,90" />
      </FormField>
      <FormField label="Comprovante do pagamento" required helper="Obrigatório: sem comprovante o vencimento não é dado como pago. Cada comprovante vale para um vencimento só.">
        <FileDropInput
          id="utility-pay-proof"
          accept="image/*,application/pdf"
          uploading={uploading}
          fileNames={proof.fileName ? [proof.fileName] : []}
          onFiles={(files) => handleUpload(files[0])}
          onRemove={() => setProof(EMPTY_PROOF)}
        />
      </FormField>
      {problems.length > 0 ? <ul className={styles.helper}>{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
    </Modal>
  );
}
