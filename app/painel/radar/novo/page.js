"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import ErrorSummary from "@/components/molecules/ErrorSummary/ErrorSummary";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import RadarCriteriaForm from "@/components/organisms/RadarCriteriaForm/RadarCriteriaForm";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncAction } from "@/lib/asyncState/useAsyncState";
import { emptyRadarForm, buildRadarCriteria, errorSummaryItems } from "@/lib/radarCriteria";
import { createRadar } from "@/lib/api/radar";
import styles from "./page.module.css";

export default function NovoRadarPage() {
  const router = useRouter();
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyRadarForm);
  const summaryRef = useRef(null);

  // M9-D940: a gravação passa pelo padrão de estados (403, sem conexão e "tentar de novo").
  const lastSignatureRef = useRef(null);
  const saveAction = useAsyncAction(({ idempotencyKey }, payload) => createRadar(payload, { idempotencyKey }), { successMessage: "Radar salvo." });
  const submitting = saveAction.status === UI_STATE.LOADING || saveAction.status === UI_STATE.SUCCESS;
  const showSaveProblem = Boolean(saveAction.status) && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    // Livro §13: obrigatórios, preferências (com peso), flexíveis (com peso) e exclusões vão juntos em criteriaJson.
    const { criteriaJson, errors: criteriaErrors } = buildRadarCriteria(form);
    const nextErrors = { ...(personId ? {} : { person: "Selecione um contato já cadastrado." }), ...criteriaErrors };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }

    const payload = { personId, status: "ACTIVE", criteriaJson };
    // Mesmo formulário reenviado à mão (ex.: depois de timeout) = mesma Idempotency-Key; só um formulário alterado troca a chave.
    const signature = JSON.stringify(payload);
    if (lastSignatureRef.current !== signature) { saveAction.reset(); lastSignatureRef.current = signature; }
    const outcome = await saveAction.run(payload);
    if (outcome.status === UI_STATE.SUCCESS) router.push(outcome.result?.id ? `/painel/radar/${outcome.result.id}` : "/painel/radar");
  }

  return (
    <AppShell title="Novo radar" backHref="/painel/radar">
      <div className={styles.wrap}>
        {/* O "tentar de novo" precisa seguir o mesmo caminho do envio: se der certo, abre o radar criado. */}
        {showSaveProblem ? <AsyncState result={saveAction} onRetry={async () => { const outcome = await saveAction.retry(); if (outcome.status === UI_STATE.SUCCESS) router.push(outcome.result?.id ? `/painel/radar/${outcome.result.id}` : "/painel/radar"); }} /> : null}
        <ErrorSummary ref={summaryRef} items={errorSummaryItems(errors)} />
        <form onSubmit={handleSubmit} noValidate>
          <Card title="Cliente" className={styles.section}>
            <FormField label="Contato (comprador/locatário)" htmlFor="rd-person" required error={errors.person}>
              <PersonPicker
                id="rd-person"
                value={personName}
                personId={personId}
                placeholder="Buscar contato pelo nome..."
                onSelect={({ name, personId: pid }) => {
                  setPersonName(name);
                  setPersonId(pid);
                }}
              />
            </FormField>
          </Card>

          <RadarCriteriaForm form={form} onChange={setForm} errors={errors} />

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" href="/painel/radar">Cancelar</Button>
            <Button type="submit" loading={submitting}>Salvar radar</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
