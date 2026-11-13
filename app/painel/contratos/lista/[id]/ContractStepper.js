"use client";

// Trilha de etapas do contrato (Guia §3). Contrato antigo gravado como CANCELLED continua legível, sem ações:
// esse estado deixou de fazer parte do fluxo do livro.
import Card from "@/components/molecules/Card/Card";
import Icon from "@/components/atoms/Icon/Icon";
import { CONTRACT_STATUS_FLOW, CONTRACT_STATUS_LABELS } from "@/lib/labels/juridico";
import styles from "./page.module.css";

const END_STATES = { SUSPENDED: "ACTIVE", TERMINATED: "ACTIVE", CLOSED: "ACTIVE" };

export default function ContractStepper({ status }) {
  const legacyCancelled = status === "CANCELLED";
  const anchor = END_STATES[status] || status;
  const currentIdx = CONTRACT_STATUS_FLOW.indexOf(anchor);
  const pastActive = Boolean(END_STATES[status]);
  return (
    <Card title="Etapas do contrato" subtitle="Rascunho → documentos → revisão jurídica → aprovação da versão → assinatura → em vigor; depois de em vigor: suspensão, encerramento (rescisão) e arquivamento">
      <div className={styles.stepper}>
        {CONTRACT_STATUS_FLOW.map((step, idx) => {
          const isDone = !legacyCancelled && (idx < currentIdx || (pastActive && idx === currentIdx));
          const isCurrent = !legacyCancelled && !pastActive && idx === currentIdx;
          return (
            <div key={step} className={[styles.step, isDone ? styles.stepDone : "", isCurrent ? styles.stepCurrent : ""].filter(Boolean).join(" ")}>
              {idx > 0 ? <span className={styles.stepLine} /> : null}
              <span className={styles.stepDot}>{isDone ? <Icon name="check" size={14} /> : idx + 1}</span>
              <span className={styles.stepLabel}>{CONTRACT_STATUS_LABELS[step]}</span>
            </div>
          );
        })}
      </div>
      {pastActive ? (
        <p className={styles.cancelledNote}>Situação atual depois da vigência: {CONTRACT_STATUS_LABELS[status]}.</p>
      ) : null}
      {legacyCancelled ? (
        <p className={styles.cancelledNote} data-testid="contract-legacy-cancelled">
          Cancelado (registro antigo — estado fora do fluxo do livro). O contrato fica disponível só para consulta.
        </p>
      ) : null}
    </Card>
  );
}
