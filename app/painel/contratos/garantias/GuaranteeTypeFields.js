"use client";

// Campos por tipo de garantia (Caderno M5 §9). Usado no cadastro, no "Completar dados" e na substituição.
// `form`/`onChange(patch)` vêm de guaranteeForm.js; `support` = { people, depositEntries, otherFlows }.
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { formatBRL, formatDate } from "@/lib/format";
import { GUARANTEE_FIELD_LABELS } from "@/lib/labels/juridico";
import styles from "./novo/page.module.css";

function DateField({ id, label, value, onChange, required, helper }) {
  return (
    <FormField label={label} htmlFor={id} required={required} helper={helper}>
      <Input id={id} type="date" min="1900-01-01" max="2100-12-31" value={value} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

function FileField({ id, label, file, onChange, required, helper, multiple, accept }) {
  return (
    <FormField label={label} htmlFor={id} required={required} helper={helper}>
      <input
        id={id}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) => onChange(multiple ? Array.from(e.target.files || []) : e.target.files?.[0] || null)}
      />
      {!multiple && file ? <span className={styles.fileName}>{file.name}</span> : null}
    </FormField>
  );
}

function GuarantorFields({ form, set, people, current }) {
  const extraOptions = people.filter((p) => p.id !== form.guarantorPersonId && !form.additionalGuarantorPersonIds.includes(p.id));
  return (
    <>
      <FormField label="Pessoa fiadora" htmlFor="f-g-guarantor" required helper={current?.guarantorPersonId ? "Já informada na garantia." : "Não pode ser o locador nem o locatário do contrato."}>
        <Select id="f-g-guarantor" value={form.guarantorPersonId} onChange={(e) => set({ guarantorPersonId: e.target.value })}>
          <option value="">Selecione</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
        </Select>
      </FormField>
      <FormField label="Outros fiadores" htmlFor="f-g-guarantor-extra" helper={form.additionalGuarantorPersonIds.length ? form.additionalGuarantorPersonIds.map((id) => people.find((p) => p.id === id)?.legalName || "Pessoa").join(", ") : "Opcional"}>
        <Select id="f-g-guarantor-extra" value="" onChange={(e) => e.target.value && set({ additionalGuarantorPersonIds: [...form.additionalGuarantorPersonIds, e.target.value] })}>
          <option value="">Adicionar outro fiador</option>
          {extraOptions.map((p) => <option key={p.id} value={p.id}>{p.legalName}</option>)}
        </Select>
      </FormField>
      <FileField id="f-g-docs" label="Documentos do fiador" multiple required helper={form.documentFiles.length ? `${form.documentFiles.length} arquivo(s) selecionado(s)` : "Documento pessoal, comprovante de renda e de imóvel."} onChange={(files) => set({ documentFiles: files })} />
      <FileField id="f-g-acceptance" label="Termo de aceite assinado pelo fiador" required file={form.acceptanceFile} onChange={(f) => set({ acceptanceFile: f })} />
      <DateField id="f-g-accepted-at" label="Data do aceite" required value={form.acceptedAt} onChange={(v) => set({ acceptedAt: v })} />
    </>
  );
}

