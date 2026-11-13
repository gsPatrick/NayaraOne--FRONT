"use client";

// Edição dos critérios do radar nas quatro categorias do livro (Marco 3 §13). PATCH /radar/:id com o criteriaJson completo:
// a API valida (422 RADAR_CRITERIA_INVALID), grava, refaz o matching e devolve os matches com a explicação.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import ErrorSummary from "@/components/molecules/ErrorSummary/ErrorSummary";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import RadarCriteriaForm from "@/components/organisms/RadarCriteriaForm/RadarCriteriaForm";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState, useAsyncAction } from "@/lib/asyncState/useAsyncState";
import { formFromCriteriaJson, buildRadarCriteria, errorSummaryItems } from "@/lib/radarCriteria";
import { getRadar, updateRadar } from "@/lib/api/radar";
import styles from "../../novo/page.module.css";

export default function EditarRadarPage({ params }) {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const summaryRef = useRef(null);
  const detailHref = `/painel/radar/${params.id}`;

  const loadQuery = useAsyncState(() => getRadar(params.id), { deps: [params.id], isEmpty: (radar) => !radar || !radar.id });
  const saveAction = useAsyncAction((_ctx, payload) => updateRadar(params.id, payload), { successMessage: "Critérios do radar salvos." });
  const submitting = saveAction.status === UI_STATE.LOADING || saveAction.status === UI_STATE.SUCCESS;
  const showSaveProblem = Boolean(saveAction.status) && !submitting;

  // O formulário nasce do radar salvo uma única vez (recarga não apaga o que já foi digitado).
  useEffect(() => {
    if (loadQuery.status === UI_STATE.CONTENT && loadQuery.data && form === null) setForm(formFromCriteriaJson(loadQuery.data.criteriaJson));
  }, [loadQuery.status, loadQuery.data, form]);

  async function handleSubmit(event) {
    event.preventDefault();
    const { criteriaJson, errors: nextErrors } = buildRadarCriteria(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      window.setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    const outcome = await saveAction.run({ criteriaJson });
    if (outcome.status === UI_STATE.SUCCESS) router.push(detailHref);
  }

  return (
    <AppShell title="Editar radar" backHref={detailHref}>
      <div className={styles.wrap}>
        <AsyncState result={loadQuery} loadingLabel="Carregando radar..." emptyTitle="Radar não encontrado" freshOnly>
          {() => (form ? (
            <>
              {showSaveProblem ? <AsyncState result={saveAction} onRetry={async () => { const outcome = await saveAction.retry(); if (outcome.status === UI_STATE.SUCCESS) router.push(detailHref); }} /> : null}
              <ErrorSummary ref={summaryRef} items={errorSummaryItems(errors)} />
              <form onSubmit={handleSubmit} noValidate>
                <RadarCriteriaForm form={form} onChange={setForm} errors={errors} />
                <div className={styles.formActions}>
                  <Button type="button" variant="secondary" href={detailHref}>Cancelar</Button>
                  <Button type="submit" loading={submitting} requires="radar:update">Salvar critérios</Button>
                </div>
              </form>
            </>
          ) : null)}
        </AsyncState>
      </div>
    </AppShell>
  );
}
