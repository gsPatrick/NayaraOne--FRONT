"use client";

// Pedido de exportação (Marco 9, M9-D822): reúne o que o POST /exports exige (formato, finalidade, justificativa, marca d'água opcional), confirma a verificação em duas
// etapas e baixa o arquivo quando fica pronto. As telas só dizem o recurso e o filtro; o texto de ajuda e as regras vêm da API (catálogo).
import { useEffect, useState } from "react";
import Modal from "@/components/organisms/Modal/Modal";
import MfaVerifyModal from "@/components/organisms/MfaVerifyModal/MfaVerifyModal";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import { getExportCatalog, runExport, exportErrorMessage, needsMfaPrompt } from "@/lib/api/dlpExports";
import styles from "./ExportRequestModal.module.css";

const PURPOSE_LABELS = {
  AUDITORIA: "Auditoria",
  OPERACAO: "Operação do dia a dia",
  JURIDICO: "Jurídico",
  CONTABIL: "Contábil",
  CLIENTE_SOLICITOU: "O cliente solicitou",
  OUTRA: "Outra finalidade",
};
const FORMAT_LABELS = { CSV: "CSV (planilha simples)", XLSX: "Excel (XLSX)", PDF: "PDF" };

export default function ExportRequestModal({ open, onClose, title, resourceType, filter, children, onDone, onError }) {
  const [catalog, setCatalog] = useState(null);
  const [format, setFormat] = useState("");
  const [purpose, setPurpose] = useState("");
  const [justification, setJustification] = useState("");
  const [watermark, setWatermark] = useState(false);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    getExportCatalog()
      .then((data) => {
        setCatalog(data);
        const resource = (data.resources || []).find((item) => item.code === resourceType);
        setFormat((current) => current || resource?.formats?.[0] || "");
        setPurpose((current) => current || data.purposes?.[0] || "");
      })
      .catch((err) => setError(exportErrorMessage(err, "Não foi possível carregar as opções de exportação.")));
  }, [open, resourceType]);

  const resource = (catalog?.resources || []).find((item) => item.code === resourceType);
  const min = catalog?.justificationMin || 20;
  const missing = Math.max(0, min - justification.trim().length);

  // Tenta exportar direto; só abre a janela do código quando a API pede (MFA_STEP_UP_REQUIRED) e repete o pedido depois de confirmado (F14).
  async function handleExport(afterMfa = false) {
    setBusy(true);
    setError("");
    try {
      const result = await runExport({ resourceType, filter, format, purpose, justification: justification.trim(), watermark });
      setJustification("");
      onDone?.(result);
    } catch (err) {
      if (needsMfaPrompt(err, afterMfa)) {
        setMfaOpen(true);
      } else {
        const text = exportErrorMessage(err);
        setError(text);
        onError?.(err, text);
      }
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
            <Button onClick={() => handleExport(false)} loading={busy} disabled={!resource || !format || !purpose || missing > 0}>Exportar</Button>
          </>
        }
      >
        <Alert tone="info">
          Toda exportação pede finalidade e justificativa, exige verificação em duas etapas, fica registrada na auditoria e o arquivo vale por tempo limitado. Quem não pode ver os dados mais sensíveis recebe essas colunas mascaradas.
        </Alert>
        {!resource && !error && catalog ? <Alert tone="warning">Você não tem permissão para exportar este tipo de dado.</Alert> : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className={styles.fields}>
          {children}
          <FormField label="Formato do arquivo" htmlFor="exp-format">
            <Select id="exp-format" value={format} onChange={(e) => setFormat(e.target.value)}>
              {(resource?.formats || []).map((item) => <option key={item} value={item}>{FORMAT_LABELS[item] || item}</option>)}
            </Select>
          </FormField>
          <FormField label="Finalidade" htmlFor="exp-purpose">
            <Select id="exp-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {(catalog?.purposes || []).map((item) => <option key={item} value={item}>{PURPOSE_LABELS[item] || item}</option>)}
            </Select>
          </FormField>
          <FormField label="Justificativa" htmlFor="exp-justification" helper={missing > 0 ? `Faltam ${missing} caractere(s): explique por que precisa deste arquivo (mínimo ${min}).` : "Justificativa suficiente."}>
            <textarea id="exp-justification" className={styles.textarea} value={justification} onChange={(e) => setJustification(e.target.value)} maxLength={2000} />
          </FormField>
          <Checkbox id="exp-watermark" label="Incluir marca d'água com o meu nome e a data" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
        </div>
      </Modal>
      <MfaVerifyModal
        open={mfaOpen}
        onClose={() => setMfaOpen(false)}
        actionLabel="exportar os dados"
        onVerified={async () => {
          setMfaOpen(false);
          await handleExport(true);
        }}
      />
    </>
  );
}
