"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { nullOn404 } from "@/lib/asyncState/notFound";
import { lookupFallback } from "@/lib/asyncState/lookup";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import Button from "@/components/atoms/Button/Button";
import { listPeople } from "@/lib/api/people";
import { getKeyDelivery, getContract, getInspection, listContractParties, getKeyDeliveryTermPreview } from "@/lib/api/legal";
import {
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
  KEY_DELIVERY_TERM_TYPE_LABELS,
  KEY_TERM_SIGNATURE_METHOD_LABELS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  INSPECTION_TYPE_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
} from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDate, formatDateTime, formatContractLabel } from "@/lib/format";
import { activatable } from "@/lib/a11y/keyboard";
import ReleaseKeysModal from "./ReleaseKeysModal";
import CancelDeliveryModal from "./CancelDeliveryModal";
import styles from "./page.module.css";

const PHOTO_POLICY_LABELS = {
  REQUIRED_USED_PROPERTY: "Fotos obrigatórias (imóvel usado)",
  REQUIRED_SALE_DELIVERY: "Fotos obrigatórias (entrega de venda)",
  NOT_REQUIRED_LEASE_CHECKIN_SIGNED: "Fotos dispensadas (locação com vistoria de entrada assinada)",
  REQUIRED_BY_CONTRACT_TYPE: "Fotos obrigatórias (política da empresa para este tipo de contrato)",
  NOT_REQUIRED_BY_CONTRACT_TYPE: "Fotos dispensadas (política da empresa para este tipo de contrato)",
};
const EMPTY_FORM = { keysCount: "", keysIdentification: "", termSignedByPersonId: "" };

