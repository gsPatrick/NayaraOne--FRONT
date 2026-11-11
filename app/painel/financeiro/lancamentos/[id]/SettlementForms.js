"use client";

// Cartões da baixa: comprovante da baixa manual (F03/A4: anexado antes da aprovação) e valor da baixa parcial (DecimalInput, toNumber).
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";

export function ManualEvidenceCard({ evidence, busy }) {
  return (
    <Card
      title="Comprovante da baixa manual"
      subtitle="Sem a confirmação do banco, o pagamento só pode ser dado como pago com comprovante e motivo. Anexe primeiro: a aprovação precisa ser feita depois, por outra pessoa, vendo o comprovante. Cada comprovante serve para uma única baixa."
      className={styles.notice}
    >
      {evidence.manualError ? <Alert tone="danger" className={styles.notice}>{evidence.manualError}</Alert> : null}
      <FormField label="Comprovante do pagamento" required>
        <input type="file" accept="application/pdf,image/*" onChange={(e) => evidence.setManualFile(e.target.files?.[0] || null)} />
      </FormField>
      <FormField label="Motivo da baixa manual" required>
        <Input value={evidence.manualReason} onChange={(e) => evidence.setManualReason(e.target.value)} placeholder="Ex.: TED feita no internet banking em 18/10" />
      </FormField>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={evidence.resetManualEvidence}>Cancelar</Button>
        <Button onClick={evidence.handleAttachEvidence} loading={busy}>Anexar comprovante</Button>
      </div>
    </Card>
  );
}

export function PartialSettlementCard({ settlement, needsManualEvidence, busy }) {
  return (
    <Card title="Liquidação parcial" className={styles.notice}>
      <FormField label="Valor da baixa parcial">
        <DecimalInput value={settlement.partialAmount} onChange={(e) => settlement.setPartialAmount(e.target.value)} placeholder="0,00" />
      </FormField>
      {needsManualEvidence ? (
        <Alert tone="info" className={styles.notice}>A baixa parcial usa o comprovante anexado a este pagamento.</Alert>
      ) : null}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => settlement.setPartialOpen(false)}>Cancelar</Button>
        <Button onClick={settlement.handleSettlePartial} loading={busy} disabled={!settlement.partialAmount || toNumber(settlement.partialAmount) <= 0}>
          Confirmar baixa parcial
        </Button>
      </div>
    </Card>
  );
}
