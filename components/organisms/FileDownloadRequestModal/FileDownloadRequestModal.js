"use client";

// Pedido de abertura ou download de anexo HIGH/RESTRICTED (Marco 9, M9-D920): reúne finalidade, justificativa e marca d'água opcional, confirma a verificação em duas etapas e entrega
// os dados para quem chamou (`onSubmit`). As regras e os textos de recusa vêm da API; a lista de finalidades e o mínimo da justificativa vêm do catálogo quando a pessoa pode lê-lo.
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import { getExportCatalog } from "@/lib/api/dlpExports";
import { dlpErrorMessage } from "@/lib/api/dlpFiles";
import styles from "./FileDownloadRequestModal.module.css";

const PURPOSE_LABELS = {
  AUDITORIA: "Auditoria",
  OPERACAO: "Operação do dia a dia",
  JURIDICO: "Jurídico",
  CONTABIL: "Contábil",
  CLIENTE_SOLICITOU: "O cliente solicitou",
  OUTRA: "Outra finalidade",
};
const FALLBACK_PURPOSES = Object.keys(PURPOSE_LABELS);
const FALLBACK_MIN = 20;

export default function FileDownloadRequestModal({ open, onClose, mode = "download", fileName, onSubmit, initialError = "" }) {
  const [purposes, setPurposes] = useState(FALLBACK_PURPOSES);
  const [min, setMin] = useState(FALLBACK_MIN);
  const [purpose, setPurpose] = useState(FALLBACK_PURPOSES[0]);
  const [justification, setJustification] = useState("");
  const [watermark, setWatermark] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(initialError);
    getExportCatalog()
      .then((data) => {
        if (data?.purposes?.length) { setPurposes(data.purposes); setPurpose((current) => (data.purposes.includes(current) ? current : data.purposes[0])); }
        if (data?.justificationMin) setMin(data.justificationMin);
      })
      .catch(() => { /* sem permissão de exportar: valem as finalidades padrão e a API confere o mínimo */ });
  }, [open, initialError]);

  const missing = Math.max(0, min - justification.trim().length);
  const verb = { view: "abrir", export: "exportar" }[mode] || "baixar";
  const title = { view: "Abrir arquivo protegido", export: "Exportar com proteção de dados" }[mode] || "Baixar arquivo protegido";

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await onSubmit({ purpose, justification: justification.trim(), watermark });
      setJustification("");
    } catch (err) {
      setError(dlpErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => setMfaOpen(true)} loading={busy} disabled={!purpose || missing > 0}>{{ view: "Abrir", export: "Exportar" }[mode] || "Baixar"}</Button>
          </>
        }
      >
        <Alert tone="info">
          {fileName ? `"${fileName}" ` : "Este conteúdo "}contém dados sensíveis. Para {verb}, informe a finalidade e uma justificativa e confirme a verificação em duas etapas. O pedido fica registrado na auditoria
          {mode === "download" ? " e o endereço do arquivo vale uma vez só e por tempo limitado" : ""}.
        </Alert>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className={styles.fields}>
          <FormField label="Finalidade" htmlFor="fdl-purpose">
            <Select id="fdl-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {purposes.map((item) => <option key={item} value={item}>{PURPOSE_LABELS[item] || item}</option>)}
            </Select>
          </FormField>
          <FormField label="Justificativa" htmlFor="fdl-justification" helper={missing > 0 ? `Faltam ${missing} caractere(s): explique por que precisa deste arquivo (mínimo ${min}).` : "Justificativa suficiente."}>
            <textarea id="fdl-justification" className={styles.textarea} value={justification} onChange={(e) => setJustification(e.target.value)} maxLength={2000} />
          </FormField>
          {mode === "download" ? <Checkbox id="fdl-watermark" label="Incluir marca d'água com o meu nome e a data" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} /> : null}
        </div>
      </Modal>
      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel={`${verb} o arquivo`}
        onVerified={async () => {
          setMfaOpen(false);
          await submit();
        }}
      />
    </>
  );
}
