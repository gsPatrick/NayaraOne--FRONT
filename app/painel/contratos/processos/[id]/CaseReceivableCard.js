"use client";

// Recebível do processo (Caderno M5 §14 "vinculados ao Financeiro somente quando juridicamente cabível"; "não
// confundir estimativa processual com recebível confirmado"): só o valor CONFIRMADO vira recebível, com a base
// jurídica (acordo homologado ou sentença transitada em julgado) e a referência. Exige aprovação jurídica e
// lançamento no Financeiro — sem as duas permissões a ação não aparece.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import { listLegalCaseReceivables, linkLegalCaseReceivable } from "@/lib/api/legal";
import { listResultCenters } from "@/lib/api/finance";
import { lookupFallback } from "@/lib/asyncState/lookup";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { CASE_RECEIVABLE_BASIS_LABELS } from "@/lib/labels/juridico";
import { formatBRL, formatDate } from "@/lib/format";
import { brasilia } from "./DeadlinesCard";
import styles from "./page.module.css";

const EMPTY = { basis: "SETTLEMENT", basisReference: "", dueAt: "", resultCenterId: "" };

export default function CaseReceivableCard({ legalCase }) {
  const [receivables, setReceivables] = useState([]);
  const [centers, setCenters] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canApprove = useHasPermission("legal:approve");
  const canFinance = useHasPermission("finance:create");
  const allowed = canApprove && canFinance;
  const confirmed = Number(legalCase.confirmedAmount || 0);

  useEffect(() => {
    let alive = true;
    listLegalCaseReceivables(legalCase.id)
      .then((list) => alive && setReceivables(Array.isArray(list) ? list : []))
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar o recebível do processo.")));
    return () => {
      alive = false;
    };
  }, [legalCase.id]);

  useEffect(() => {
    if (!allowed || confirmed <= 0) return;
    listResultCenters()
      .catch(lookupFallback("os centros de resultado"))
      .then((list) => setCenters(Array.isArray(list) ? list : []));
  }, [allowed, confirmed]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const valid = form.basisReference.trim() && form.dueAt && form.resultCenterId;

  async function handleLink() {
    if (!valid) return;
    setError("");
    setBusy(true);
    try {
      const created = await linkLegalCaseReceivable(legalCase.id, { ...form, basisReference: form.basisReference.trim() });
      setReceivables((prev) => [...prev, created]);
      setForm(EMPTY);
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível vincular o recebível."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Valores do processo" subtitle="Estimativa processual não vira recebível; só o valor confirmado vai ao Financeiro">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <dl className={styles.detailList}>
        <div className={styles.detailRow}><dt>Valor estimado</dt><dd>{legalCase.estimatedAmount != null ? formatBRL(legalCase.estimatedAmount) : "Não informado"}</dd></div>
        <div className={styles.detailRow}><dt>Valor confirmado</dt><dd>{confirmed > 0 ? formatBRL(confirmed) : "Ainda não confirmado"}</dd></div>
      </dl>
      {receivables.map((r) => (
        <p key={r.id} className={styles.emptyText} data-testid="case-receivable">
          Recebível de {formatBRL(r.amount)} vinculado ao Financeiro em {brasilia(r.createdAt)} — {CASE_RECEIVABLE_BASIS_LABELS[r.basis] || "base jurídica"}: {r.basisReference}
          {r.financialEntry?.dueAt ? ` (vencimento ${formatDate(r.financialEntry.dueAt)})` : ""}.
        </p>
      ))}
      {receivables.length === 0 && confirmed <= 0 ? (
        <p className={styles.emptyText}>Sem valor confirmado, o processo não gera recebível.</p>
      ) : null}
      {receivables.length === 0 && confirmed > 0 && !allowed ? (
        <p className={styles.emptyText}>Vincular ao Financeiro exige aprovação jurídica e permissão de lançamento no Financeiro.</p>
      ) : null}
      {receivables.length === 0 && confirmed > 0 && allowed ? (
        <div className={styles.newDeadline}>
          <FormField label="Base jurídica" htmlFor="f-rcv-basis" required>
            <Select id="f-rcv-basis" value={form.basis} onChange={set("basis")}>
              {Object.entries(CASE_RECEIVABLE_BASIS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Referência do acordo ou da decisão" htmlFor="f-rcv-ref" required>
            <Input id="f-rcv-ref" value={form.basisReference} onChange={set("basisReference")} placeholder="Ex.: Acordo homologado em 10/11/2026, autos nº 0001234" />
          </FormField>
          <FormField label="Vencimento" htmlFor="f-rcv-due" required helper="Vence às 23:59 (horário de Brasília).">
            <Input id="f-rcv-due" type="date" min="1900-01-01" max="2100-12-31" value={form.dueAt} onChange={set("dueAt")} />
          </FormField>
          <FormField label="Centro de resultado" htmlFor="f-rcv-center" required>
            <Select id="f-rcv-center" value={form.resultCenterId} onChange={set("resultCenterId")}>
              <option value="">Selecione</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{[c.code, c.name].filter(Boolean).join(" — ")}</option>
              ))}
            </Select>
          </FormField>
          <div className={styles.formActions}>
            <Button size="sm" onClick={handleLink} loading={busy} disabled={busy || !valid}>Vincular ao Financeiro ({formatBRL(confirmed)})</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
