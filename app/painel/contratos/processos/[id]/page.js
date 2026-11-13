"use client";

// Detalhe do processo jurídico (Caderno M5 §14/§15). Cada bloco é um componente deste diretório: prazos (origem,
// responsável, conclusão com nota, cancelamento), partes, documentos e provas, linha do tempo, valores/recebível e
// dossiê. A linha do tempo recarrega quando um bloco registra algo.
import { useState } from "react";
import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { withCurrentUser } from "@/lib/legal/useActiveUsers";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { nullOn404 } from "@/lib/asyncState/notFound";
import { lookupFallback } from "@/lib/asyncState/lookup";
import { getProperty } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { apiFetch } from "@/lib/api/client";
import { getLegalCase, getContract, updateLegalCase } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CASE_TYPE_LABELS, CASE_TYPE_TONE, CASE_STATUS_LABELS, CASE_STATUS_TONE } from "@/lib/mock/legal";
import { CASE_PHASE_LABELS, CASE_RISK_LABELS } from "@/lib/labels/juridico";
import { formatContractLabel } from "@/lib/format";
import DeadlinesCard from "./DeadlinesCard";
import CasePartiesCard from "./CasePartiesCard";
import CaseDocumentsCard from "./CaseDocumentsCard";
import CaseTimelineCard from "./CaseTimelineCard";
import CaseReceivableCard from "./CaseReceivableCard";
import EvidencePackagesCard from "./EvidencePackagesCard";
import styles from "./page.module.css";

const STATUS_OPTIONS = ["OPEN", "CLOSED"];

export default function ProcessoDetailPage({ params }) {
  const [legalCase, setLegalCase] = useState(null);
  const [contract, setContract] = useState(null);
  const [property, setProperty] = useState(null);
  const [users, setUsers] = useState([]);
  const [people, setPeople] = useState([]);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);
  const refreshTimeline = () => setTimelineKey((k) => k + 1);

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => {
    return Promise.all([
      getLegalCase(params.id),
      apiFetch("/users?status=ACTIVE").catch(lookupFallback("os usuários")),
      listPeople().catch(lookupFallback("as pessoas")),
    ])
      .catch(nullOn404) // 404 da API: o registro não existe, a tela chama notFound()
      .then(async (loaded) => {
        if (!loaded) {
          setLegalCase(null);
          return;
        }
        const [caseRes, usersRes, peopleRes] = loaded;
        setLegalCase(caseRes);
        setUsers(withCurrentUser(usersRes));
        setPeople(Array.isArray(peopleRes) ? peopleRes : []);
        if (caseRes?.contractId) {
          try {
            setContract(await getContract(caseRes.contractId));
          } catch {
            // Contrato pode não estar disponível.
          }
        }
        if (caseRes?.propertyId) {
          try {
            setProperty(await getProperty(caseRes.propertyId));
          } catch {
            // Imóvel pode não estar disponível.
          }
        }
      })
      .then(() => true);
  }, { deps: [params.id], isEmpty: () => false });

  function userName(id) {
    return users.find((u) => u.id === id)?.name || "Usuário não identificado";
  }

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Processo" backHref="/painel/contratos/processos">
        <AsyncState result={loadQuery} loadingLabel="Carregando processo..." />
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
      setNotice({ tone: "success", text: `Situação atualizada para "${CASE_STATUS_LABELS[status] || "nova situação"}".` });
      refreshTimeline();
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao atualizar a situação do processo."));
    } finally {
      setBusy(false);
    }
  }

  // FIX (homologação 23/09/2026): caseNumber é opcional — o cabeçalho usa o tipo quando não há número (nunca o id).
  const title = legalCase.caseNumber && legalCase.caseNumber.trim() ? legalCase.caseNumber : `${CASE_TYPE_LABELS[legalCase.caseType] || "Processo"} sem número`;

  return (
    <AppShell title={title} backHref="/painel/contratos/processos">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={CASE_TYPE_TONE[legalCase.caseType]}>{CASE_TYPE_LABELS[legalCase.caseType] || "Processo"}</Badge>
            <Badge tone={CASE_STATUS_TONE[legalCase.status] || "neutral"}>{CASE_STATUS_LABELS[legalCase.status] || "Situação desconhecida"}</Badge>
            {legalCase.legalHold ? <Badge tone="danger">Retenção legal</Badge> : null}
          </div>
          <Select value={legalCase.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={busy} aria-label="Situação do processo">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>

        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}
        {notice ? <Alert tone={notice.tone} className={styles.notice}>{notice.text}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes do processo">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Resumo</dt><dd>{legalCase.summary || "Sem resumo"}</dd></div>
                <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract ? formatContractLabel(contract) : "Sem contrato vinculado"}</dd></div>
                <div className={styles.detailRow}><dt>Imóvel vinculado</dt><dd>{property?.name || "Sem imóvel vinculado"}</dd></div>
                <div className={styles.detailRow}><dt>Responsável</dt><dd>{legalCase.responsibleUserId ? userName(legalCase.responsibleUserId) : "Sem responsável definido"}</dd></div>
                {legalCase.phase ? <div className={styles.detailRow}><dt>Fase</dt><dd>{CASE_PHASE_LABELS[legalCase.phase] || "Fase personalizada"}</dd></div> : null}
                {legalCase.riskLevel ? <div className={styles.detailRow}><dt>Risco</dt><dd>{CASE_RISK_LABELS[legalCase.riskLevel] || "Não classificado"}</dd></div> : null}
              </dl>
            </Card>

            <DeadlinesCard legalCase={legalCase} users={users} onChanged={refreshTimeline} />
            <CasePartiesCard legalCase={legalCase} people={people} onChanged={refreshTimeline} />
            <CaseDocumentsCard legalCase={legalCase} onChanged={refreshTimeline} />
            <CaseTimelineCard legalCase={legalCase} users={users} refreshKey={timelineKey} />
          </div>

          <div className={styles.sideCol}>
            <CaseReceivableCard legalCase={legalCase} onCaseUpdated={(updated) => { setLegalCase(updated); refreshTimeline(); }} />
            <EvidencePackagesCard legalCase={legalCase} userName={userName} onChanged={refreshTimeline} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
