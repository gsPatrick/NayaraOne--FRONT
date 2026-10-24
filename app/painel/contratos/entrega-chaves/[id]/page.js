"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Modal from "@/components/organisms/Modal/Modal";
import Button from "@/components/atoms/Button/Button";
import { listPeople } from "@/lib/api/people";
import { getKeyDelivery, getContract, getInspection, releaseKeyDelivery, cancelKeyDelivery, uploadFile, listContractParties, getKeyDeliveryTermPreview } from "@/lib/api/legal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import {
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  PARTY_ROLE_LABELS,
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

// M45-RECONF F7: "KD-TERM-v2" é código interno do modelo — na tela, "Modelo versão 2".
function termVersionLabel(version) {
  const m = /v(\d+)$/i.exec(String(version || "KD-TERM-v1"));
  return `Modelo versão ${m ? m[1] : "1"}`;
}

export default function EntregaChavesDetailPage({ params }) {
  const router = useRouter();
  const [delivery, setDelivery] = useState(null);
  const [contract, setContract] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ keysCount: "", keysIdentification: "", termSignedByPersonId: "" });
  const [releasePhotos, setReleasePhotos] = useState([]);
  const [parties, setParties] = useState([]);
  const [termPreview, setTermPreview] = useState(null);
  const [termPreviewError, setTermPreviewError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("liberar") === "1") {
      setReleaseOpen(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([getKeyDelivery(params.id), listPeople()])
      .then(async ([deliveryRes, peopleRes]) => {
        if (cancelled) return;
        setDelivery(deliveryRes);
        setPeople(peopleRes || []);
        if (deliveryRes?.contractId) {
          try {
            const [c, ps] = await Promise.all([
              getContract(deliveryRes.contractId),
              listContractParties(deliveryRes.contractId).catch(() => []),
            ]);
            if (!cancelled) { setContract(c); setParties(ps || []); }
          } catch {
            // Contrato pode não estar disponível.
          }
        }
        if (deliveryRes?.inspectionId) {
          try {
            const i = await getInspection(deliveryRes.inspectionId);
            if (!cancelled) setInspection(i);
          } catch {
            // Vistoria pode não estar disponível.
          }
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar entrega de chaves."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  // F7: prévia do termo (gerada no servidor) atualizada conforme o formulário de liberação;
  // depois de liberado, o mesmo endpoint devolve o termo gravado.
  useEffect(() => {
    if (!delivery?.id || (delivery.status !== "RELEASED" && !releaseOpen)) return undefined;
    if (delivery.status === "RELEASED" && delivery.termText) return undefined;
    let cancelled = false;
    const t = setTimeout(() => {
      getKeyDeliveryTermPreview(delivery.id, {
        keysCount: releaseForm.keysCount,
        keysIdentification: releaseForm.keysIdentification.trim(),
        termSignedByPersonId: releaseForm.termSignedByPersonId || delivery.deliveredToPersonId,
      })
        .then((res) => { if (!cancelled) { setTermPreview(res); setTermPreviewError(""); } })
        .catch((err) => { if (!cancelled) setTermPreviewError(err.message || "Não foi possível gerar a prévia do termo."); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [delivery?.id, delivery?.status, delivery?.termText, delivery?.deliveredToPersonId, releaseOpen, releaseForm]);

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  if (loading) {
    return (
      <AppShell title="Entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <SkeletonDetail sections={3} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!delivery) return notFound();

  const deliveredTo = personOf(delivery.deliveredToPersonId);
  // F6: entregas antigas (antes da regra) podem ter recebedor que não é parte — a API recusa a liberação.
  const recipientIsParty = parties.some((p) => p.personId === delivery.deliveredToPersonId);

  // Política de fotos e texto do termo são decididos pelo servidor; aqui só vão os fatos da
  // entrega (quantidade, identificação, quem assinou o termo e as fotos, se houver).
  async function handleRelease() {
    setActionError("");
    setBusy(true);
    try {
      const photosFileIds = [];
      for (const file of releasePhotos) {
        const uploaded = await uploadFile(file);
        photosFileIds.push(uploaded.id);
      }
      const updated = await releaseKeyDelivery(delivery.id, {
        keysCount: Number(releaseForm.keysCount),
        keysIdentification: releaseForm.keysIdentification.trim() || undefined,
        termSignedByPersonId: releaseForm.termSignedByPersonId || delivery.deliveredToPersonId,
        photosFileIds: photosFileIds.length > 0 ? photosFileIds : undefined,
      });
      setDelivery(updated);
      setReleaseOpen(false);
      setNotice({ tone: "success", text: "Chaves liberadas com sucesso. Termo gerado pelo sistema." });
    } catch (err) {
      setActionError(err.message || "Erro ao liberar chaves.");
      setReleaseOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setActionError("");
    setBusy(true);
    try {
      const updated = await cancelKeyDelivery(delivery.id, cancelReason.trim());
      setDelivery(updated);
      setCancelOpen(false);
      setCancelReason("");
      setNotice({ tone: "success", text: "Entrega de chaves cancelada. O motivo ficou registrado na auditoria." });
    } catch (err) {
      setActionError(err.message || "Erro ao cancelar a entrega de chaves.");
      setCancelOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
  }

  return (
    <AppShell title={contract ? formatContractLabel(contract) : "Entrega de chaves"} backHref="/painel/contratos/entrega-chaves">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={KEY_DELIVERY_STATUS_TONE[delivery.status]}>{KEY_DELIVERY_STATUS_LABELS[delivery.status]}</Badge>
            {contract ? <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge> : null}
            {inspection ? <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>Vistoria: {INSPECTION_STATUS_LABELS[inspection.status]}</Badge> : null}
          </div>
          <div className={styles.actionsWrap}>
            {delivery.status === "PENDING" ? (
              <Button onClick={() => setReleaseOpen(true)} disabled={busy}>
                <Icon name="key" size={16} /> Liberar chaves
              </Button>
            ) : null}
            {delivery.status === "PENDING" ? (
              <Button variant="secondary" onClick={() => setCancelOpen(true)} disabled={busy}>
                Cancelar entrega
              </Button>
            ) : null}
            <RowActions
              onView={() => setNotice({ tone: "info", text: "Você já está vendo os detalhes desta entrega." })}
              onEdit={() => setNotice({ tone: "info", text: "Edição de entregas de chave ainda não implementada nesta versão." })}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        {delivery.status === "PENDING" && contract && !recipientIsParty ? (
          <Alert tone="warning" title="Recebedor não é parte do contrato" className={styles.notice}>
            {deliveredTo?.legalName || "O recebedor"} não está entre as partes deste contrato. A liberação será recusada — cadastre-o como parte do contrato ou registre uma nova entrega para uma das partes.
          </Alert>
        ) : null}
        {delivery.status === "CANCELLED" ? (
          <Alert tone="info" title="Entrega cancelada" className={styles.notice}>
            Cancelada em {delivery.cancelledAt ? formatDateTime(delivery.cancelledAt) : "data sem registro"}. Motivo: {delivery.cancelReason || "sem motivo registrado"}
          </Alert>
        ) : null}
        {actionError ? <Alert tone="danger" title="Ação bloqueada" className={styles.notice}>{actionError}</Alert> : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes da entrega">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Entregue para</dt><dd>{deliveredTo?.legalName || "Pessoa não encontrada"}</dd></div>
                <div className={styles.detailRow}><dt>Entregue em</dt><dd>{delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "Ainda não entregue"}</dd></div>
                <div className={styles.detailRow}><dt>Observações</dt><dd>{delivery.notes || "Sem observações"}</dd></div>
                <div className={styles.detailRow}><dt>Chaves/controles</dt><dd>{delivery.keysCount ?? "Sem quantidade registrada"}{delivery.keysIdentification ? ` (${delivery.keysIdentification})` : ""}</dd></div>
                <div className={styles.detailRow}><dt>Política de fotos</dt><dd>{{ REQUIRED_USED_PROPERTY: "Fotos obrigatórias (imóvel usado)", REQUIRED_SALE_DELIVERY: "Fotos obrigatórias (entrega de venda)", NOT_REQUIRED_LEASE_CHECKIN_SIGNED: "Fotos dispensadas (locação com vistoria de entrada assinada)" }[delivery.photoPolicy || termPreview?.photoPolicy] || "definida na liberação"}</dd></div>
                <div className={styles.detailRow}><dt>Termo</dt><dd>{delivery.status === "RELEASED" ? `${termVersionLabel(delivery.termVersion)} — gerado e assinado` : delivery.status === "CANCELLED" ? "Não gerado (entrega cancelada)" : "Gerado pelo sistema na liberação (veja a prévia)"}</dd></div>
              </dl>
            </Card>
            {delivery.termText ? (
              <Card title={`Termo de entrega (${termVersionLabel(delivery.termVersion).toLowerCase()})`}>
                <pre className={styles.mono} style={{ whiteSpace: "pre-wrap" }}>{delivery.termText}</pre>
                <p className={styles.mono}>Código de integridade (SHA-256): {delivery.termHash}</p>
              </Card>
            ) : delivery.status === "CANCELLED" ? null : (
              <Card title="Prévia do termo de entrega">
                {termPreview?.termText ? (
                  <pre className={styles.mono} style={{ whiteSpace: "pre-wrap" }}>{termPreview.termText}</pre>
                ) : (
                  <Button variant="secondary" onClick={() => getKeyDeliveryTermPreview(delivery.id, {}).then(setTermPreview).catch((e) => setTermPreviewError(e.message))}>
                    Ver prévia do termo
                  </Button>
                )}
                {termPreviewError ? <Alert tone="warning">{termPreviewError}</Alert> : null}
              </Card>
            )}
          </div>

          <div className={styles.sideCol}>
            <Card title="Contrato vinculado">
              {contract ? (
                <div className={styles.linkRow} onClick={() => router.push(`/painel/contratos/lista/${contract.id}`)}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>{formatContractLabel(contract)}</span>
                    <span className={styles.linkSub}>{CONTRACT_STATUS_LABELS[contract.status]}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <EmptyState icon="document" title="Sem contrato vinculado" description="Nenhum contrato vinculado a esta entrega de chaves." />
              )}
            </Card>

            <Card title="Vistoria de entrada">
              {inspection ? (
                <div className={styles.linkRow} onClick={() => router.push(`/painel/contratos/vistorias/${inspection.id}`)}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>Vistoria de {(INSPECTION_TYPE_LABELS[inspection.inspectionType] || "").toLowerCase()}</span>
                    <span className={styles.linkSub}>{INSPECTION_STATUS_LABELS[inspection.status]}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <EmptyState icon="document" title="Sem vistoria vinculada" description="Nenhuma vistoria de entrada vinculada." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        title="Liberar chaves"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReleaseOpen(false)}>Cancelar</Button>
            <Button onClick={handleRelease} disabled={busy || !(Number(releaseForm.keysCount) > 0)}>Liberar</Button>
          </>
        }
      >
        <FormField label="Quantidade de chaves/controles" htmlFor="f-kd-count" required>
          <Input id="f-kd-count" type="number" min="1" value={releaseForm.keysCount} onChange={(e) => setReleaseForm((f) => ({ ...f, keysCount: e.target.value }))} />
        </FormField>
        <FormField label="Identificação" htmlFor="f-kd-ident">
          <Input id="f-kd-ident" value={releaseForm.keysIdentification} onChange={(e) => setReleaseForm((f) => ({ ...f, keysIdentification: e.target.value }))} placeholder="Ex.: 2 chaves da porta, 1 controle do portão" />
        </FormField>
        <FormField label="Quem assina o termo" htmlFor="f-kd-signer" required helper="Somente partes do contrato. O texto do termo é gerado pelo sistema (prévia abaixo).">
          <Select id="f-kd-signer" value={releaseForm.termSignedByPersonId} onChange={(e) => setReleaseForm((f) => ({ ...f, termSignedByPersonId: e.target.value }))}>
            {recipientIsParty ? <option value="">{deliveredTo?.legalName ? `${deliveredTo.legalName} (recebedor)` : "Recebedor das chaves"}</option> : <option value="">Selecione uma parte do contrato</option>}
            {[...new Map(parties.filter((p) => p.personId !== delivery.deliveredToPersonId).map((p) => [p.personId, p])).values()].map((p) => (
              <option key={p.personId} value={p.personId}>{personOf(p.personId)?.legalName || "Pessoa"} — {PARTY_ROLE_LABELS[p.partyRole] || p.partyRole}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Fotos" htmlFor="f-kd-photos" helper="Obrigatórias quando a política do sistema exigir (imóvel usado, entrega de venda).">
          <input id="f-kd-photos" type="file" accept="image/*" multiple onChange={(e) => setReleasePhotos(Array.from(e.target.files || []))} />
        </FormField>
        <FormField label="Prévia do termo" htmlFor="f-kd-term">
          {termPreview?.termText
            ? <pre id="f-kd-term" className={styles.mono} style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{termPreview.termText}</pre>
            : <p>{termPreviewError || "Gerando prévia…"}</p>}
        </FormField>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar entrega de chaves"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>Voltar</Button>
            <Button variant="danger" onClick={handleCancel} disabled={busy || cancelReason.trim().length < 5}>Cancelar entrega</Button>
          </>
        }
      >
        <p>A entrega fica registrada como cancelada (nada é apagado). Informe o motivo — ele vai para a auditoria.</p>
        <FormField label="Motivo" htmlFor="f-kd-cancel-reason" required helper="Mínimo de 5 caracteres.">
          <Input id="f-kd-cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex.: recebedor não é parte do contrato" />
        </FormField>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir entrega de chaves"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </>
        }
      >
        <p>Não há endpoint de exclusão de entrega de chaves na API — esta ação apenas fecha esta janela.</p>
      </Modal>
    </AppShell>
  );
}
