"use client";

// Documentos e provas do processo (Caderno M5 §14): o arquivo original fica como foi enviado (SHA-256 do upload) e o
// processo ganha só o vínculo. O dossiê automático inclui estes documentos com o hash real.
import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import { listLegalCaseDocuments, linkLegalCaseDocument, uploadFile } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { CASE_DOCUMENT_PURPOSE_LABELS } from "@/lib/labels/juridico";
import { brasilia } from "./DeadlinesCard";
import styles from "./page.module.css";

export default function CaseDocumentsCard({ legalCase, onChanged }) {
  const [documents, setDocuments] = useState([]);
  const [purpose, setPurpose] = useState("DOCUMENT");
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    let alive = true;
    listLegalCaseDocuments(legalCase.id)
      .then((list) => alive && setDocuments(Array.isArray(list) ? list : []))
      .catch((err) => alive && setError(legalErrorMessage(err, "Não foi possível carregar os documentos.")));
    return () => {
      alive = false;
    };
  }, [legalCase.id]);

  async function handleLink() {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const uploaded = await uploadFile(file);
      const created = await linkLegalCaseDocument(legalCase.id, { fileId: uploaded.id, purpose });
      setDocuments((prev) => [...prev, { ...created, linkedAt: new Date().toISOString() }]);
      setFile(null);
      setInputKey((k) => k + 1);
      onChanged?.();
    } catch (err) {
      setError(legalErrorMessage(err, "Não foi possível vincular o documento."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Documentos e provas" subtitle="Arquivos originais ligados ao processo, com hash de integridade">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {documents.length === 0 ? (
        <EmptyState icon="document" title="Sem documentos" description="Nenhum documento ou prova vinculado ao processo." />
      ) : (
        documents.map((d) => (
          <div key={d.id} className={styles.deadlineRow}>
            <div className={styles.deadlineInfo}>
              <span className={styles.deadlineDesc}>{d.fileName || "Arquivo"}</span>
              <span className={styles.deadlineDue} title={d.checksumSha256 || undefined}>
                Vinculado em {brasilia(d.linkedAt)}{d.checksumSha256 ? ` · hash ${d.checksumSha256.slice(0, 12)}…` : ""}
              </span>
            </div>
            <Badge tone="neutral">{CASE_DOCUMENT_PURPOSE_LABELS[d.purpose] || "Documento"}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setViewer({ id: d.fileId, fileName: d.fileName })}>Ver</Button>
          </div>
        ))
      )}
      <div className={styles.formRow}>
        <FormField label="Tipo" htmlFor="f-case-doc-purpose">
          <Select id="f-case-doc-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {Object.entries(CASE_DOCUMENT_PURPOSE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Arquivo" htmlFor="f-case-doc-file">
          <input key={inputKey} id="f-case-doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </FormField>
      </div>
      <div className={styles.formActions}>
        <Button size="sm" variant="secondary" onClick={handleLink} loading={busy} disabled={busy || !file}>Vincular documento</Button>
      </div>
      <FileViewerModal open={Boolean(viewer)} onClose={() => setViewer(null)} file={viewer} fileId={viewer?.id} />
    </Card>
  );
}
