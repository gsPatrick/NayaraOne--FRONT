"use client";

// Classificação do excedente de um recebimento (Caderno M4 §10: "nunca automático"; a decisão é humana). Revisão 18/10/2026 (A3):
// despesa vira obrigação a pagar (PENDING) com centro de custo. Segunda leva (16/11/2026, DI-BI2-6): despesa exige também o vencimento
// (conta a pagar própria, M4 §19) e receita exige o centro de resultado (M4 §4). As regras estão em lib/finance/openEntryRequired.js.
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import { resolveClassificationPending } from "@/lib/api/finance";
import { friendlyFinanceError } from "@/lib/finance/extras";
import { classificationPayload, classificationProblems } from "@/lib/finance/openEntryRequired";
import { formatBRL, humanizeText } from "@/lib/format";

const EMPTY = { finalNature: "", costCenterId: "", resultCenterId: "", dueAt: "" };

export default function ClassifyPendingModal({ target, costCenters, resultCenters, onClose, onResolved }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(EMPTY);
    setError("");
  }, [target]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const problems = form.finalNature ? classificationProblems(form.finalNature, form) : [];

  async function handleConfirm() {
    if (!target || !form.finalNature) return;
    if (problems.length) {
      setError(problems.join(" "));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { finalNature, ...fields } = classificationPayload(form.finalNature, form);
      await resolveClassificationPending(target.id, finalNature, fields);
      onResolved();
    } catch (err) {
      setError(friendlyFinanceError(err, "Não foi possível resolver a pendência."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title="Classificar pendência"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} loading={busy} disabled={!form.finalNature || problems.length > 0}>Confirmar</Button>
        </>
      }
    >
      {target ? (
        <>
          <p>
            {humanizeText(target.description)} — <strong>{formatBRL(target.amount)}</strong>
          </p>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <FormField label="Classificação final" htmlFor="classify-nature">
            <Select id="classify-nature" value={form.finalNature} onChange={set("finalNature")}>
              <option value="">Selecione...</option>
              <option value="RECEIVABLE">Receita (a receber)</option>
              <option value="PAYABLE">Despesa (a pagar)</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </Select>
          </FormField>
          {form.finalNature === "RECEIVABLE" ? (
            <FormField label="Centro de resultado" htmlFor="classify-rc" required helper="Obrigatório para receita (margem por setor).">
              <Select id="classify-rc" value={form.resultCenterId} onChange={set("resultCenterId")}>
                <option value="">Selecione...</option>
                {resultCenters.map((r) => (
                  <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                ))}
              </Select>
            </FormField>
          ) : null}
          {form.finalNature === "PAYABLE" ? (
            <>
              <FormField label="Centro de custo" htmlFor="classify-cc" required>
                <Select id="classify-cc" value={form.costCenterId} onChange={set("costCenterId")}>
                  <option value="">Selecione...</option>
                  {costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Vencimento" htmlFor="classify-due" required helper="Obrigatório: a conta a pagar entra em contas 7/30/60 dias pelo vencimento.">
                <Input id="classify-due" type="date" min="1900-01-01" max="2100-12-31" value={form.dueAt} onChange={set("dueAt")} />
              </FormField>
              <Alert tone="info">
                Vira uma obrigação a pagar (pendente), que segue o fluxo normal de pagamento: aprovação e confirmação do banco ou comprovante.
              </Alert>
            </>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
