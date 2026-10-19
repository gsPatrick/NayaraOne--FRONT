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
import { getKeyDelivery, getContract, getInspection, releaseKeyDelivery, uploadFile } from "@/lib/api/legal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import {
  KEY_DELIVERY_STATUS_LABELS,
  KEY_DELIVERY_STATUS_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  INSPECTION_STATUS_LABELS,
  INSPECTION_STATUS_TONE,
} from "@/lib/mock/legal";
import { formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

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
            const c = await getContract(deliveryRes.contractId);
            if (!cancelled) setContract(c);
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
            <RowActions
              onView={() => setNotice({ tone: "info", text: "Você já está vendo os detalhes desta entrega." })}
              onEdit={() => setNotice({ tone: "info", text: "Edição de entregas de chave ainda não implementada nesta versão." })}
              onDelete={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        {actionError ? <Alert tone="danger" title="Liberação bloqueada" className={styles.notice}>{actionError}</Alert> : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes da entrega">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Entregue para</dt><dd>{deliveredTo?.legalName || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Entregue em</dt><dd>{delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Observações</dt><dd>{delivery.notes || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Chaves/controles</dt><dd>{delivery.keysCount ?? "—"}{delivery.keysIdentification ? ` (${delivery.keysIdentification})` : ""}</dd></div>
                <div className={styles.detailRow}><dt>Política de fotos</dt><dd>{delivery.photoPolicy || "definida na liberação"}</dd></div>
                <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{delivery.id}</dd></div>
              </dl>
            </Card>
            {delivery.termText ? (
              <Card title={`Termo de entrega (${delivery.termVersion || ""})`}>
                <pre className={styles.mono} style={{ whiteSpace: "pre-wrap" }}>{delivery.termText}</pre>
                <p className={styles.mono}>SHA-256: {delivery.termHash}</p>
              </Card>
            ) : null}
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
                    <span className={styles.linkTitle}>{inspection.id}</span>
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
        <FormField label="Quem assina o termo" htmlFor="f-kd-signer" required helper="Recebedor das chaves ou parte do contrato. O texto do termo é gerado pelo sistema.">
          <Select id="f-kd-signer" value={releaseForm.termSignedByPersonId} onChange={(e) => setReleaseForm((f) => ({ ...f, termSignedByPersonId: e.target.value }))}>
            <option value="">{deliveredTo?.legalName ? `${deliveredTo.legalName} (recebedor)` : "Recebedor das chaves"}</option>
            {people.filter((p) => p.id !== delivery.deliveredToPersonId).map((p) => (
              <option key={p.id} value={p.id}>{p.legalName}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Fotos" htmlFor="f-kd-photos" helper="Obrigatórias quando a política do sistema exigir (imóvel usado, entrega de venda).">
          <input id="f-kd-photos" type="file" accept="image/*" multiple onChange={(e) => setReleasePhotos(Array.from(e.target.files || []))} />
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
