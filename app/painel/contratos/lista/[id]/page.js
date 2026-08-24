"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import Avatar from "@/components/atoms/Avatar/Avatar";
import { getProperty } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import {
  getContract,
  listContractParties,
  listContractVersions,
  createContractVersion,
  listSignatures,
  listGuarantees,
  transitionContract,
} from "@/lib/api/legal";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_TONE,
  CONTRACT_STATUS_FLOW,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  PARTY_ROLE_LABELS,
  SIGNATURE_STATUS_LABELS,
  SIGNATURE_STATUS_TONE,
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_TYPE_ICON,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_STATUS_TONE,
  nextContractStatus,
} from "@/lib/mock/legal";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

export default function ContratoDetailPage({ params }) {
  const router = useRouter();
  const [contract, setContract] = useState(null);
  const [property, setProperty] = useState(null);
  const [people, setPeople] = useState([]);
  const [parties, setParties] = useState([]);
  const [versions, setVersions] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [guarantees, setGuarantees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      getContract(params.id),
      listContractParties(params.id),
      listContractVersions(params.id),
      listGuarantees({ contractId: params.id }),
      listPeople(),
    ])
      .then(async ([contractRes, partiesRes, versionsRes, guaranteesRes, peopleRes]) => {
        if (cancelled) return;
        setContract(contractRes);
        setParties(partiesRes || []);
        setVersions(versionsRes || []);
        setGuarantees(guaranteesRes || []);
        setPeople(peopleRes || []);
        if (contractRes?.propertyId) {
          try {
            const prop = await getProperty(contractRes.propertyId);
            if (!cancelled) setProperty(prop);
          } catch {
            // Imóvel pode não estar disponível — mantém property nulo, tela continua.
          }
        }
        const latestVersion = (versionsRes || [])[versionsRes.length - 1] || null;
        if (latestVersion) {
          const sigs = await listSignatures(latestVersion.id);
          if (!cancelled) setSignatures(sigs || []);
        }
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar contrato."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  if (loading) {
    return (
      <AppShell title="Contrato" backHref="/painel/contratos/lista">
        <SkeletonDetail sections={4} />
      </AppShell>
    );
  }

  if (loadError) {
    return (
      <AppShell title="Contrato" backHref="/painel/contratos/lista">
        <Alert tone="danger">{loadError}</Alert>
      </AppShell>
    );
  }

  if (!contract) return notFound();

  const latestVersion = versions[versions.length - 1] || null;
  const next = nextContractStatus(contract.status);

  async function handleAdvance() {
    if (!next) return;
    setActionError("");
    setBusy(true);
    try {
      const updated = await transitionContract(contract.id, next);
      setContract(updated);
      setNotice({ tone: "success", text: `Contrato avançou para "${CONTRACT_STATUS_LABELS[next]}".` });
    } catch (err) {
      setActionError(err.message || "Erro ao avançar status do contrato.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setActionError("");
    setBusy(true);
    try {
      const updated = await transitionContract(contract.id, "CANCELLED");
      setContract(updated);
      setNotice({ tone: "danger", text: "Contrato cancelado." });
    } catch (err) {
      setActionError(err.message || "Erro ao cancelar contrato.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNewVersion() {
    setActionError("");
    setBusy(true);
    try {
      const versionNumber = versions.length + 1;
      const newVersion = await createContractVersion(contract.id, {
        content: `Versão ${versionNumber} do contrato ${contract.contractNumber}`,
      });
      setVersions((prev) => [...prev, newVersion]);
      setNotice({ tone: "info", text: `Versão ${versionNumber} criada — versões são imutáveis, nunca editadas.` });
    } catch (err) {
      setActionError(err.message || "Erro ao criar nova versão do contrato.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={contract.contractNumber} backHref="/painel/contratos/lista">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={CONTRACT_STATUS_TONE[contract.status]} className={styles.badgeBig}>{CONTRACT_STATUS_LABELS[contract.status]}</Badge>
            <Badge tone={CONTRACT_TYPE_TONE[contract.contractType]}>{CONTRACT_TYPE_LABELS[contract.contractType]}</Badge>
          </div>
          <div className={styles.actions}>
            {contract.status !== "CANCELLED" && contract.status !== "ACTIVE" ? (
              <Button variant="secondary" onClick={handleCancel} disabled={busy}><Icon name="ban" size={16} /> Cancelar</Button>
            ) : null}
            {next ? (
              <Button onClick={handleAdvance} disabled={busy}><Icon name="check" size={16} /> Avançar etapa ({CONTRACT_STATUS_LABELS[next]})</Button>
            ) : null}
          </div>
        </div>

        {actionError ? <Alert tone="danger" className={styles.notice}>{actionError}</Alert> : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <Card title="Máquina de estados" subtitle="Fluxo linear do contrato — cancelamento é um estado alternativo, fora da sequência">
          <div className={styles.stepper}>
            {CONTRACT_STATUS_FLOW.map((step, idx) => {
              const currentIdx = CONTRACT_STATUS_FLOW.indexOf(contract.status);
              const isDone = contract.status !== "CANCELLED" && idx < currentIdx;
              const isCurrent = contract.status !== "CANCELLED" && idx === currentIdx;
              return (
                <div
                  key={step}
                  className={[styles.step, isDone ? styles.stepDone : "", isCurrent ? styles.stepCurrent : ""].filter(Boolean).join(" ")}
                >
                  {idx > 0 ? <span className={styles.stepLine} /> : null}
                  <span className={styles.stepDot}>{isDone ? <Icon name="check" size={14} /> : idx + 1}</span>
                  <span className={styles.stepLabel}>{CONTRACT_STATUS_LABELS[step]}</span>
                </div>
              );
            })}
          </div>
          {contract.status === "CANCELLED" ? (
            <p className={styles.cancelledNote}>Este contrato foi cancelado — a máquina de estados linear não se aplica mais.</p>
          ) : null}
        </Card>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes do contrato">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Valor total</dt><dd className={styles.amount}>{formatBRL(contract.totalValue)}</dd></div>
                <div className={styles.detailRow}><dt>Imóvel</dt><dd>{property?.name || "Sem imóvel vinculado"}</dd></div>
                <div className={styles.detailRow}><dt>Início de vigência</dt><dd>{contract.startsAt ? formatDate(contract.startsAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Fim de vigência</dt><dd>{contract.endsAt ? formatDate(contract.endsAt) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>ID</dt><dd className={styles.mono}>{contract.id}</dd></div>
              </dl>
            </Card>

            <Card title="Partes do contrato" subtitle="Pessoas vinculadas ao contrato e seus papéis">
              {parties.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma parte cadastrada.</p>
              ) : (
                parties.map((party) => {
                  const person = personOf(party.personId);
                  return (
                    <div key={party.id} className={styles.partyRow}>
                      <Avatar name={person?.legalName || "?"} size="sm" />
                      <div className={styles.partyInfo}>
                        <span className={styles.partyName}>{person?.legalName || "—"}</span>
                        <span className={styles.partyRole}>{PARTY_ROLE_LABELS[party.partyRole]}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </Card>

            <Card
              title="Versões do documento"
              subtitle="Imutáveis — cada alteração cria uma nova versão, nunca edita a anterior"
              actions={<Button size="sm" variant="secondary" onClick={handleNewVersion} disabled={busy}><Icon name="document" size={16} /> Nova versão</Button>}
            >
              {versions.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma versão gerada ainda.</p>
              ) : (
                [...versions].reverse().map((version) => (
                  <div key={version.id} className={styles.versionRow}>
                    <div className={styles.versionInfo}>
                      <span className={styles.versionTitle}>Versão {version.versionNumber}</span>
                      <span className={styles.versionHash} title={version.contentHash}>{version.contentHash}</span>
                    </div>
                    <span className={styles.versionDate}>{formatDate(version.effectiveFrom)}</span>
                  </div>
                ))
              )}
            </Card>

            <Card title="Assinaturas" subtitle={latestVersion ? `Referentes à versão ${latestVersion.versionNumber}` : "Sem versão de documento gerada"}>
              {signatures.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma assinatura registrada para a versão atual.</p>
              ) : (
                signatures.map((sig) => {
                  const person = personOf(sig.personId);
                  return (
                    <div key={sig.id} className={styles.signatureRow}>
                      <Avatar name={person?.legalName || "?"} size="sm" />
                      <div className={styles.signatureInfo}>
                        <span className={styles.signatureName}>{person?.legalName || "—"}</span>
                        <span className={styles.signatureMeta}>{sig.signedAt ? `Assinado em ${formatDateTime(sig.signedAt)}` : "Aguardando assinatura"}</span>
                      </div>
                      <Badge tone={SIGNATURE_STATUS_TONE[sig.status]}>{SIGNATURE_STATUS_LABELS[sig.status]}</Badge>
                    </div>
                  );
                })
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card
              title="Garantias"
              subtitle="Fiador, seguro-fiança, caução ou título de capitalização"
              actions={<Button size="sm" variant="secondary" href="/painel/contratos/garantias">Ver todas</Button>}
            >
              {guarantees.length === 0 ? (
                <p className={styles.emptyText}>Nenhuma garantia cadastrada para este contrato.</p>
              ) : (
                guarantees.map((g) => (
                  <div key={g.id} className={styles.guaranteeCard}>
                    <span className={styles.guaranteeIcon}><Icon name={GUARANTEE_TYPE_ICON[g.guaranteeType]} size={18} /></span>
                    <div className={styles.guaranteeInfo}>
                      <span className={styles.guaranteeTitle}>{GUARANTEE_TYPE_LABELS[g.guaranteeType]}</span>
                      <span className={styles.guaranteeMeta}>
                        {g.guarantorPersonId ? personOf(g.guarantorPersonId)?.legalName : g.value != null ? formatBRL(g.value) : "—"}
                      </span>
                    </div>
                    <Badge tone={GUARANTEE_STATUS_TONE[g.status] || "neutral"}>{GUARANTEE_STATUS_LABELS[g.status] || g.status}</Badge>
                  </div>
                ))
              )}
            </Card>

            {property ? (
              <Card title="Imóvel vinculado">
                <div className={styles.partyRow} style={{ cursor: "pointer" }} onClick={() => router.push(`/painel/imoveis/${property.id}`)}>
                  <div className={styles.partyInfo}>
                    <span className={styles.partyName}>{property.name}</span>
                    <span className={styles.partyRole}>{property.city}</span>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
