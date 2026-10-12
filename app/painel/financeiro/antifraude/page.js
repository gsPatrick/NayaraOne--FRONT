"use client";

// GAP REAL CORRIGIDO (verificação cética adicional, Marco 4, 12/10/2026): finance.anomaly_cases
// (Caderno §5/§17/§19 — "Estorno frequente → Anomaly case") tinha service completo
// (anomalyCases.service.js: listAnomalyCases/resolveAnomalyCase) e já era contado no relatório
// semanal como "openHighRiskAnomalies", mas nenhuma rota HTTP expunha list/resolve — todo caso
// detectado pelo motor de antifraude ficava invisível, só um número solto no relatório, sem
// nenhum humano conseguir abrir e ver qual caso é qual nem resolvê-lo. Rotas adicionadas em
// finance.routes.js (GET /finance/anomaly-cases, POST /finance/anomaly-cases/:id/resolve); esta
// tela é a primeira forma de um humano realmente operar essa fila.

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import { SkeletonList } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import StatTile from "@/components/molecules/StatTile/StatTile";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import { listAnomalyCases, resolveAnomalyCase } from "@/lib/api/finance";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const RISK_LABELS = { LOW: "Baixo", MEDIUM: "Médio", HIGH: "Alto", CRITICAL: "Crítico" };
const RISK_TONE = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };
const STATUS_LABELS = { OPEN: "Aberto", RESOLVED: "Resolvido" };
const STATUS_TONE = { OPEN: "warning", RESOLVED: "success" };

export default function AntifraudePage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [riskFilter, setRiskFilter] = useState("");
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [resolveModal, setResolveModal] = useState(null);

  function load() {
    setLoading(true);
    setLoadError("");
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (riskFilter) params.riskLevel = riskFilter;
    listAnomalyCases(params)
      .then((items) => setCases(items || []))
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os casos de anomalia."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, riskFilter]);

  function showNotice(tone, title, message) {
    setNotice({ tone, title, message });
    window.clearTimeout(showNotice._t);
    showNotice._t = window.setTimeout(() => setNotice(null), 6000);
  }

  async function handleResolve(anomalyCase, resolutionNote) {
    setBusyId(anomalyCase.id);
    try {
      const updated = await resolveAnomalyCase(anomalyCase.id, resolutionNote);
      setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setResolveModal(null);
      showNotice("success", "Caso resolvido", "Caso de anomalia marcado como resolvido.");
    } catch (err) {
      showNotice("danger", "Não foi possível resolver o caso", err?.message || "Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = cases.filter((c) => c.status === "OPEN").length;
  const highRiskOpenCount = cases.filter((c) => c.status === "OPEN" && (c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL")).length;

  return (
    <AppShell title="Antifraude" subtitle="Financeiro">
      <FinanceNavMenu />
      {loadError ? <Alert tone="danger" title="Não foi possível carregar">{loadError}</Alert> : null}
      {notice ? <Alert tone={notice.tone} title={notice.title} className={styles.notice}>{notice.message}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Casos nesta lista" value={cases.length} tone="neutral" icon="shield" />
        <StatTile label="Abertos" value={openCount} tone={openCount > 0 ? "warning" : "success"} icon="shield" />
        <StatTile label="Alto risco abertos" value={highRiskOpenCount} tone={highRiskOpenCount > 0 ? "danger" : "success"} icon="shield" />
      </div>

      <Card title="Casos de anomalia" subtitle="Detectados automaticamente pelo motor de antifraude (Caderno §17) — nunca apagados, só resolvidos com nota">
        <div className={styles.toolbar}>
          <Select className={styles.filter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="OPEN">Abertos</option>
            <option value="RESOLVED">Resolvidos</option>
          </Select>
          <Select className={styles.filter} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="">Todos os riscos</option>
            {Object.entries(RISK_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <SkeletonList rows={4} />
        ) : cases.length === 0 ? (
          <p className={styles.emptyText}>Nenhum caso de anomalia encontrado para este filtro.</p>
        ) : (
          <ul className={styles.list}>
            {cases.map((c) => (
              <li key={c.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <div className={styles.rowTop}>
                    <Badge tone={RISK_TONE[c.riskLevel]}>{RISK_LABELS[c.riskLevel] || c.riskLevel}</Badge>
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status] || c.status}</Badge>
                    <span className={styles.caseType}>{c.caseType}</span>
                  </div>
                  <p className={styles.reason}>{c.reason}</p>
                  <span className={styles.meta}>
                    Aberto em {formatDate(c.createdAt)}
                    {c.resolvedAt ? ` · Resolvido em ${formatDate(c.resolvedAt)}` : ""}
                    {c.resolutionNote ? ` · Nota: ${c.resolutionNote}` : ""}
                  </span>
                </div>
                {c.status === "OPEN" ? (
                  <Button size="sm" variant="secondary" onClick={() => setResolveModal(c)} loading={busyId === c.id}>
                    Resolver
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <StickyActionBar>
        <FinanceNavMenu />
      </StickyActionBar>

      <ResolveAnomalyModal
        anomalyCase={resolveModal}
        onClose={() => setResolveModal(null)}
        onConfirm={(note) => handleResolve(resolveModal, note)}
        busy={resolveModal ? busyId === resolveModal.id : false}
      />
    </AppShell>
  );
}

function ResolveAnomalyModal({ anomalyCase, onClose, onConfirm, busy }) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote("");
  }, [anomalyCase]);

  return (
    <Modal
      open={Boolean(anomalyCase)}
      onClose={onClose}
      title="Resolver caso de anomalia"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button loading={busy} onClick={() => onConfirm(note.trim() || null)}>Confirmar resolução</Button>
        </>
      }
    >
      {anomalyCase ? (
        <>
          <p className={styles.modalIntro}>{anomalyCase.reason}</p>
          <Alert tone="info">O caso fica marcado como resolvido permanentemente — para abrir de novo é preciso que o motor detecte outra ocorrência.</Alert>
          <FormField label="Nota de resolução" htmlFor="resolution-note" helper="Opcional — o que foi verificado/decidido">
            <Input id="resolution-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: falso positivo, confirmado com o cliente..." />
          </FormField>
        </>
      ) : null}
    </Modal>
  );
}
