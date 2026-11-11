"use client";

// Aba "Aluguel garantido" da Locação (extraída de page.js no fechamento do M5 — arquivo ≤400 linhas): obrigação da
// empresa ao proprietário + crédito a recuperar do locatário. POST com Idempotency-Key (lib/api/billing.js).
import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Modal from "@/components/organisms/Modal/Modal";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { enrollGuaranteedRent, payGuaranteedRent } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDate, formatContractLabel, toNumber } from "@/lib/format";
import styles from "./page.module.css";

const GUARANTEED_RENT_STATUS_TONE = { ACTIVE: "success", SUSPENDED: "warning", CANCELLED: "neutral" };
const GUARANTEED_RENT_STATUS_LABEL = { ACTIVE: "Ativo", SUSPENDED: "Suspenso", CANCELLED: "Cancelado" };

export default function GuaranteedRentTab({ guaranteedRents, leaseContracts, onChanged, onError }) {
  const load = onChanged;
  const setActionError = onError;
  const [guaranteedOpen, setGuaranteedOpen] = useState(false);
  const [guaranteedForm, setGuaranteedForm] = useState({ contractId: "", coverageStartsAt: "" });
  const [guaranteedPayTarget, setGuaranteedPayTarget] = useState(null);
  const [guaranteedPayAmount, setGuaranteedPayAmount] = useState("");

  async function handleEnrollGuaranteed() {
    setActionError("");
    try {
      await enrollGuaranteedRent({ contractId: guaranteedForm.contractId, coverageStartsAt: guaranteedForm.coverageStartsAt });
      setGuaranteedOpen(false);
      setGuaranteedForm({ contractId: "", coverageStartsAt: "" });
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao matricular aluguel garantido."));
    }
  }

  async function handleGuaranteedPay() {
    setActionError("");
    try {
      await payGuaranteedRent(guaranteedPayTarget.id, { amount: toNumber(guaranteedPayAmount) });
      setGuaranteedPayTarget(null);
      setGuaranteedPayAmount("");
      load();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao pagar repasse de aluguel garantido."));
    }
  }

  const guaranteedRentColumns = [
    { key: "contractId", label: "Contrato", render: (row) => formatContractLabel(leaseContracts.find((c) => c.id === row.contractId)) || row.contractId.slice(0, 8) },
    { key: "coverageStartsAt", label: "Cobertura desde", render: (row) => formatDate(row.coverageStartsAt) },
    { key: "status", label: "Status", render: (row) => <Badge tone={GUARANTEED_RENT_STATUS_TONE[row.status] || "neutral"}>{GUARANTEED_RENT_STATUS_LABEL[row.status] || row.status}</Badge> },
    {
      key: "actions",
      label: "Ações",
      render: (row) => (
        row.status === "ACTIVE" ? (
          <Button variant="secondary" size="sm" onClick={() => { setGuaranteedPayTarget(row); setGuaranteedPayAmount(""); }}>
            Pagar repasse
          </Button>
        ) : "Nenhuma ação (contrato não ativo)"
      ),
    },
  ];

  return (
    <>
                <Card title="Aluguel garantido" subtitle="Obrigação da empresa ao proprietário + crédito a recuperar do locatário">
                  <div className={styles.toolbarRow}>
                    <Button onClick={() => setGuaranteedOpen(true)}>Matricular contrato</Button>
                  </div>
                  <Table columns={guaranteedRentColumns} rows={guaranteedRents} emptyMessage="Nenhum contrato matriculado em aluguel garantido." />
                </Card>
      <Modal
        open={guaranteedOpen}
        onClose={() => setGuaranteedOpen(false)}
        title="Matricular contrato em aluguel garantido"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGuaranteedOpen(false)}>Cancelar</Button>
            <Button onClick={handleEnrollGuaranteed} disabled={!guaranteedForm.contractId || !guaranteedForm.coverageStartsAt}>Matricular</Button>
          </>
        }
      >
        <FormField label="Contrato" required>
          <Select value={guaranteedForm.contractId} onChange={(e) => setGuaranteedForm((f) => ({ ...f, contractId: e.target.value }))}>
            <option value="">Selecione...</option>
            {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
          </Select>
        </FormField>
        <FormField label="Início da cobertura" required>
          <Input type="date" value={guaranteedForm.coverageStartsAt} onChange={(e) => setGuaranteedForm((f) => ({ ...f, coverageStartsAt: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={Boolean(guaranteedPayTarget)}
        onClose={() => setGuaranteedPayTarget(null)}
        title="Pagar repasse ao proprietário"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGuaranteedPayTarget(null)}>Cancelar</Button>
            <Button onClick={handleGuaranteedPay} disabled={!guaranteedPayAmount}>Registrar</Button>
          </>
        }
      >
        <FormField label="Valor" required>
          <DecimalInput value={guaranteedPayAmount} onChange={(e) => setGuaranteedPayAmount(e.target.value)} />
        </FormField>
      </Modal>
    </>
  );
}
