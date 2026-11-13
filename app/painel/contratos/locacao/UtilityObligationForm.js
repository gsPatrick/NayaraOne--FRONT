"use client";

// Nova obrigação da locação (Caderno M5 §12): responsável, periodicidade (vazio = padrão da empresa por tipo: IPTU e
// SPU anuais, as demais mensais) e dia do vencimento (1 a 31). O início e o próximo vencimento são calculados quando
// as chaves são entregues.
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import { createUtilityObligation } from "@/lib/api/billing";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { OBLIGATION_PERIODICITY_LABELS } from "@/lib/labels/juridico";
import { formatContractLabel } from "@/lib/format";

export const UTILITY_TYPE_LABELS = { WATER: "Água", ELECTRICITY: "Energia", GAS: "Gás", CONDO: "Condomínio", IPTU: "IPTU", SPU: "SPU", OTHER: "Outra" };

const EMPTY = { contractId: "", utilityType: "WATER", responsibleParty: "TENANT", provider: "", periodicity: "", dueDay: "", transferRequired: false, transferToPersonId: null, transferToName: "" };

/** Dia do vencimento: vazio ou inteiro de 1 a 31. */
export function parseDueDay(value) {
  const text = String(value || "").trim();
  if (!text) return { ok: true, value: undefined };
  if (!/^\d{1,2}$/.test(text)) return { ok: false };
  const n = Number.parseInt(text, 10);
  return n >= 1 && n <= 31 ? { ok: true, value: n } : { ok: false };
}

export default function UtilityObligationForm({ open, leaseContracts, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dueDay = parseDueDay(form.dueDay);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const defaultHint = form.utilityType === "IPTU" || form.utilityType === "SPU" ? "anual" : "mensal";

  async function handleCreate() {
    if (!form.contractId || !dueDay.ok) return;
    setError("");
    setBusy(true);
    try {
      await createUtilityObligation({
        contractId: form.contractId,
        utilityType: form.utilityType,
        responsibleParty: form.responsibleParty,
        provider: form.provider || undefined,
        periodicity: form.periodicity || undefined,
        dueDay: dueDay.value,
        transferRequired: form.transferRequired,
        transferToPersonId: form.transferRequired ? form.transferToPersonId || undefined : undefined,
      });
      setForm(EMPTY);
      onCreated();
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao criar obrigação."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova obrigação locatícia"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleCreate} loading={busy} disabled={busy || !form.contractId || !dueDay.ok}>Criar</Button>
        </>
      }
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <FormField label="Contrato" htmlFor="f-utility-contract" required>
        <Select id="f-utility-contract" value={form.contractId} onChange={set("contractId")}>
          <option value="">Selecione...</option>
          {leaseContracts.map((c) => <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>)}
        </Select>
      </FormField>
      <FormField label="Tipo" htmlFor="f-utility-type">
        <Select id="f-utility-type" value={form.utilityType} onChange={set("utilityType")}>
          {Object.entries(UTILITY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField label="Parte responsável" htmlFor="f-utility-responsible">
        <Select id="f-utility-responsible" value={form.responsibleParty} onChange={set("responsibleParty")}>
          <option value="TENANT">Locatário</option>
          <option value="LANDLORD">Locador</option>
        </Select>
      </FormField>
      <FormField label="Periodicidade" htmlFor="f-utility-periodicity" helper={`Vazio = padrão da empresa para o tipo (hoje: ${defaultHint}; IPTU e SPU anuais, as demais mensais).`}>
        <Select id="f-utility-periodicity" value={form.periodicity} onChange={set("periodicity")}>
          <option value="">Padrão da empresa</option>
          {Object.entries(OBLIGATION_PERIODICITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField
        label="Dia do vencimento"
        htmlFor="f-utility-due-day"
        helper={dueDay.ok ? "Opcional, de 1 a 31. Sem dia, vale o dia da entrega das chaves." : undefined}
        error={dueDay.ok ? undefined : "Informe um dia de 1 a 31."}
      >
        <Input id="f-utility-due-day" inputMode="numeric" maxLength={2} value={form.dueDay} onChange={set("dueDay")} placeholder="Ex.: 10" />
      </FormField>
      <FormField label="Fornecedor" htmlFor="f-utility-provider" helper="Opcional">
        <Input id="f-utility-provider" value={form.provider} onChange={set("provider")} />
      </FormField>
      <FormField label="Titularidade" helper="Marque quando a conta precisa mudar de titular. O contrato só encerra depois do comprovante.">
        <Checkbox
          id="utility-transfer-required"
          label="Exige transferência de titularidade"
          checked={form.transferRequired}
          onChange={(e) => setForm((f) => ({ ...f, transferRequired: e.target.checked }))}
        />
      </FormField>
      {form.transferRequired ? (
        <FormField label="Novo titular" helper="Opcional agora; é obrigatório para concluir a transferência.">
          <PersonPicker
            id="utility-transfer-to-person"
            value={form.transferToName}
            personId={form.transferToPersonId}
            onSelect={({ name, personId }) => setForm((f) => ({ ...f, transferToName: name, transferToPersonId: personId }))}
          />
        </FormField>
      ) : null}
    </Modal>
  );
}
