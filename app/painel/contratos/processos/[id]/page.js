"use client";

import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import { PROPERTIES } from "@/lib/mock/properties";
import { USERS } from "@/lib/mock/users";
import {
  LEGAL_CASES,
  CONTRACTS,
  CASE_TYPE_LABELS,
  CASE_TYPE_TONE,
  CASE_STATUS_LABELS,
  CASE_STATUS_TONE,
  DEADLINE_STATUS_LABELS,
  DEADLINE_SEVERITY_LABELS,
  DEADLINE_SEVERITY_TONE,
  deadlinesOf,
  deadlineSeverity,
  evidencePackagesOf,
} from "@/lib/mock/legal";
import { formatDate, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

function propertyOf(id) {
  return PROPERTIES.find((p) => p.id === id) || null;
}

function contractOf(id) {
  return CONTRACTS.find((c) => c.id === id) || null;
}

function userName(id) {
  return USERS.find((u) => u.id === id)?.name || "—";
}

export default function ProcessoDetailPage({ params }) {
  const legalCase = LEGAL_CASES.find((c) => c.id === params.id);
  if (!legalCase) return notFound();

  const property = legalCase.propertyId ? propertyOf(legalCase.propertyId) : null;
  const contract = legalCase.contractId ? contractOf(legalCase.contractId) : null;
  const deadlines = deadlinesOf(legalCase.id);
  const evidencePackages = evidencePackagesOf(legalCase.id);

  return (
    <AppShell title={legalCase.caseNumber} backHref="/painel/contratos/processos">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Badge tone={CASE_TYPE_TONE[legalCase.caseType]}>{CASE_TYPE_LABELS[legalCase.caseType]}</Badge>
            <Badge tone={CASE_STATUS_TONE[legalCase.status]}>{CASE_STATUS_LABELS[legalCase.status]}</Badge>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Detalhes do processo">
              <dl className={styles.detailList}>
                <div className={styles.detailRow}><dt>Resumo</dt><dd>{legalCase.summary}</dd></div>
                <div className={styles.detailRow}><dt>Contrato vinculado</dt><dd>{contract?.contractNumber || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Imóvel vinculado</dt><dd>{property?.name || "—"}</dd></div>
                <div className={styles.detailRow}><dt>Responsável</dt><dd>{legalCase.responsibleUserId ? userName(legalCase.responsibleUserId) : "—"}</dd></div>
                <div className={styles.detailRow}><dt>Versão de bloqueio (lock_version)</dt><dd>{legalCase.lockVersion}</dd></div>
              </dl>
            </Card>

            <Card title="Prazos" subtitle="Severidade calculada a partir do vencimento — mesma lógica de contas vencidas do Financeiro">
              {deadlines.length === 0 ? (
                <p className={styles.emptyText}>Nenhum prazo cadastrado.</p>
              ) : (
                deadlines.map((d) => {
                  const severity = deadlineSeverity(d);
                  return (
                    <div key={d.id} className={styles.deadlineRow}>
                      <div className={styles.deadlineInfo}>
                        <span className={styles.deadlineDesc}>{d.description}</span>
                        <span className={styles.deadlineDue}>Vencimento em {formatDate(d.dueAt)} · {DEADLINE_STATUS_LABELS[d.status]}</span>
                      </div>
                      <Badge tone={DEADLINE_SEVERITY_TONE[severity]}>{DEADLINE_SEVERITY_LABELS[severity]}</Badge>
                    </div>
                  );
                })
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Pacotes de evidência" subtitle="Append-only — cada pacote é imutável após criado">
              {evidencePackages.length === 0 ? (
                <p className={styles.emptyText}>Nenhum pacote de evidência gerado para este processo.</p>
              ) : (
                evidencePackages.map((pkg) => (
                  <div key={pkg.id} className={styles.evidencePackage}>
                    <div className={styles.evidenceHead}>
                      <span className={styles.evidenceHash} title={pkg.packageHash}>{pkg.packageHash}</span>
                      <span className={styles.evidenceDate}>{formatDateTime(pkg.createdAt)}</span>
                    </div>
                    <div className={styles.manifestList}>
                      {pkg.manifestJson.map((item, idx) => (
                        <div key={idx} className={styles.manifestItem}>
                          <span className={styles.manifestType}>{item.type}</span>
                          <div className={styles.manifestBody}>
                            <span className={styles.manifestDesc}>{item.description}</span>
                            <span className={styles.manifestHash} title={item.hash}>{item.hash}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
