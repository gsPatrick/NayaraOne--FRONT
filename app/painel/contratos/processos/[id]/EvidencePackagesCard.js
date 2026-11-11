"use client";

// Dossiê de provas (pacotes de evidência, append-only). Exportar exige a permissão própria de exportação de dossiê
// (legal:evidence:export, Caderno M5 §19); a DLP continua por cima (finalidade/justificativa) e o MFA pelo host global.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FileDownloadRequestModal from "@/components/organisms/FileDownloadRequestModal/FileDownloadRequestModal";
import { needsDlpPrompt } from "@/lib/api/dlpFiles";
import {
  listEvidencePackages,
  createEvidencePackage,
  createEvidencePackageAuto,
  exportEvidencePackage,
  listEvidencePackageAccessLog,
} from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { EVIDENCE_MANIFEST_TYPE_LABELS, EVIDENCE_ACCESS_ACTION_LABELS } from "@/lib/mock/legal";
import { humanizeText } from "@/lib/format";
import { brasilia } from "./DeadlinesCard";
import styles from "./page.module.css";

const shortHash = (hash) => (hash ? `${String(hash).replace(/^sha256-/, "").slice(0, 16)}…` : "sem hash");

export default function EvidencePackagesCard({ legalCase, userName, onChanged }) {
  const [packages, setPackages] = useState([]);
  const [custody, setCustody] = useState({});
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportAsk, setExportAsk] = useState(null);
  const canExport = useHasPermission("legal:evidence:export");

  useEffect(() => {
    let alive = true;
    listEvidencePackages(legalCase.id)
      .then((list) => alive && setPackages(Array.isArray(list) ? list : []))
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar os dossiês.")));
    return () => {
      alive = false;
    };
  }, [legalCase.id]);

  async function run(fn, fallback) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(legalErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  const addPackage = (pkg) => {
    setPackages((prev) => [...prev, pkg]);
    onChanged?.();
  };

  const handleAuto = () => run(async () => addPackage(await createEvidencePackageAuto(legalCase.id)), "Erro ao montar o dossiê automaticamente.");
  const handleAdd = () =>
    run(async () => {
      addPackage(await createEvidencePackage(legalCase.id, [{ type: "DOCUMENT", description: description.trim() }]));
      setDescription("");
    }, "Erro ao criar o pacote de evidência.");

  async function runExport(pkg, input) {
    const exported = await exportEvidencePackage(pkg.id, input);
    setCustody((prev) => ({ ...prev, [pkg.id]: { ...(prev[pkg.id] || {}), exported } }));
  }

  async function handleExport(pkg) {
    setError("");
    try {
      await runExport(pkg, {});
    } catch (err) {
      if (needsDlpPrompt(err)) {
        setExportAsk(pkg);
        return;
      }
      setError(legalErrorMessage(err, "Erro ao exportar o dossiê."));
    }
  }

  const handleCustody = (pkg) =>
    run(async () => {
      const log = await listEvidencePackageAccessLog(pkg.id);
      setCustody((prev) => ({ ...prev, [pkg.id]: { ...(prev[pkg.id] || {}), log: Array.isArray(log) ? log : [] } }));
    }, "Erro ao carregar a cadeia de custódia.");

  return (
    <Card title="Dossiê de provas" subtitle="Append-only — cada pacote é imutável após criado">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {legalCase.contractId ? (
        <div className={styles.addEvidenceRow}>
          <Button size="sm" onClick={handleAuto} disabled={busy}>Montar dossiê automaticamente (todos os anexos do contrato)</Button>
        </div>
      ) : null}
      {!canExport ? <p className={styles.emptyText}>Exportar dossiê exige a permissão de exportação de dossiê.</p> : null}
      {packages.length === 0 ? (
        <EmptyState icon="document" title="Sem pacotes de evidência" description="Nenhum pacote de evidência gerado para este processo." />
      ) : (
        packages.map((pkg) => {
          const c = custody[pkg.id] || {};
          return (
            <div key={pkg.id} className={styles.evidencePackage}>
              <div className={styles.evidenceHead}>
                <span className={styles.evidenceHash} title={pkg.packageHash}>Hash {shortHash(pkg.packageHash)}</span>
                <span className={styles.evidenceDate}>{brasilia(pkg.createdAt)}</span>
              </div>
              <div className={styles.manifestList}>
                {(pkg.manifestJson || []).map((item, idx) => (
                  <div key={idx} className={styles.manifestItem}>
                    <span className={styles.manifestType}>{EVIDENCE_MANIFEST_TYPE_LABELS[item.type] || "Documento"}</span>
                    <div className={styles.manifestBody}>
                      <span className={styles.manifestDesc}>{humanizeText(item.description)}</span>
                      {item.hash ? <span className={styles.manifestHash} title={item.hash}>{shortHash(item.hash)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.addEvidenceRow}>
                {canExport ? <Button size="sm" variant="ghost" onClick={() => handleExport(pkg)} disabled={busy}>Exportar dossiê</Button> : null}
                <Button size="sm" variant="ghost" onClick={() => handleCustody(pkg)} disabled={busy}>Ver cadeia de custódia</Button>
              </div>
              {c.exported ? (
                <div className={styles.manifestList} data-testid="evidence-export">
                  <span title={c.exported.packageHash}>Hash no export: {shortHash(c.exported.packageHash)}</span>
                  <span>
                    {c.exported.packageHash === pkg.packageHash
                      ? "Hash do export confere com o hash gravado."
                      : "ALERTA: hash do export diverge do hash gravado."}
                  </span>
                </div>
              ) : null}
              {c.log ? (
                <div className={styles.manifestList} data-testid="evidence-custody-log">
                  {c.log.length === 0 ? (
                    <span>Nenhum acesso registrado ainda.</span>
                  ) : (
                    c.log.map((entry) => (
                      <div key={entry.id} className={styles.manifestItem}>
                        <span className={styles.manifestType}>{EVIDENCE_ACCESS_ACTION_LABELS[entry.action] || "Acesso"}</span>
                        <div className={styles.manifestBody}>
                          <span className={styles.manifestDesc}>{entry.accessedByUserId ? userName(entry.accessedByUserId) : "Acesso automático do sistema"}</span>
                          <span className={styles.manifestHash}>{brasilia(entry.accessedAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          );
        })
      )}
      <div className={styles.addEvidenceRow}>
        <FormField label="Descrição" htmlFor="f-evidence-desc">
          <Input id="f-evidence-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Contrato assinado (v2)" />
        </FormField>
        <Button size="sm" variant="secondary" onClick={handleAdd} disabled={busy || !description.trim()}>Novo pacote de evidência</Button>
      </div>
      <FileDownloadRequestModal
        open={Boolean(exportAsk)}
        mode="export"
        onClose={() => setExportAsk(null)}
        onSubmit={async (input) => {
          await runExport(exportAsk, input);
          setExportAsk(null);
        }}
      />
    </Card>
  );
}