export default function EntregaChavesDetailPage({ params }) {
  const router = useRouter();
  const canDeliver = useHasPermission("lease.keys.deliver");
  const [delivery, setDelivery] = useState(null);
  const [contract, setContract] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [people, setPeople] = useState([]);
  const [parties, setParties] = useState([]);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseForm, setReleaseForm] = useState(EMPTY_FORM);
  const [termPreview, setTermPreview] = useState(null);
  const [termPreviewError, setTermPreviewError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("liberar") === "1") setReleaseOpen(true);
  }, []);

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => {
    return Promise.all([getKeyDelivery(params.id), listPeople()])
      .catch(nullOn404) // 404 da API: o registro não existe, a tela chama notFound()
      .then(async (loaded) => {
        if (!loaded) {
          setDelivery(null);
          return;
        }
        const [deliveryRes, peopleRes] = loaded;
        setDelivery(deliveryRes);
        setPeople(Array.isArray(peopleRes) ? peopleRes : []);
        if (deliveryRes?.contractId) {
          const [c, ps] = await Promise.all([
            getContract(deliveryRes.contractId).catch(lookupFallback("o contrato da entrega", null)),
            listContractParties(deliveryRes.contractId).catch(lookupFallback("as partes do contrato")),
          ]);
          setContract(c);
          setParties(Array.isArray(ps) ? ps : []);
        }
        if (deliveryRes?.inspectionId) {
          setInspection(await getInspection(deliveryRes.inspectionId).catch(lookupFallback("a vistoria vinculada", null)));
        }
      })
      .then(() => true);
  }, { deps: [params.id], isEmpty: () => false });

  // F7: prévia do termo (gerada no servidor) atualizada conforme o formulário de liberação.
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
        .catch((err) => { if (!cancelled) setTermPreviewError(legalErrorMessage(err, "Não foi possível gerar a prévia do termo.")); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [delivery?.id, delivery?.status, delivery?.termText, delivery?.deliveredToPersonId, releaseOpen, releaseForm]);

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <AsyncState result={loadQuery} loadingLabel="Carregando entrega de chaves..." />
      </AppShell>
    );
  }

  if (!delivery) return notFound();

  const deliveredTo = personOf(delivery.deliveredToPersonId);
  const termSigner = delivery.termSignedByPersonId ? personOf(delivery.termSignedByPersonId) : null;
  // F6: entregas antigas (antes da regra) podem ter recebedor que não é parte — a API recusa a liberação.
  const recipientIsParty = parties.some((p) => p.personId === delivery.deliveredToPersonId);
  const termTitle = KEY_DELIVERY_TERM_TYPE_LABELS[delivery.termType] || KEY_DELIVERY_TERM_TYPE_LABELS.KEY_DELIVERY;
  const pending = delivery.status === "PENDING";

  return (
    <AppShell title={contract ? formatContractLabel(contract) : "Entrega de chaves"} backHref="/painel/contratos/entrega-chaves">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={KEY_DELIVERY_STATUS_TONE[delivery.status]}>{KEY_DELIVERY_STATUS_LABELS[delivery.status] || "Situação não identificada"}</Badge>
            {contract ? <Badge tone={CONTRACT_STATUS_TONE[contract.status]}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge> : null}
            {inspection ? <Badge tone={INSPECTION_STATUS_TONE[inspection.status]}>Vistoria: {INSPECTION_STATUS_LABELS[inspection.status]}</Badge> : null}
          </div>
          <div className={styles.actionsWrap}>
            {pending && canDeliver ? (
              <Button onClick={() => { setActionError(""); setReleaseOpen(true); }}>
                <Icon name="key" size={16} /> Liberar chaves
              </Button>
            ) : null}
            {pending && canDeliver ? (
              <Button variant="secondary" onClick={() => setCancelOpen(true)}>Cancelar entrega</Button>
            ) : null}
          </div>
        </div>

        {pending && !canDeliver ? (
          <Alert tone="info" title="Sem permissão">Você não tem a permissão de entregar chaves. Peça ao administrador o acesso de entrega de chaves para liberar ou cancelar esta entrega.</Alert>
        ) : null}
        {pending && contract && !recipientIsParty ? (
          <Alert tone="warning" title="Recebedor não é parte do contrato">
            {deliveredTo?.legalName || "O recebedor"} não está entre as partes deste contrato. A liberação será recusada — cadastre-o como parte do contrato ou registre uma nova entrega para uma das partes.
          </Alert>
        ) : null}
        {delivery.status === "CANCELLED" ? (
          <Alert tone="info" title="Entrega cancelada">
            Cancelada em {delivery.cancelledAt ? formatDateTime(delivery.cancelledAt) : "data sem registro"}. Motivo: {delivery.cancelReason || "sem motivo registrado"}
          </Alert>
        ) : null}
        {actionError ? <div data-testid="key-delivery-error"><Alert tone="danger" title="Ação bloqueada">{actionError}</Alert></div> : null}
        {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes da entrega">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Entregue para</dt><dd>{deliveredTo?.legalName || "Pessoa não encontrada"}</dd></div>
                <div className={styles.detailRow}><dt>Entregue em</dt><dd>{delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "Ainda não entregue"}</dd></div>
                <div className={styles.detailRow}><dt>Observações</dt><dd>{delivery.notes || "Sem observações"}</dd></div>
                <div className={styles.detailRow}><dt>Chaves/controles</dt><dd>{delivery.keysCount ?? "Sem quantidade registrada"}{delivery.keysIdentification ? ` (${delivery.keysIdentification})` : ""}</dd></div>
                <div className={styles.detailRow}><dt>Política de fotos</dt><dd>{PHOTO_POLICY_LABELS[delivery.photoPolicy || termPreview?.photoPolicy] || "Definida pelo sistema na liberação"}</dd></div>
                <div className={styles.detailRow}><dt>Termo</dt><dd>{delivery.status === "RELEASED" ? `${termTitle} — gerado e assinado` : delivery.status === "CANCELLED" ? "Não gerado (entrega cancelada)" : `${termTitle} — gerado pelo sistema na liberação (veja a prévia)`}</dd></div>
                {delivery.status === "RELEASED" ? (
                  <>
                    <div className={styles.detailRow}><dt>Assinado por</dt><dd>{termSigner?.legalName || deliveredTo?.legalName || "Parte do contrato"}{delivery.termSignedAt ? ` em ${formatDateTime(delivery.termSignedAt)}` : ""}</dd></div>
                    <div className={styles.detailRow}><dt>Assinatura do termo</dt><dd>{KEY_TERM_SIGNATURE_METHOD_LABELS[delivery.termSignatureMethod] || (delivery.termEvidenceFileId ? "Via assinada anexada" : "Sem via assinada registrada (entrega anterior à regra)")}</dd></div>
                    <div className={styles.detailRow}>
                      <dt>Via assinada</dt>
                      <dd>
                        {delivery.termEvidenceFileId ? (
                          <Button size="sm" variant="secondary" onClick={() => setViewerFile({ id: delivery.termEvidenceFileId })}>
                            <Icon name="eye" size={14} /> Ver via assinada
                          </Button>
                        ) : "Não anexada"}
                        {delivery.termEvidenceSha256 ? <span className={styles.mono} title={`SHA-256: ${delivery.termEvidenceSha256}`}> integridade registrada</span> : null}
                      </dd>
                    </div>
                    <div className={styles.detailRow}>
                      <dt>Fotos</dt>
                      <dd>
                        {(delivery.photosFileIds || []).length === 0 ? "Sem fotos" : (delivery.photosFileIds || []).map((fileId, i) => (
                          <Button key={fileId} size="sm" variant="ghost" onClick={() => setViewerFile({ id: fileId })}>Foto {i + 1}</Button>
                        ))}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </Card>
            {delivery.termText ? (
              <Card title={termTitle}>
                <pre className={styles.mono} style={{ whiteSpace: "pre-wrap" }}>{delivery.termText}</pre>
                <p className={styles.mono}>Código de integridade (SHA-256): {delivery.termHash}</p>
              </Card>
            ) : delivery.status === "CANCELLED" ? null : (
              <Card title={`Prévia do ${termTitle.charAt(0).toLowerCase()}${termTitle.slice(1)}`}>
                {termPreview?.termText ? (
                  <pre className={styles.mono} style={{ whiteSpace: "pre-wrap" }}>{termPreview.termText}</pre>
                ) : (
                  <Button variant="secondary" onClick={() => getKeyDeliveryTermPreview(delivery.id, {}).then(setTermPreview).catch((e) => setTermPreviewError(legalErrorMessage(e)))}>
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
                <div className={styles.linkRow} {...activatable(() => router.push(`/painel/contratos/lista/${contract.id}`))}>
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

            <Card title="Vistoria vinculada">
              {inspection ? (
                <div className={styles.linkRow} {...activatable(() => router.push(`/painel/contratos/vistorias/${inspection.id}`))}>
                  <div className={styles.linkInfo}>
                    <span className={styles.linkTitle}>Vistoria de {(INSPECTION_TYPE_LABELS[inspection.inspectionType] || "").toLowerCase()}</span>
                    <span className={styles.linkSub}>
                      {[INSPECTION_STATUS_LABELS[inspection.status], inspection.completedAt || inspection.scheduledAt ? formatDate(inspection.completedAt || inspection.scheduledAt) : null].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              ) : (
                <EmptyState icon="document" title="Sem vistoria vinculada" description="Na liberação vale a vistoria de entrada concluída e assinada mais recente deste contrato." />
              )}
            </Card>
          </div>
        </div>
      </div>

      <ReleaseKeysModal
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        delivery={delivery}
        parties={parties}
        personOf={personOf}
        recipientIsParty={recipientIsParty}
        form={releaseForm}
        onFormChange={(patch) => setReleaseForm((f) => ({ ...f, ...patch }))}
        termPreview={termPreview}
        termPreviewError={termPreviewError}
        onReleased={(updated) => {
          setDelivery(updated);
          setReleaseOpen(false);
          setReleaseForm(EMPTY_FORM);
          setNotice({ tone: "success", text: "Chaves entregues. O termo foi gerado pelo sistema e a via assinada ficou registrada." });
        }}
        onRefused={(message) => setActionError(message)}
      />

      <CancelDeliveryModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        deliveryId={delivery.id}
        onCancelled={(updated) => {
          setDelivery(updated);
          setCancelOpen(false);
          setNotice({ tone: "success", text: "Entrega de chaves cancelada. O motivo ficou registrado na auditoria." });
        }}
      />

      <FileViewerModal open={!!viewerFile} onClose={() => setViewerFile(null)} file={viewerFile} fileId={viewerFile?.id} />
    </AppShell>
  );
}
