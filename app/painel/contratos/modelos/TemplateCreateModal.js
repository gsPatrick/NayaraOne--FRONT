"use client";

// Criar modelo de contrato: nasce com a versão 1 em rascunho; o responsável jurídico padrão é quem cria (JUR-002).
import { useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import { createContractTemplate } from "@/lib/api/legal";
import { CONTRACT_TYPE_LABELS, TEMPLATE_CONTRACT_TYPES } from "@/lib/labels/juridico";
import { useActiveUsers } from "@/lib/legal/useActiveUsers";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import styles from "./page.module.css";

const EMPTY = { name: "", contractType: "LEASE_RESIDENTIAL", legalResponsibleUserId: "" };

export default function TemplateCreateModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const usersState = useActiveUsers(open);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const created = await createContractTemplate({ name: form.name.trim(), contractType: form.contractType, legalResponsibleUserId: form.legalResponsibleUserId || undefined });
      setForm(EMPTY);
      onCreated(created);
    } catch (err) {
      setError(legalErrorMessage(err, "Erro ao criar o modelo."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo modelo de contrato"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleCreate} loading={busy} disabled={busy || !form.name.trim()}>Criar modelo</Button>
        </>
      }
    >
      {error ? <Alert tone="danger" className={styles.notice}>{error}</Alert> : null}
      <div className={styles.form}>
        <FormField label="Nome do modelo" htmlFor="f-tpl-name" required>
          <Input id="f-tpl-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Locação residencial padrão" />
        </FormField>
        <FormField label="Tipo de contrato" htmlFor="f-tpl-type" required>
          <Select id="f-tpl-type" value={form.contractType} onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value }))}>
            {TEMPLATE_CONTRACT_TYPES.map((t) => <option key={t} value={t}>{CONTRACT_TYPE_LABELS[t]}</option>)}
          </Select>
        </FormField>
        <FormField label="Responsável jurídico" htmlFor="f-tpl-responsible" helper={usersState.error || "Quem responde pelo modelo. Sem escolha, fica quem cria."}>
          <Select id="f-tpl-responsible" value={form.legalResponsibleUserId} onChange={(e) => setForm((p) => ({ ...p, legalResponsibleUserId: e.target.value }))}>
            <option value="">Eu (quem está criando)</option>
            {usersState.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </FormField>
      </div>
    </Modal>
  );
}
