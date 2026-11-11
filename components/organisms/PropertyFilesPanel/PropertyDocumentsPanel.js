"use client";

import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import Alert from "@/components/molecules/Alert/Alert";
import FileViewerModal from "@/components/organisms/FileViewerModal/FileViewerModal";
import { addPropertyDocument, removePropertyDocument, uploadPropertyFile, mapDocument } from "@/lib/api/properties";
import { DOCUMENT_TYPE_LABELS } from "@/lib/properties/documentPlan";
import styles from "./PropertyFilesPanel.module.css";

// Documentos do imóvel com o ARQUIVO (Marco 3 §6, verificação de 11/11/2026): lista o que está anexado (e o que é registro
// antigo sem arquivo, que não conta para publicar), abre o arquivo, anexa um documento novo e remove. O arquivo passa pelo
// antivírus na API ao subir e de novo ao vincular; infectado é recusado com a mensagem da API.
export default function PropertyDocumentsPanel({ propertyId, documents = [], onChange }) {
  const [form, setForm] = useState({ documentType: "REGISTRY", valueNumber: "", file: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null);

  async function handleAdd() {
    if (!form.file) { setError("Escolha o arquivo do documento."); return; }
    setBusy(true);
    setError("");
    try {
      const file = await uploadPropertyFile(form.file, "property-documents");
      const created = await addPropertyDocument(propertyId, { documentType: form.documentType, valueNumber: form.valueNumber || undefined, fileId: file.id });
      onChange([...documents, mapDocument(created)]);
      setForm({ documentType: form.documentType, valueNumber: "", file: null });
    } catch (e) {
      setError(e?.message || "Não foi possível anexar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(doc) {
    setBusy(true);
    setError("");
    try {
      const result = await removePropertyDocument(propertyId, doc.id);
      onChange(documents.filter((d) => d.id !== doc.id), result);
    } catch (e) {
      setError(e?.message || "Não foi possível remover o documento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {documents.length === 0 ? <p className={styles.empty}>Nenhum documento anexado.</p> : (
        <ul className={styles.list}>
          {documents.map((d) => (
            <li className={styles.item} key={d.id}>
              <div className={styles.info}>
                <span className={styles.name}>{DOCUMENT_TYPE_LABELS[d.documentType] || d.documentType}{d.valueNumber ? ` — ${d.valueNumber}` : ""}</span>
                <span className={styles.meta}>
                  <Badge tone={d.fileId ? "success" : "warning"}>{d.fileId ? "Arquivo anexado" : "Sem arquivo (não conta para publicar)"}</Badge>
                </span>
              </div>
              <div className={styles.actions}>
                {d.fileId ? <Button size="sm" variant="secondary" onClick={() => setViewing(d.fileId)}>Abrir arquivo</Button> : null}
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => handleRemove(d)}>Remover</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.form}>
        <FormField label="Tipo do documento" htmlFor="doc-new-type">
          <Select id="doc-new-type" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </FormField>
        <FormField label="Número / identificação" htmlFor="doc-new-number">
          <Input id="doc-new-number" value={form.valueNumber} onChange={(e) => setForm({ ...form, valueNumber: e.target.value })} />
        </FormField>
        <div className={styles.span2}>
          <FileDropInput
            id="doc-new-file"
            ariaLabel="Arquivo do documento"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            helper="PDF ou imagem. Passa pelo antivírus ao enviar."
            uploading={busy}
            fileNames={form.file ? [form.file.name] : []}
            onFiles={(list) => setForm({ ...form, file: list[0] || null })}
            onRemove={() => setForm({ ...form, file: null })}
          />
        </div>
        <div className={styles.span2}>
          <Button size="sm" loading={busy} onClick={handleAdd}>Anexar documento</Button>
        </div>
      </div>
      <FileViewerModal fileId={viewing} open={Boolean(viewing)} onClose={() => setViewing(null)} />
    </div>
  );
}