function InsuranceFields({ form, set }) {
  function setInstallment(i, patch) {
    set({ installments: form.installments.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  }
  return (
    <>
      <FormField label="Seguradora" htmlFor="f-g-provider" required>
        <Input id="f-g-provider" value={form.providerName} onChange={(e) => set({ providerName: e.target.value })} placeholder="Ex.: Porto Seguro" />
      </FormField>
      <FormField label="Número da apólice" htmlFor="f-g-policy" required>
        <Input id="f-g-policy" value={form.policyNumber} onChange={(e) => set({ policyNumber: e.target.value })} />
      </FormField>
      <FileField id="f-g-policy-file" label="Arquivo da apólice" required file={form.policyFile} onChange={(f) => set({ policyFile: f })} />
      <FormField label="Prêmio anual (R$)" htmlFor="f-g-annual-premium" helper="A soma das parcelas precisa ser igual ao prêmio anual.">
        <DecimalInput id="f-g-annual-premium" value={form.annualPremium} onChange={(e) => set({ annualPremium: e.target.value })} placeholder="0,00" />
      </FormField>
      <div className={styles.fullRow}>
        <span className={styles.groupLabel}>Parcelas do prêmio</span>
        {form.installments.map((p, i) => (
          <div key={i} className={styles.installmentRow}>
            <span>{i + 1}ª</span>
            <Input id={`f-g-inst-due-${i}`} aria-label={`Vencimento da parcela ${i + 1}`} type="date" min="1900-01-01" max="2100-12-31" value={p.dueDate} onChange={(e) => setInstallment(i, { dueDate: e.target.value })} />
            <DecimalInput id={`f-g-inst-amount-${i}`} aria-label={`Valor da parcela ${i + 1}`} value={p.amount} onChange={(e) => setInstallment(i, { amount: e.target.value })} placeholder="0,00" />
            <Button size="sm" variant="ghost" onClick={() => set({ installments: form.installments.filter((_, idx) => idx !== i) })}>Remover</Button>
          </div>
        ))}
        <Button size="sm" variant="secondary" onClick={() => set({ installments: [...form.installments, { dueDate: "", amount: "" }] })}>Adicionar parcela</Button>
      </div>
      <DateField id="f-g-renewal" label="Data de renovação" required value={form.renewalDueAt} onChange={(v) => set({ renewalDueAt: v })} />
      <Checkbox id="f-g-auto-renew" label="Renovação automática" checked={form.autoRenew} onChange={(e) => set({ autoRenew: e.target.checked })} />
    </>
  );
}

function DepositFields({ form, set, depositEntries }) {
  return (
    <FormField
      label="Recebimento da caução no Financeiro"
      htmlFor="f-g-finance-entry"
      required
      helper={depositEntries.length ? "A devolução ou compensação da caução é feita pelo Financeiro, a partir deste recebimento; o saldo aparece no detalhe da garantia." : "Nenhum recebimento de dinheiro de terceiros deste contrato no Financeiro. Registre o recebimento da caução lá (a garantia fica pendente até isso)."}
    >
      <Select id="f-g-finance-entry" value={form.financeEntryId} onChange={(e) => set({ financeEntryId: e.target.value })}>
        <option value="">Selecione o recebimento</option>
        {depositEntries.map((e) => (
          <option key={e.id} value={e.id}>{formatBRL(e.amount)} — vencimento {e.dueAt ? formatDate(e.dueAt) : "sem data"}</option>
        ))}
      </Select>
    </FormField>
  );
}

function CapitalizationFields({ form, set }) {
  return (
    <>
      <FormField label="Emissora do título" htmlFor="f-g-provider" required>
        <Input id="f-g-provider" value={form.providerName} onChange={(e) => set({ providerName: e.target.value })} />
      </FormField>
      <FormField label="Número do título" htmlFor="f-g-certificate" required>
        <Input id="f-g-certificate" value={form.certificateNumber} onChange={(e) => set({ certificateNumber: e.target.value })} />
      </FormField>
      <FileField id="f-g-certificate-file" label="Documento do título" required file={form.certificateFile} onChange={(f) => set({ certificateFile: f })} />
      <FormField label="Valor de resgate (R$)" htmlFor="f-g-redemption" helper="Opcional">
        <DecimalInput id="f-g-redemption" value={form.redemptionAmount} onChange={(e) => set({ redemptionAmount: e.target.value })} placeholder="0,00" />
      </FormField>
    </>
  );
}

function OtherFields({ form, set, otherFlows }) {
  const flow = otherFlows.find((f) => f.code === form.homologatedFlowCode);
  return (
    <>
      <FormField label="Fluxo homologado" htmlFor="f-g-flow" required>
        <Select id="f-g-flow" value={form.homologatedFlowCode} onChange={(e) => set({ homologatedFlowCode: e.target.value, flowData: {} })}>
          <option value="">Selecione</option>
          {otherFlows.map((f) => <option key={f.code} value={f.code}>{f.label || "Fluxo homologado"}</option>)}
        </Select>
      </FormField>
      {(flow?.requiredFields || []).map((key) => (
        <FormField key={key} label={key.replace(/[_-]+/g, " ")} htmlFor={`f-g-flow-${key}`} required>
          <Input id={`f-g-flow-${key}`} value={form.flowData[key] || ""} onChange={(e) => set({ flowData: { ...form.flowData, [key]: e.target.value } })} />
        </FormField>
      ))}
    </>
  );
}

export default function GuaranteeTypeFields({ type, form, onChange, support, current = null, showCommon = true }) {
  const set = (patch) => onChange({ ...form, ...patch });
  const people = support.people || [];
  const needsValue = ["INSURANCE", "SECURITY_DEPOSIT", "CAPITALIZATION"].includes(type);
  const needsValidity = ["GUARANTOR", "INSURANCE", "CAPITALIZATION"].includes(type);
  return (
    <div className={styles.formGrid}>
      {type === "GUARANTOR" ? <GuarantorFields form={form} set={set} people={people} current={current} /> : null}
      {type === "INSURANCE" ? <InsuranceFields form={form} set={set} /> : null}
      {type === "SECURITY_DEPOSIT" ? <DepositFields form={form} set={set} depositEntries={support.depositEntries || []} /> : null}
      {type === "CAPITALIZATION" ? <CapitalizationFields form={form} set={set} /> : null}
      {type === "OTHER" ? <OtherFields form={form} set={set} otherFlows={support.otherFlows || []} /> : null}
      {showCommon ? (
        <>
          <FormField label={type === "SECURITY_DEPOSIT" ? "Valor da caução (R$)" : "Valor (R$)"} htmlFor="f-g-value" required={needsValue} helper={needsValue ? undefined : "Opcional"}>
            <DecimalInput id="f-g-value" value={form.value} onChange={(e) => set({ value: e.target.value })} placeholder="0,00" />
          </FormField>
          <DateField id="f-g-starts" label="Início de vigência" value={form.startsAt} onChange={(v) => set({ startsAt: v })} helper="Opcional" />
          <DateField id="f-g-ends" label={GUARANTEE_FIELD_LABELS.endsAt} required={needsValidity} value={form.endsAt} onChange={(v) => set({ endsAt: v })} helper={needsValidity ? "Obrigatório para este tipo de garantia" : "Opcional"} />
          <FormField label="Observações" htmlFor="f-g-notes" helper="Opcional">
            <Input id="f-g-notes" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </FormField>
        </>
      ) : null}
    </div>
  );
}
