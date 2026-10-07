"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Modal from "@/components/organisms/Modal/Modal";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Select from "@/components/atoms/Select/Select";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import {
  getProject,
  listDailyReports,
  createDailyReport,
  updateDailyReport,
  listDailyWorkers,
  listDailyMaterials,
} from "@/lib/api/construction";
import { listPeople } from "@/lib/api/people";
import { uploadFile } from "@/lib/api/legal";
import { formatDate, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, toNumber } from "@/lib/format";
import { WEATHER_OPTIONS } from "../_components/obraShared";
import OfflineSyncBadge from "@/components/molecules/OfflineSyncBadge/OfflineSyncBadge";
import { enqueueOfflineRecord, generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";
import styles from "./page.module.css";

// Fila offline (Marco 6, contrato §13) — mesmo nome usado como chave de armazenamento local e
// como rótulo do registro pendente.
const OFFLINE_QUEUE_NAME = "construction.daily-reports";

export default function DiarioObraPage({ params }) {
  const [project, setProject] = useState(null);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [people, setPeople] = useState([]);
  // FIX (auditoria pós-merge Marco 6, 30/09/2026): histórico de RDO ficava truncado a 5 itens
  // sem nenhuma forma de ver o restante. Mantém a lista completa em `allReports` e um toggle
  // `reportsShowAll` para exibir os 5 mais recentes por padrão, com opção de ver todos.
  const [allReports, setAllReports] = useState([]);
  const [reportsShowAll, setReportsShowAll] = useState(false);
  const reports = reportsShowAll ? allReports : allReports.slice(0, 5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [viewerFileId, setViewerFileId] = useState(null);

  const [rdoOpen, setRdoOpen] = useState(false);
  const [rdoForm, setRdoForm] = useState({ reportDate: new Date().toISOString().slice(0, 10), weather: WEATHER_OPTIONS[0], workforceCount: "", occurrences: "", servicesPerformed: "" });
  const [rdoDateInvalid, setRdoDateInvalid] = useState(false);
  const [savingRdo, setSavingRdo] = useState(false);
  const [editingRdoId, setEditingRdoId] = useState(null);
  // Achado numa rodada de verificação de integrações (30/09/2026): a fonte exige "Fotos possuem
  // hash/origem" — evidência fotográfica do RDO. Reaproveita o mesmo padrão de upload já usado
  // em Change Orders/Não Conformidades (uploadFile + File.checksumSha256 no backend).
  const [rdoEvidenceFileIds, setRdoEvidenceFileIds] = useState([]);
  const [rdoEvidenceFileNames, setRdoEvidenceFileNames] = useState([]);
  const [rdoUploading, setRdoUploading] = useState(false);
  const [rdoUploadError, setRdoUploadError] = useState("");
  // Equipe do dia (DailyWorker) — achado numa rodada de verificação de integrações
  // (30/09/2026): a fonte exige "documentação correspondente" vinculada ao prestador do dia,
  // campo estava inteiramente ausente do Front (nenhuma tela de equipe do RDO existia).
  const [rdoWorkers, setRdoWorkers] = useState([]);
  const [workerUploadingIndex, setWorkerUploadingIndex] = useState(null);
  const [workerUploadError, setWorkerUploadError] = useState("");
  // Materiais do dia (DailyMaterial) — mesmo gap, achado na varredura final do Front.
  const [rdoMaterials, setRdoMaterials] = useState([]);

  // PWA/offline (Marco 6, contrato §13): se o POST falhar por rede, o RDO fica numa fila local
  // com o idempotencyKey já gerado no cliente e é reenviado automaticamente quando a conexão
  // voltar (ou via botão "Sincronizar pendentes") — nunca duplicando no servidor.
  const sendQueuedRdo = useCallback(
    (payload, idempotencyKey) => createDailyReport(payload.projectId, { ...payload, idempotencyKey }),
    []
  );
  const { pendingCount, syncing, syncError, syncNow } = useOfflineSync(OFFLINE_QUEUE_NAME, sendQueuedRdo, () => load());

  function load() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getProject(params.id).catch((err) => {
        if (err?.status === 404) {
          setNotFoundFlag(true);
          return null;
        }
        throw err;
      }),
      listPeople().catch(() => []),
    ])
      .then(([p, ppl]) => {
        if (cancelled || !p) return;
        setProject(p);
        setPeople(ppl || []);
        return listDailyReports(p.id).then((rd) => {
          if (cancelled) return;
          setAllReports(rd || []);
        });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o diário de obra.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    const cancel = load();
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Diário de obra" backHref={`/painel/obras/lista/${params.id}`}>
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  if (loadError && !project) {
    return (
      <AppShell title="Diário de obra" backHref={`/painel/obras/lista/${params.id}`}>
        <Alert tone="danger" title="Não foi possível carregar o diário de obra">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Diário de obra" backHref="/painel/obras/lista">
        <Alert tone="danger" title="Obra não encontrada">Não existe nenhuma obra com este identificador.</Alert>
      </AppShell>
    );
  }

  function openRdoModal() {
    setEditingRdoId(null);
    setRdoForm({ reportDate: new Date().toISOString().slice(0, 10), weather: WEATHER_OPTIONS[0], workforceCount: "", occurrences: "", servicesPerformed: "" });
    setRdoEvidenceFileIds([]);
    setRdoEvidenceFileNames([]);
    setRdoUploadError("");
    setRdoWorkers([]);
    setWorkerUploadError("");
    setRdoMaterials([]);
    setRdoOpen(true);
  }

  function addRdoMaterial() {
    setRdoMaterials((prev) => [...prev, { materialDescription: "", quantity: "", unit: "" }]);
  }
  function updateRdoMaterial(index, field, value) {
    setRdoMaterials((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }
  function removeRdoMaterial(index) {
    setRdoMaterials((prev) => prev.filter((_, i) => i !== index));
  }

  function addRdoWorker() {
    setRdoWorkers((prev) => [...prev, { personId: "", role: "", documentFileIds: [] }]);
  }
  function updateRdoWorker(index, field, value) {
    setRdoWorkers((prev) => prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
  }
  function removeRdoWorker(index) {
    setRdoWorkers((prev) => prev.filter((_, i) => i !== index));
  }
  async function handleUploadWorkerDocument(index, file) {
    if (!file) return;
    setWorkerUploadingIndex(index);
    setWorkerUploadError("");
    try {
      const uploaded = await uploadFile(file);
      setRdoWorkers((prev) =>
        prev.map((w, i) => (i === index ? { ...w, documentFileIds: [...(w.documentFileIds || []), uploaded.id] } : w))
      );
    } catch (err) {
      setWorkerUploadError(err?.message || "Erro ao enviar documento.");
    } finally {
      setWorkerUploadingIndex(null);
    }
  }

  async function handleUploadRdoEvidence(files) {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;
    setRdoUploading(true);
    setRdoUploadError("");
    try {
      for (const file of fileArray) {
        const uploaded = await uploadFile(file);
        setRdoEvidenceFileIds((prev) => [...prev, uploaded.id]);
        setRdoEvidenceFileNames((prev) => [...prev, file.name]);
      }
    } catch (err) {
      setRdoUploadError(err?.message || "Erro ao enviar foto.");
    } finally {
      setRdoUploading(false);
    }
  }

  function removeRdoEvidence(index) {
    setRdoEvidenceFileIds((prev) => prev.filter((_, i) => i !== index));
    setRdoEvidenceFileNames((prev) => prev.filter((_, i) => i !== index));
  }

  // FIX (homologação 23/09/2026): mesmo caso da etapa — o RDO só podia ser registrado, nunca
  // corrigido. PATCH /construction/daily-reports/:id já existia na API e em
  // lib/api/construction.js (updateDailyReport) sem nenhum consumidor. Um RDO lançado com
  // data, clima, efetivo ou ocorrências errados ficava errado pra sempre.
  function openRdoEditModal(report) {
    setEditingRdoId(report.id);
    setRdoDateInvalid(false);
    setRdoForm({
      reportDate: report.reportDate ? String(report.reportDate).slice(0, 10) : "",
      weather: report.weather || WEATHER_OPTIONS[0],
      workforceCount: report.workforceCount != null ? String(report.workforceCount) : "",
      occurrences: report.occurrences || "",
      servicesPerformed: report.servicesPerformed || "",
    });
    {
      const existingIds = Array.isArray(report.evidenceFileIds) ? report.evidenceFileIds : [];
      setRdoEvidenceFileIds(existingIds);
      // Nomes originais não são devolvidos pelo RDO (só o id do arquivo) — usa um rótulo
      // genérico numerado pros já existentes; uploads novos nesta sessão mostram o nome real.
      setRdoEvidenceFileNames(existingIds.map((_, i) => `Evidência ${i + 1}`));
    }
    setRdoUploadError("");
    setRdoWorkers([]);
    setWorkerUploadError("");
    setRdoMaterials([]);
    setRdoOpen(true);
    listDailyWorkers(report.id)
      .then((workers) => {
        setRdoWorkers(
          (workers || []).map((w) => ({ personId: w.personId, role: w.role || "", documentFileIds: Array.isArray(w.documentFileIds) ? w.documentFileIds : [] }))
        );
      })
      .catch(() => {});
    listDailyMaterials(report.id)
      .then((materials) => {
        setRdoMaterials(
          (materials || []).map((m) => ({ materialDescription: m.materialDescription, quantity: String(Number(m.quantity)), unit: m.unit }))
        );
      })
      .catch(() => {});
  }

  async function handleSaveRdo() {
    if (!rdoForm.reportDate || !rdoForm.weather || rdoForm.workforceCount === "") return;
    setSavingRdo(true);
    setActionError("");
    try {
      const payload = {
        reportDate: rdoForm.reportDate,
        weather: rdoForm.weather,
        workforceCount: Number(rdoForm.workforceCount),
        occurrences: rdoForm.occurrences.trim() || undefined,
        servicesPerformed: rdoForm.servicesPerformed.trim() || undefined,
        evidenceFileIds: rdoEvidenceFileIds,
        workers: rdoWorkers.filter((w) => w.personId),
        materials: rdoMaterials
          .filter((m) => m.materialDescription && m.quantity !== "" && m.unit)
          .map((m) => ({ ...m, quantity: toNumber(m.quantity) })),
      };
      if (editingRdoId) {
        const updated = await updateDailyReport(editingRdoId, payload);
        setAllReports((prev) => prev.map((r) => (r.id === editingRdoId ? updated : r)));
      } else {
        const idempotencyKey = generateIdempotencyKey();
        try {
          const created = await createDailyReport(project.id, { ...payload, idempotencyKey });
          setAllReports((prev) => [created, ...prev]);
        } catch (err) {
          if (err?.code === "NETWORK_ERROR") {
            // Offline: guarda localmente com o MESMO idempotencyKey e deixa pra sincronizar
            // quando a conexão voltar — nunca perde o registro nem duplica depois.
            enqueueOfflineRecord(OFFLINE_QUEUE_NAME, {
              idempotencyKey,
              label: `RDO de ${rdoForm.reportDate}`,
              payload: { ...payload, projectId: project.id },
            });
            setRdoOpen(false);
            setSavingRdo(false);
            return;
          }
          throw err;
        }
      }
      setRdoOpen(false);
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar o RDO.");
    } finally {
      setSavingRdo(false);
    }
  }

  return (
    <AppShell title={`Diário de obra — ${project.name}`} backHref={`/painel/obras/lista/${project.id}`}>
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        <OfflineSyncBadge pendingCount={pendingCount} syncing={syncing} syncError={syncError} onSyncNow={syncNow} />

        <Card
          title="RDO — Relatório Diário de Obra"
          subtitle={reportsShowAll ? `Todos os ${allReports.length} registros` : "Últimos 5 registros"}
          actions={<Button size="sm" variant="secondary" onClick={openRdoModal}>
            <Icon name="plus" size={14} /> Novo RDO
          </Button>}
        >
          {allReports.length === 0 ? (
            <EmptyState icon="document" title="Sem RDOs" description="Nenhum relatório diário de obra registrado ainda." />
          ) : (
            <div className={styles.rowList}>
              {reports.map((r) => (
                <div key={r.id} className={styles.rowStatic}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>{formatDate(r.reportDate)} · {r.weather}</span>
                    <span className={styles.rowSubtitle}>
                      Efetivo: {r.workforceCount} · {r.occurrences || "Sem ocorrências"}
                    </span>
                    {r.servicesPerformed ? (
                      <span className={styles.rowSubtitle}>Serviços: {r.servicesPerformed}</span>
                    ) : null}
                    {r.evidenceFileIds?.length ? (
                      <span className={styles.rowSubtitle}>
                        {r.evidenceFileIds.length} foto(s) anexada(s) —{" "}
                        {r.evidenceFileIds.map((fid, idx) => (
                          <button
                            key={fid}
                            type="button"
                            style={{ background: "none", border: "none", padding: 0, color: "var(--color-brand)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                            onClick={() => setViewerFileId(fid)}
                          >
                            {idx > 0 ? ", " : ""}ver foto {idx + 1}
                          </button>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.rowEditBtn}
                    aria-label={`Editar RDO de ${formatDate(r.reportDate)}`}
                    onClick={() => openRdoEditModal(r)}
                  >
                    <Icon name="pencil" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {allReports.length > 5 ? (
            <Button size="sm" variant="ghost" onClick={() => setReportsShowAll((v) => !v)}>
              {reportsShowAll ? "Mostrar só os últimos 5" : `Ver todos os ${allReports.length} registros`}
            </Button>
          ) : null}
        </Card>
      </div>

      <Modal
        open={rdoOpen}
        onClose={() => setRdoOpen(false)}
        title={editingRdoId ? "Editar RDO" : "Novo RDO"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRdoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRdo} loading={savingRdo} disabled={!rdoForm.reportDate || rdoDateInvalid || !rdoForm.weather || rdoForm.workforceCount === ""}>{editingRdoId ? "Salvar alterações" : "Registrar RDO"}</Button>
          </>
        }
      >
        {/* FIX (2ª varredura final do Front do Marco 6, 30/09/2026): erro de submissão (ex.: 409
            "já existe um RDO para esta obra nesta data e turno") só aparecia no Alert do topo da
            página, fora da área visível de quem está com o modal aberto — o usuário não recebia
            NENHUM feedback de que o registro falhou. Duplica o erro aqui dentro do modal. */}
        {rdoOpen && actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        <div className={styles.formGrid}>
          <FormField label="Data" htmlFor="m-rdo-date" required error={rdoDateInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}>
            <Input
              id="m-rdo-date"
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              error={rdoDateInvalid}
              value={rdoForm.reportDate}
              onChange={(e) => {
                setRdoDateInvalid(isDateInputInvalid(e.target.validity));
                setRdoForm((p) => ({ ...p, reportDate: e.target.value }));
              }}
              onBlur={(e) => setRdoDateInvalid(isDateInputInvalid(e.target.validity))}
            />
          </FormField>
          <FormField label="Clima" htmlFor="m-rdo-weather" required>
            <Select id="m-rdo-weather" value={rdoForm.weather} onChange={(e) => setRdoForm((p) => ({ ...p, weather: e.target.value }))}>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Efetivo (nº de trabalhadores)" htmlFor="m-rdo-workforce" required>
            <Input id="m-rdo-workforce" type="number" min="0" value={rdoForm.workforceCount} onChange={(e) => setRdoForm((p) => ({ ...p, workforceCount: e.target.value }))} />
          </FormField>
          <div className={styles.span2}>
            <FormField label="Ocorrências" htmlFor="m-rdo-occurrences" helper="Opcional">
              <textarea
                id="m-rdo-occurrences"
                className={styles.textarea}
                rows={3}
                value={rdoForm.occurrences}
                onChange={(e) => setRdoForm((p) => ({ ...p, occurrences: e.target.value }))}
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Serviços executados" htmlFor="m-rdo-services" helper="Opcional">
              <textarea
                id="m-rdo-services"
                className={styles.textarea}
                rows={3}
                value={rdoForm.servicesPerformed}
                onChange={(e) => setRdoForm((p) => ({ ...p, servicesPerformed: e.target.value }))}
                placeholder="Ex: Concretagem da laje do 2º pavimento, instalação elétrica do térreo"
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Fotos do dia" htmlFor="m-rdo-evidence">
              <FileDropInput
                id="m-rdo-evidence"
                accept="image/*"
                multiple
                uploading={rdoUploading}
                error={rdoUploadError || undefined}
                fileNames={rdoEvidenceFileNames}
                onFiles={handleUploadRdoEvidence}
                onRemove={removeRdoEvidence}
                helper="Opcional — evidência fotográfica do andamento da obra"
              />
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField
              label="Equipe do dia"
              htmlFor="m-rdo-workers"
              helper="Opcional — prestador/trabalhador do dia, com documentação correspondente"
            >
              <div className={styles.rowList}>
                {rdoWorkers.map((w, i) => (
                  <div key={i} className={styles.rowStatic} style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <Select
                      value={w.personId}
                      onChange={(e) => updateRdoWorker(i, "personId", e.target.value)}
                      aria-label={`Pessoa do trabalhador ${i + 1}`}
                    >
                      <option value="">Selecione a pessoa...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>{p.legalName}</option>
                      ))}
                    </Select>
                    <Input
                      value={w.role}
                      onChange={(e) => updateRdoWorker(i, "role", e.target.value)}
                      placeholder="Função (ex: Pedreiro)"
                      aria-label={`Função do trabalhador ${i + 1}`}
                    />
                    <div style={{ minWidth: "220px", flex: 1 }}>
                      <FileDropInput
                        id={`m-rdo-worker-doc-${i}`}
                        accept="image/*,application/pdf"
                        uploading={workerUploadingIndex === i}
                        fileNames={(w.documentFileIds || []).map((_, docIndex) => `Documento ${docIndex + 1}`)}
                        onFiles={(files) => handleUploadWorkerDocument(i, files[0])}
                      />
                    </div>
                    <button type="button" className={styles.rowEditBtn} aria-label={`Remover trabalhador ${i + 1}`} onClick={() => removeRdoWorker(i)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {workerUploadError ? <Alert tone="danger">{workerUploadError}</Alert> : null}
              <Button size="sm" variant="ghost" onClick={addRdoWorker} style={{ marginTop: "var(--space-2)" }}>
                <Icon name="plus" size={14} /> Adicionar trabalhador
              </Button>
            </FormField>
          </div>
          <div className={styles.span2}>
            <FormField label="Materiais do dia" htmlFor="m-rdo-materials" helper="Opcional">
              <div className={styles.rowList}>
                {rdoMaterials.map((m, i) => (
                  <div key={i} className={styles.rowStatic} style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
                    <Input
                      value={m.materialDescription}
                      onChange={(e) => updateRdoMaterial(i, "materialDescription", e.target.value)}
                      placeholder="Material (ex: Cimento CP-II)"
                      aria-label={`Descrição do material ${i + 1}`}
                    />
                    <DecimalInput
                      value={m.quantity}
                      onChange={(e) => updateRdoMaterial(i, "quantity", e.target.value)}
                      placeholder="Qtd"
                      aria-label={`Quantidade do material ${i + 1}`}
                      style={{ maxWidth: "100px" }}
                    />
                    <Input
                      value={m.unit}
                      onChange={(e) => updateRdoMaterial(i, "unit", e.target.value)}
                      placeholder="Unidade (ex: SC)"
                      aria-label={`Unidade do material ${i + 1}`}
                      style={{ maxWidth: "120px" }}
                    />
                    <button type="button" className={styles.rowEditBtn} aria-label={`Remover material ${i + 1}`} onClick={() => removeRdoMaterial(i)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={addRdoMaterial} style={{ marginTop: "var(--space-2)" }}>
                <Icon name="plus" size={14} /> Adicionar material
              </Button>
            </FormField>
          </div>
        </div>
      </Modal>

      <FileViewerModal
        open={!!viewerFileId}
        onClose={() => setViewerFileId(null)}
        fileId={viewerFileId}
      />
    </AppShell>
  );
}
