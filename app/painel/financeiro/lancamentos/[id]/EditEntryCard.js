"use client";

// Cartão de edição do lançamento pendente (estado e gravação em useEntryEdit.js).
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import BankAccountSelect from "@/components/molecules/BankAccountSelect/BankAccountSelect";
import { DUE_REQUIRED_TEXT, editDueAtMode } from "@/lib/finance/openEntryRequired";
import styles from "./page.module.css";

export default function EditEntryCard({ edit, entry, allBankAccounts, allCostCenters, allResultCenters }) {
  const { editForm, setEditForm } = edit;
  // DI-BI2-6: o vencimento gravado é fato do lançamento (não troca); a conta própria sem data recebe a data uma vez.
  const dueMode = editDueAtMode(entry);
  const dueHelper = dueMode === "locked" ? "O vencimento gravado não pode ser trocado." : dueMode === "required" ? DUE_REQUIRED_TEXT : "Opcional";
  const set = (field) => (value) => setEditForm((p) => ({ ...p, [field]: value }));
  return (
    <Card title="Editar lançamento" subtitle="Só é possível editar enquanto estiver pendente — o lançamento vira imutável depois de liquidado. Trocar a conta/favorecido depois de uma aprovação cancela a aprovação já concedida.">
      {edit.editError ? <Alert tone="danger" className={styles.notice}>{edit.editError}</Alert> : null}
      <div className={styles.editGrid}>
        <FormField label="Descrição" htmlFor="e-desc">
          <Input id="e-desc" value={editForm.description} onChange={(e) => set("description")(e.target.value)} />
        </FormField>
        <FormField label="Conta bancária / favorecido" htmlFor="e-account">
          <BankAccountSelect id="e-account" accounts={allBankAccounts} value={editForm.bankAccountId} onChange={set("bankAccountId")} />
        </FormField>
        <FormField label="Vencimento" htmlFor="e-due" required={dueMode === "required"} helper={dueHelper}>
          <Input id="e-due" type="date" min="1900-01-01" max="2100-12-31" value={editForm.dueAt} disabled={dueMode === "locked"} onChange={(e) => set("dueAt")(e.target.value)} />
        </FormField>
        <FormField label="Centro de custo" htmlFor="e-cc" required={entry?.nature === "PAYABLE"}>
          <Select id="e-cc" value={editForm.costCenterId} onChange={(e) => set("costCenterId")(e.target.value)}>
            <option value="">Selecione...</option>
            {allCostCenters.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Centro de resultado" htmlFor="e-rc" required={entry?.nature === "RECEIVABLE"}>
          <Select id="e-rc" value={editForm.resultCenterId} onChange={(e) => set("resultCenterId")(e.target.value)}>
            <option value="">Selecione...</option>
            {allResultCenters.map((r) => (
              <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className={styles.editActions}>
        <Button variant="ghost" onClick={() => edit.setEditOpen(false)} disabled={edit.editSaving}>Cancelar</Button>
        <Button onClick={edit.handleSaveEdit} loading={edit.editSaving}>Salvar alterações</Button>
      </div>
    </Card>
  );
}
