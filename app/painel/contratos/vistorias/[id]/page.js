"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Modal from "@/components/organisms/Modal/Modal";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { getProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import {
  getInspection,
  getContract,
  listInspectionItems,
  listInspections,
  completeInspection,
  compareInspections,
  signInspection,
  listInspectionSignatures,
} from "@/lib/api/legal";
import {
  INSPECTION_TYPE_LABELS,
  INSPECTION_TYPE_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
  CONDITION_LABELS,
  CONDITION_TONE,
  PARTY_ROLE_LABELS,
} from "@/lib/mock/legal";

const SIGNATURE_PARTY_ROLES = ["LANDLORD", "TENANT"];
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function VistoriaDetailPage({ params }) {
  const [inspection, setInspection] = useState(null);
  const [property, setProperty] = useState(null);
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [counterpart, setCounterpart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [signModalRole, setSignModalRole] = useState(null);
  const [signInput, setSignInput] = useState("");
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [mfaOpen, setMfaOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getInspection(params.id), listInspectionItems(params.id), apiFetch("/users"), listInspections()])
      .then(async ([inspectionRes, itemsRes, usersRes, allInspections]) => {
        if (cancelled) return;
        setInspection(inspectionRes);
        setItems(itemsRes || []);
        setUsers(usersRes || []);

        if (inspectionRes?.propertyId) {
          try {
            const prop = await getProperty(inspectionRes.propertyId);
            if (!cancelled) setProperty(prop);
          } catch {
            // Imóvel pode não estar disponível.
          }
        }
        if (inspectionRes?.contractId) {
          try {
            const c = await getContract(inspectionRes.contractId);
            if (!cancelled) setContract(c);
          } catch {
            // Contrato pode não estar disponível.
          }
        }

        if (inspectionRes?.status === "COMPLETED") {
          try {
            const sigs = await listInspectionSignatures(inspectionRes.id);
            if (!cancelled) setSignatures(sigs || []);
          } catch {
            // Assinaturas podem não estar disponíveis ainda.
          }
        }

        const counterpartType = inspectionRes.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspectionRes.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
        if (counterpartType) {
          const found = (allInspections || []).find(
            (i) => i.propertyId === inspectionRes.propertyId && i.inspectionType === counterpartType && i.id !== inspectionRes.id
          );
          if (!cancelled) setCounterpart(found || null);
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar vistoria."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "—";
  }

  if (loading) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Vistoria" backHref="/painel/contratos/vistorias">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!inspection) return notFound();

  const counterpartType = inspection.inspectionType === "CHECK_IN" ? "CHECK_OUT" : inspection.inspectionType === "CHECK_OUT" ? "CHECK_IN" : null;
  const divergenceCount = comparison ? comparison.divergences.length : 0;

  async function handleComplete() {
    setActionError("");
    setBusy(true);
    try {
      const updated = await completeInspection(inspection.id);
      setInspection(updated);
      // Vistoria acabou de ser concluída — ainda não deve haver nenhuma assinatura registrada.
      try {
        const sigs = await listInspectionSignatures(updated.id);
        setSignatures(sigs || []);
      } catch {
        setSignatures([]);
      }
    } catch (err) {
      setActionError(err.message || "Erro ao concluir vistoria.");
    } finally {
      setBusy(false);
    }
  }

  function openSignModal(partyRole) {
    setSignError("");
    setSignInput("");
    setSignModalRole(partyRole);
  }

  function closeSignModal() {
    if (signing) return;
    setSignModalRole(null);
    setSignInput("");
    setSignError("");
  }

  async function handleConfirmSign() {
    if (!signInput.trim()) {
      setSignError("Digite o nome completo para confirmar a assinatura.");
      return;
    }
    setSigning(true);
    setSignError("");
    try {
      await signInspection(inspection.id, {
        partyRole: signModalRole,
        signaturePayload: signInput.trim(),
      });
      const sigs = await listInspectionSignatures(inspection.id);
      setSignatures(sigs || []);
      setSignModalRole(null);
      setSignInput("");
    } catch (err) {
      // Assinar vistoria é step-up MFA obrigatório no backend (requireRecentMfa em
      // /legal/inspections/:id/sign) — mesmo padrão já usado em Liquidar lançamento e
      // Decidir aprovação: pedimos o código MFA e, uma vez verificado, repetimos a
      // chamada de assinatura automaticamente.
      if (err?.code === "MFA_STEP_UP_REQUIRED") {
        setMfaOpen(true);
      } else {
        setSignError(err.message || "Erro ao registrar assinatura.");
      }
    } finally {
      setSigning(false);
    }
  }

  function signatureFor(partyRole) {
    return signatures.find((s) => s.partyRole === partyRole) || null;
  }

  async function handleToggleCompare() {
    if (compareOpen) {
      setCompareOpen(false);
      return;
    }
    setActionError("");
    setBusy(true);
    try {
      const entryId = inspection.inspectionType === "CHECK_IN" ? inspection.id : counterpart.id;
      const exitId = inspection.inspectionType === "CHECK_OUT" ? inspection.id : counterpart.id;
      const result = await compareInspections(entryId, exitId);
      setComparison(result);
      setCompareOpen(true);
    } catch (err) {
      setActionError(err.message || "Erro ao comparar vistorias.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={property?.name || "Vistoria"} backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={INSPECTION_TYPE_TONE[inspection.inspectionType]}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]}</Badge>
            <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>{INSPECTION_STATUS_LABELS[inspection.status]}</Badge>
          </div>
          <div className={styles.actions}>
            {inspection.status === "SCHEDULED" ? (
              <Button onClick={handleComplete} disabled={busy}><Icon name="check" size={16} /> Concluir vistoria</Button>
            ) : null}
            {counterpart ? (
              <Button variant="secondary" onClick={handleToggleCompare} disabled={busy}>
                <Icon name="swapHorizontal" size={16} />
                {compareOpen ? "Ocultar comparação" : `Comparar com vistoria de ${INSPECTION_TYPE_LABELS[counterpartType].toLowerCase()}`}
              </Button>
            ) : null}
          </div>
        </div>

        {actionError ? <Alert tone="danger" className={styles.notice}>{actionError}</Alert> : null}

        <Card title="Detalhes da vistoria">
          <dl className={styles.detailList}>
            <div className={styles.detailRow}><dt>Imóvel</dt><dd>{property?.name || "—"}</dd></div>
            <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract?.contractNumber || "—"}</dd></div>
            <div className={styles.detailRow}><dt>Inspetor</dt><dd>{inspection.inspectorUserId ? userName(inspection.inspectorUserId) : "—"}</dd></div>
            <div className={styles.detailRow}><dt>Agendada para</dt><dd>{formatDate(inspection.scheduledAt)}</dd></div>
            <div className={styles.detailRow}><dt>Concluída em</dt><dd>{inspection.completedAt ? formatDateTime(inspection.completedAt) : "—"}</dd></div>
          </dl>
        </Card>

        <Card title="Itens vistoriados" subtitle={`${items.length} item(ns) registrado(s)`}>
          {items.length === 0 ? (
            <EmptyState icon="document" title="Sem itens" description="Nenhum item registrado — vistoria ainda não concluída." />
          ) : (
            items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.itemName}</span>
                  {item.notes ? <span className={styles.itemNotes}>{item.notes}</span> : null}
                </div>
                <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
              </div>
            ))
          )}
        </Card>

        {inspection.status === "COMPLETED" ? (
          <Card
            title="Assinaturas"
            subtitle={
              signatures.length >= SIGNATURE_PARTY_ROLES.length
                ? "Vistoria assinada por locador e locatário."
                : "Colete a assinatura do locador e do locatário para liberar a entrega de chaves."
            }
          >
            <div>
              {SIGNATURE_PARTY_ROLES.map((role) => {
                const sig = signatureFor(role);
                return (
                  <div key={role} className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{PARTY_ROLE_LABELS[role] || role}</span>
                      {sig ? (
                        <span className={styles.itemNotes}>
                          Assinado{sig.signedAt ? ` em ${formatDateTime(sig.signedAt)}` : ""}
                        </span>
                      ) : (
                        <span className={styles.itemNotes}>Assinatura pendente</span>
                      )}
                    </div>
                    {sig ? (
                      <Badge tone="success"><Icon name="check" size={14} /> Assinado</Badge>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => openSignModal(role)}>
                        <Icon name="pencil" size={16} /> Assinar como {PARTY_ROLE_LABELS[role] || role}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {signatures.length >= SIGNATURE_PARTY_ROLES.length ? (
              <p className={styles.divergenceNote}>
                <Icon name="check" size={14} /> Ambas as partes assinaram esta vistoria — a entrega de chaves pode ser liberada.
              </p>
            ) : null}
          </Card>
        ) : null}

        {compareOpen && counterpart && comparison ? (
          <Card
            title="Comparação de vistorias"
            subtitle={`${divergenceCount} divergência(s) encontrada(s) entre as vistorias de ${INSPECTION_TYPE_LABELS[inspection.inspectionType].toLowerCase()} e ${INSPECTION_TYPE_LABELS[counterpart.inspectionType].toLowerCase()}`}
          >
            <div className={styles.compareGrid}>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[inspection.inspectionType]} — {formatDate(inspection.scheduledAt)}</span>
                {comparison.divergences.map((c) => (
                  <div key={`div-a-${c.itemName}`} className={[styles.compareRow, styles.compareRowChanged].join(" ")}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.entryCondition] || c.entryCondition}</span>
                  </div>
                ))}
                {comparison.onlyInEntry.map((c) => (
                  <div key={`only-a-${c.itemName}`} className={styles.compareRow}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.entryCondition] || c.entryCondition}</span>
                  </div>
                ))}
              </div>
              <div className={styles.compareCol}>
                <span className={styles.compareColHead}>{INSPECTION_TYPE_LABELS[counterpart.inspectionType]} — {formatDate(counterpart.scheduledAt)}</span>
                {comparison.divergences.map((c) => (
                  <div key={`div-b-${c.itemName}`} className={[styles.compareRow, styles.compareRowChanged].join(" ")}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.exitCondition] || c.exitCondition}</span>
                  </div>
                ))}
                {comparison.onlyInExit.map((c) => (
                  <div key={`only-b-${c.itemName}`} className={styles.compareRow}>
                    <span className={styles.compareItemName}>{c.itemName}</span>
                    <span className={styles.compareItemMeta}>{CONDITION_LABELS[c.exitCondition] || c.exitCondition}</span>
                  </div>
                ))}
              </div>
            </div>
            {divergenceCount > 0 ? (
              <p className={styles.divergenceNote}>
                <Icon name="filter" size={14} /> Itens destacados mudaram de condição entre as duas vistorias.
              </p>
            ) : (
              <EmptyState icon="check" title="Sem divergências" description="Nenhuma divergência encontrada entre as duas vistorias." />
            )}
          </Card>
        ) : null}
      </div>

      <Modal
        open={!!signModalRole}
        onClose={closeSignModal}
        title={`Assinar como ${signModalRole ? PARTY_ROLE_LABELS[signModalRole] || signModalRole : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={closeSignModal} disabled={signing}>Cancelar</Button>
            <Button onClick={handleConfirmSign} loading={signing}>Confirmar assinatura</Button>
          </>
        }
      >
        <p className={styles.itemNotes}>
          Ao confirmar, esta pessoa declara estar de acordo com o laudo de vistoria registrado acima.
        </p>
        <FormField
          label="Nome completo"
          htmlFor="f-signature"
          required
          error={signError || undefined}
          helper="Digite o nome completo para confirmar a assinatura."
        >
          <Input
            id="f-signature"
            value={signInput}
            error={!!signError}
            onChange={(e) => setSignInput(e.target.value)}
            placeholder="Ex: João da Silva"
            autoFocus
          />
        </FormField>
      </Modal>

      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel="assinar esta vistoria"
        onVerified={async () => {
          setMfaOpen(false);
          await handleConfirmSign();
        }}
      />
    </AppShell>
  );
}
