"use client";

// Ações do laudo da vistoria (gerar, ver, baixar), extraídas da página. O laudo assinado por locador e locatário é imutável
// (Caderno M5 §11): nesse estado o botão de gerar some e a tela explica que a correção é por revisão (lib/legal/inspectionReport).
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import { generateInspectionReport, getInspectionReportBlob } from "@/lib/api/legal";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { inspectionReportState, REPORT_FROZEN_TEXT, REPORT_NEEDS_SIGNED_TEXT, REPORT_STATE } from "@/lib/legal/inspectionReport";
import { formatDate } from "@/lib/format";

/** Botões do laudo (vão na linha de ações da página). */
export default function InspectionReportActions({ inspection, signatures, onGenerated, onError, onView }) {
  const [busy, setBusy] = useState(false);
  const state = inspectionReportState(inspection, signatures);

  async function handleGenerate() {
    onError("");
    setBusy(true);
    try {
      const result = await generateInspectionReport(inspection.id);
      onGenerated({ reportHash: result.reportHash, reportGeneratedAt: result.reportGeneratedAt });
    } catch (err) {
      if (err?.code === "LEGAL_INSPECTION_REPORT_FROZEN" && err.details?.reportGeneratedAt) {
        onGenerated({ reportHash: err.details.reportHash, reportGeneratedAt: err.details.reportGeneratedAt }); // a tela passa a mostrar o laudo congelado
      }
      onError(legalErrorMessage(err, "Erro ao gerar relatório."));
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    onError("");
    setBusy(true);
    try {
      const blob = await getInspectionReportBlob(inspection.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vistoria-${formatDate(inspection.scheduledAt).replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      onError(legalErrorMessage(err, "Erro ao baixar relatório."));
    } finally {
      setBusy(false);
    }
  }

  if (state === REPORT_STATE.UNAVAILABLE) return null;
  const hasReport = state !== REPORT_STATE.MISSING;
  return (
    <>
      {state === REPORT_STATE.MISSING || state === REPORT_STATE.NEEDS_SIGNED ? (
        <Button variant="secondary" onClick={handleGenerate} loading={busy} disabled={busy}>
          <Icon name="document" size={16} /> {state === REPORT_STATE.NEEDS_SIGNED ? "Gerar laudo assinado" : "Gerar relatório"}
        </Button>
      ) : null}
      {hasReport ? (
        <>
          <Button
            variant="secondary"
            onClick={() => onView({ fileName: "relatorio-vistoria.pdf", mimeType: "application/pdf", blobLoader: () => getInspectionReportBlob(inspection.id) })}
          >
            <Icon name="eye" size={16} /> Visualizar relatório
          </Button>
          <Button variant="secondary" onClick={handleDownload} loading={busy} disabled={busy}>
            <Icon name="arrowDownCircle" size={16} /> Baixar relatório
          </Button>
        </>
      ) : null}
    </>
  );
}

/** Aviso do laudo assinado (imutável) ou do laudo assinado ainda por emitir. */
export function InspectionReportNotice({ inspection, signatures }) {
  const state = inspectionReportState(inspection, signatures);
  if (state === REPORT_STATE.FROZEN) {
    return (
      <div data-testid="inspection-report-frozen">
        <Alert tone="info" title="Laudo assinado">{REPORT_FROZEN_TEXT}</Alert>
      </div>
    );
  }
  if (state === REPORT_STATE.NEEDS_SIGNED) return <Alert tone="warning" title="Laudo assinado pendente">{REPORT_NEEDS_SIGNED_TEXT}</Alert>;
  return null;
}
