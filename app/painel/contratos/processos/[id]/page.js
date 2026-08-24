"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listProperties, getProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import {
  getLegalCase,
  getContract,
  listLegalDeadlines,
  updateLegalDeadline,
  listEvidencePackages,
  createEvidencePackage,
  updateLegalCase,
} from "@/lib/api/legal";
import {
  CASE_TYPE_LABELS,
  CASE_TYPE_TONE,
  CASE_STATUS_LABELS,
  CASE_STATUS_TONE,
  DEADLINE_STATUS_LABELS,
  DEADLINE_API_SEVERITY_LABELS,
  DEADLINE_API_SEVERITY_TONE,
} from "@/lib/mock/legal";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_OPTIONS = ["OPEN", "CLOSED"];

export default function ProcessoDetailPage({ params }) {
  const [legalCase, setLegalCase] = useState(null);
  const [contract, setContract] = useState(null);
  const [property, setProperty] = useState(null);
  const [users, setUsers] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [evidencePackages, setEvidencePackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newEvidence, setNewEvidence] = useState({ type: "DOCUMENT", description: "", referenceId: "" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getLegalCase(params.id),
      listLegalDeadlines({ legalCaseId: params.id }),
      listEvidencePackages(params.id),
      apiFetch("/users"),
    ])
      .then(async ([caseRes, deadlinesRes, evidenceRes, usersRes]) => {
        if (cancelled) return;
        setLegalCase(caseRes);
        setDeadlines(deadlinesRes || []);
        setEvidencePackages(evidenceRes || []);
        setUsers(usersRes || []);
        if (caseRes?.contractId) {
          try {
            const c = await getContract(caseRes.contractId);
            if (!cancelled) setContract(c);
          } catch {
            // Contrato pode não estar disponível.
          }
        }
        if (caseRes?.propertyId) {
          try {
            const p = await getProperty(caseRes.propertyId);
            if (!cancelled) setProperty(p);
          } catch {
            // Imóvel pode não estar disponível.
          }
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar processo."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "—";
  }

  if (loading) {
    return (
      <AppShell title="Processo" backHref="/painel/contratos/processos">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Processo" backHref="/painel/contratos/processos">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!legalCase) return notFound();

  async function handleStatusChange(status) {
    setActionError("");
    setBusy(true);
    try {
      const updated = await updateLegalCase(legalCase.id, { status });
      setLegalCase(updated);
      setNotice({ tone: "success", text: `Status atualizado para "${CASE_STATUS_LABELS[status] || status}".` });
    } catch (err) {
      setActionError(err.message || "Erro ao atualizar status do processo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeadlineDone(deadline) {
    setActionError("");
    setBusy(true);
    try {
      const updated = await updateLegalDeadline(deadline.id, { status: "DONE" });
      setDeadlines((prev) => prev.map((d) => (d.id === deadline.id ? { ...updated, severity: "DONE" } : d)));
    } catch (err) {
      setActionError(err.message || "Erro ao atualizar prazo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddEvidence() {
    if (!newEvidence.description.trim()) return;
    setActionError("");
    setBusy(true);
    try {
      const pkg = await createEvidencePackage(legalCase.id, [
        { type: newEvidence.type, description: newEvidence.description, referenceId: newEvidence.referenceId || undefined },
      ]);
      setEvidencePackages((prev) => [...prev, pkg]);
      setNewEvidence({ type: "DOCUMENT", description: "", referenceId: "" });
    } catch (err) {
      setActionError(err.message || "Erro ao criar pacote de evidência.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={legalCase.caseNumber} backHref="/painel/contratos/processos">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={CASE_TYPE_TONE[legalCase.caseType]}>{CASE_TYPE_LABELS[legalCase.caseType]}</Badge>
            <Badge tone={CASE_STATUS_TONE[legalCase.status] || "neutral"}>{CASE_STATUS_LABELS[legalCase.status] || legalCase.status}</Badge>
          </div>
          <Select value={legalCase.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={busy}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{CASE_STATUS_LABELS[s] || s}</option>
            ))}
          </Select>
        </div>

        {actionError ? <Alert tone="danger" className={styles.notice}>{actionError}</Alert> : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes do processo">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Resumo</dt><dd>{legalCase.summary}</dd></div>
                <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract?.contractNumber || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Imóvel vinculado</dt><dd>{property?.name || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Responsável</dt><dd>{legalCase.responsibleUserId ? userName(legalCase.responsibleUserId) : "—"}</dd></div>
              </dl>
            </Card>

            <Card title="Prazos" subtitle="Severidade calculada pela API a partir do vencimento (OVERDUE/DUE_SOON/NORMAL/DONE)">
              {deadlines.length === 0 ? (
                <p className={styles.emptyText}>Nenhum prazo cadastrado.</p>
              ) : (
                deadlines.map((d) => (
                  <div key={d.id} className={styles.deadlineRow}>
                    <div className={styles.deadlineInfo}>
                      <span className={styles.deadlineDesc}>{d.description}</span>
                      <span className={styles.deadlineDue}>Vencimento em {formatDate(d.dueAt)} · {DEADLINE_STATUS_LABELS[d.status] || d.status}</span>
                    </div>
                    <Badge tone={DEADLINE_API_SEVERITY_TONE[d.severity] || "neutral"}>{DEADLINE_API_SEVERITY_LABELS[d.severity] || d.severity}</Badge>
                    {d.status === "PENDING" ? (
                      <Button size="sm" variant="secondary" onClick={() => handleDeadlineDone(d)} disabled={busy}>Concluir</Button>
                    ) : null}
                  </div>
                ))
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Pacotes de evidência" subtitle="Append-only — cada pacote é imutável após criado">
              {evidencePackages.length === 0 ? (
                <p className={styles.emptyText}>Nenhum pacote de evidência gerado para este processo.</p>
              ) : (
                evidencePackages.map((pkg) => (
                  <div key={pkg.id} className={styles.evidencePackage}>
                    <div className={styles.evidenceHead}>
                      <span className={styles.evidenceHash} title={pkg.packageHash}>{pkg.packageHash}</span>
                      <span className={styles.evidenceDate}>{formatDateTime(pkg.createdAt)}</span>
                    </div>
                    <div className={styles.manifestList}>
                      {(pkg.manifestJson || []).map((item, idx) => (
                        <div key={idx} className={styles.manifestItem}>
                          <span className={styles.manifestType}>{item.type}</span>
                          <div className={styles.manifestBody}>
                            <span className={styles.manifestDesc}>{item.description}</span>
                            {item.hash ? <span className={styles.manifestHash} title={item.hash}>{item.hash}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              <div className={styles.addEvidenceRow}>
                <FormField label="Descrição" htmlFor="f-evidence-desc">
                  <Input
                    id="f-evidence-desc"
                    value={newEvidence.description}
                    onChange={(e) => setNewEvidence((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Contrato assinado (v2)"
                  />
                </FormField>
                <Button size="sm" variant="secondary" onClick={handleAddEvidence} disabled={busy || !newEvidence.description.trim()}>
                  Novo pacote de evidência
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
