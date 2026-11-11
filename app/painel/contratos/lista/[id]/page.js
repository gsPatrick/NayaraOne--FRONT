"use client";

// Detalhe do contrato (Marco 5): ações só pelas transições do livro, aprovação por versão, assinatura manual com via
// assinada, aditivos assinados por signatário, checklist por etapa e partes com procurador. Cada card é um componente.
import { useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { nullOn404 } from "@/lib/asyncState/notFound";
import { lookupFallback } from "@/lib/asyncState/lookup";
import { activatable } from "@/lib/a11y/keyboard";
import { apiFetch } from "@/lib/api/client";
import { getProperty } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import {
  getContract,
  listContractParties,
  listContractVersions,
  listSignatures,
  listGuarantees,
  listContractAmendments,
  getContractTimeline,
  listContractRequirements,
} from "@/lib/api/legal";
import {
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_TONE,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_TONE,
  CONTRACT_TERMS_LOCKED_STATUSES,
  GUARANTEE_TYPE_LABELS,
  GUARANTEE_TYPE_ICON,
  GUARANTEE_STATUS_LABELS,
  GUARANTEE_STATUS_TONE,
} from "@/lib/labels/juridico";
import { formatBRL, formatDate, formatDateTime, formatContractLabel, humanizeText } from "@/lib/format";
import ContractActions from "./ContractActions";
import ContractStepper from "./ContractStepper";
import VersionsCard from "./VersionsCard";
import SignaturesCard from "./SignaturesCard";
import AmendmentsCard from "./AmendmentsCard";
import RequirementsCard from "./RequirementsCard";
import PartiesCard from "./PartiesCard";
import CorrectionModal from "./CorrectionModal";
import styles from "./page.module.css";

const TIMELINE_TYPE_LABELS = { AMENDMENT: "Aditivo", NOTICE: "Notificação", DELINQUENCY: "Inadimplência", REPAIR: "Reparo", STATUS_CHANGE: "Mudança de situação" };
const TIMELINE_TYPE_TONE = { AMENDMENT: "info", NOTICE: "warning", DELINQUENCY: "danger", REPAIR: "neutral", STATUS_CHANGE: "brand" };
const EMPTY = { contract: null, property: null, parent: null, people: [], users: [], parties: [], versions: [], signatures: [], guarantees: [], amendments: [], timeline: [], requirements: [] };

// Carrega tudo do contrato numa chamada; usado na abertura e depois de cada ação (sem voltar ao estado "carregando").
async function fetchAll(id) {
  const loaded = await Promise.all([
    getContract(id),
    listContractParties(id),
    listContractVersions(id),
    listGuarantees({ contractId: id }),
    listContractAmendments(id),
    listPeople(),
    getContractTimeline(id).catch(lookupFallback("a linha do tempo do contrato", { items: [] })),
    listContractRequirements(id).catch(lookupFallback("as exigências do contrato")),
    apiFetch("/users").catch(lookupFallback("os usuários")),
  ]).catch(nullOn404);
  if (!loaded) return EMPTY;
  const [contract, parties, versions, guarantees, amendments, people, timeline, requirements, users] = loaded;
  const list = versions || [];
  const latest = list[list.length - 1] || null;
  const [property, parent, signatures] = await Promise.all([
    contract?.propertyId ? getProperty(contract.propertyId).catch(() => null) : null,
    contract?.parentContractId ? getContract(contract.parentContractId).catch(() => null) : null,
    latest ? listSignatures(latest.id).catch(lookupFallback("as assinaturas")) : [],
  ]);
  return {
    contract, property, parent, people: people || [], users: users || [], parties: parties || [], versions: list,
    signatures: signatures || [], guarantees: guarantees || [], amendments: amendments || [], timeline: (timeline && timeline.items) || [], requirements: requirements || [],
  };
}

export default function ContratoDetailPage({ params }) {
  const router = useRouter();
  const [data, setData] = useState(EMPTY);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [amendmentOpen, setAmendmentOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => fetchAll(params.id).then((next) => { setData(next); return true; }), { deps: [params.id], isEmpty: () => false });

  async function refresh() {
    try {
      setData(await fetchAll(params.id));
    } catch (err) {
      setActionError("A ação foi feita, mas não foi possível recarregar o contrato. Atualize a página.");
    }
  }

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Contrato" backHref="/painel/contratos/lista">
        <AsyncState result={loadQuery} loadingLabel="Carregando contrato..." />
      </AppShell>
    );
  }

  const { contract, property, parent, people, users, parties, versions, signatures, guarantees, amendments, timeline, requirements } = data;
  if (!contract) return notFound();

  const personOf = (id) => people.find((p) => p.id === id) || null;
  const userName = (id) => users.find((u) => u.id === id)?.name || "usuário não identificado";
  const latestVersion = versions[versions.length - 1] || null;
  const termsLocked = CONTRACT_TERMS_LOCKED_STATUSES.includes(contract.status);
  const legacyCancelled = contract.status === "CANCELLED";
  const common = { onChanged: refresh, onNotice: setNotice, onError: setActionError };

  return (
    <AppShell title={formatContractLabel(contract) || "Contrato"} backHref="/painel/contratos/lista">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={CONTRACT_STATUS_TONE[contract.status] || "neutral"} className={styles.badgeBig}>{CONTRACT_STATUS_LABELS[contract.status] || "Situação desconhecida"}</Badge>
            <Badge tone={CONTRACT_TYPE_TONE[contract.contractType] || "neutral"}>{CONTRACT_TYPE_LABELS[contract.contractType] || "Contrato"}</Badge>
          </div>
          {legacyCancelled ? null : (
            <ContractActions contract={contract} latestVersion={latestVersion} parties={parties} personOf={personOf} {...common} />
          )}
        </div>

        {/* PADRAO §1.3: erro de ação fixo, acima de qualquer modal. */}
        {actionError ? (
          <div data-testid="contract-action-error" style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">
              {actionError}{" "}
              <button type="button" className={styles.linkBtn} onClick={() => setActionError("")}>Fechar</button>
            </Alert>
          </div>
        ) : null}
        {notice ? <div className={styles.notice} data-testid="contract-notice"><Alert tone={notice.tone}>{notice.text}</Alert></div> : null}

        <ContractStepper status={contract.status} />

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card
              title="Detalhes do contrato"
              actions={!legacyCancelled && !termsLocked ? <Button size="sm" variant="secondary" onClick={() => setCorrectionOpen(true)}><Icon name="pencil" size={14} /> Corrigir dados</Button> : null}
            >
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Valor total</dt><dd className={styles.amount}>{formatBRL(contract.totalValue)}</dd></div>
                <div className={styles.detailRow}><dt>Imóvel</dt><dd>{property?.name || "Sem imóvel vinculado"}</dd></div>
                <div className={styles.detailRow}><dt>Início de vigência</dt><dd>{contract.startsAt ? formatDate(contract.startsAt) : "Não definido"}</dd></div>
                <div className={styles.detailRow}><dt>Fim de vigência</dt><dd>{contract.endsAt ? formatDate(contract.endsAt) : "Prazo indeterminado"}</dd></div>
                <div className={styles.detailRow}><dt>Número</dt><dd>{contract.contractNumber || `Sem número (criado em ${formatDate(contract.createdAt)})`}</dd></div>
                {contract.parentContractId ? (
                  <div className={styles.detailRow}>
                    <dt>Contrato principal</dt>
                    <dd>
                      <button type="button" className={styles.linkBtn} onClick={() => router.push(`/painel/contratos/lista/${contract.parentContractId}`)}>
                        {parent ? `${formatContractLabel(parent)} — ${CONTRACT_TYPE_LABELS[parent.contractType] || "Contrato"}` : "Abrir contrato principal"}
                      </button>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {termsLocked ? (
                <p className={styles.partyRole} style={{ marginTop: 12 }} data-testid="contract-terms-locked">
                  Valor, vigência, imóvel e número só mudam por aditivo.{" "}
                  <button type="button" className={styles.linkBtn} onClick={() => setAmendmentOpen(true)}>Criar aditivo</button>
                </p>
              ) : null}
            </Card>

            <RequirementsCard
              contractId={contract.id}
              requirements={requirements}
              onRequirements={(next) => setData((prev) => ({ ...prev, requirements: typeof next === "function" ? next(prev.requirements) : next }))}
              onNotice={setNotice}
              onError={setActionError}
            />

            <PartiesCard contract={contract} parties={parties} people={people} personOf={personOf} onChanged={refresh} onNotice={setNotice} />

            <Card title="Linha do tempo" subtitle="Aditivos, notificações, inadimplência e reparos, em ordem cronológica">
              {timeline.length === 0 ? (
                <EmptyState icon="calendar" title="Sem eventos" description="Nenhum aditivo, notificação, inadimplência ou reparo registrado ainda." />
              ) : (
                <ul className={styles.timelineList}>
                  {timeline.map((event, idx) => (
                    <li key={`${event.type}-${event.referenceId}-${idx}`} className={styles.timelineItem}>
                      <Badge tone={TIMELINE_TYPE_TONE[event.type] || "neutral"}>{TIMELINE_TYPE_LABELS[event.type] || "Evento"}</Badge>
                      <span className={styles.timelineDate}>{event.occurredAt ? formatDateTime(event.occurredAt) : "Sem data registrada"}</span>
                      <span className={styles.timelineSummary}>{humanizeText(event.summary)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <VersionsCard contract={contract} versions={versions} userName={userName} {...common} />

            <AmendmentsCard
              contract={contract}
              amendments={amendments}
              versions={versions}
              parties={parties}
              personOf={personOf}
              createOpen={amendmentOpen}
              onCreateOpenChange={setAmendmentOpen}
              onChanged={refresh}
              onNotice={setNotice}
              onViewFile={setViewerFile}
            />

            <SignaturesCard contract={contract} latestVersion={latestVersion} signatures={signatures} parties={parties} personOf={personOf} onChanged={refresh} onNotice={setNotice} />
          </div>

          <div className={styles.sideCol}>
            <Card
              title="Garantias"
              subtitle="Fiador, seguro-fiança, caução ou título de capitalização"
              actions={<Button size="sm" variant="secondary" href="/painel/contratos/garantias">Ver todas</Button>}
            >
              {guarantees.length === 0 ? (
                <EmptyState icon="shield" title="Sem garantias" description="Nenhuma garantia cadastrada para este contrato." />
              ) : (
                guarantees.map((g) => (
                  <div key={g.id} className={styles.guaranteeCard}>
                    <span className={styles.guaranteeIcon}><Icon name={GUARANTEE_TYPE_ICON[g.guaranteeType] || "shield"} size={18} /></span>
                    <div className={styles.guaranteeInfo}>
                      <span className={styles.guaranteeTitle}>{GUARANTEE_TYPE_LABELS[g.guaranteeType] || "Garantia"}</span>
                      <span className={styles.guaranteeMeta}>
                        {g.guarantorPersonId ? personOf(g.guarantorPersonId)?.legalName : g.value != null ? formatBRL(g.value) : "Sem valor cadastrado"}
                      </span>
                    </div>
                    <Badge tone={GUARANTEE_STATUS_TONE[g.status] || "neutral"}>{GUARANTEE_STATUS_LABELS[g.status] || "Situação desconhecida"}</Badge>
                  </div>
                ))
              )}
            </Card>

            {property ? (
              <Card title="Imóvel vinculado">
                <div className={styles.partyRow} style={{ cursor: "pointer" }} {...activatable(() => router.push(`/painel/imoveis/${property.id}`))}>
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

      <CorrectionModal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        contract={contract}
        onCorrected={async () => {
          setCorrectionOpen(false);
          setNotice({ tone: "success", text: "Dados do contrato corrigidos, com o motivo registrado na auditoria." });
          await refresh();
        }}
      />

      <FileViewerModal open={!!viewerFile} onClose={() => setViewerFile(null)} file={viewerFile} fileId={viewerFile?.id} />
    </AppShell>
  );
}
