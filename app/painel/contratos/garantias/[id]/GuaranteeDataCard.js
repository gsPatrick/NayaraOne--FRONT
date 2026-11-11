"use client";

// Dados da garantia por tipo (Caderno M5 §9) e, na caução, a trilha do Financeiro (recebimento, devoluções/compensações e
// saldo calculados pelo próprio Financeiro — o jurídico não guarda saldo).
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import { GUARANTEE_TYPE_LABELS, GUARANTEE_TYPE_ICON, normalizeGuaranteeType } from "@/lib/labels/juridico";
import { formatBRL, formatDate, formatDateTime, humanizeText } from "@/lib/format";
import styles from "./page.module.css";

const ENTRY_STATUS_LABELS = { PENDING: "Em aberto", SETTLED: "Liquidado", PARTIALLY_SETTLED: "Liquidado em parte", REVERSED: "Estornado", CANCELLED: "Cancelado" };
const NATURE_LABELS = { RECEIVABLE: "Recebimento", PAYABLE: "Devolução / compensação" };

function Row({ label, children }) {
  return <div className={styles.detailRow}><dt>{label}</dt><dd>{children}</dd></div>;
}

function FileButton({ fileId, label, onView }) {
  if (!fileId) return <span>Não anexado</span>;
  return (
    <Button size="sm" variant="ghost" onClick={() => onView({ id: fileId })}>
      <Icon name="eye" size={14} /> {label}
    </Button>
  );
}

export default function GuaranteeDataCard({ guarantee, personName, onViewFile }) {
  const type = normalizeGuaranteeType(guarantee.guaranteeType);
  const g = guarantee;
  return (
    <Card title="Dados da garantia">
      <dl className={styles.detailList}>
        <Row label="Tipo"><span className={styles.typeCell}><Icon name={GUARANTEE_TYPE_ICON[type]} size={16} /> {GUARANTEE_TYPE_LABELS[type]}</span></Row>
        {type === "GUARANTOR" ? (
          <>
            <Row label="Pessoa fiadora">{personName(g.guarantorPersonId) || "Não informada"}</Row>
            {(g.additionalGuarantorPersonIds || []).length ? <Row label="Outros fiadores">{g.additionalGuarantorPersonIds.map(personName).join(", ")}</Row> : null}
            <Row label="Documentos do fiador">
              {(g.documentFileIds || []).length
                ? g.documentFileIds.map((id, i) => <FileButton key={id} fileId={id} label={`Documento ${i + 1}`} onView={onViewFile} />)
                : "Não anexados"}
            </Row>
            <Row label="Termo de aceite"><FileButton fileId={g.acceptanceFileId} label="Ver termo" onView={onViewFile} /></Row>
            <Row label="Data do aceite">{g.acceptedAt ? formatDate(g.acceptedAt) : "Não informada"}</Row>
          </>
        ) : null}
        {type === "INSURANCE" ? (
          <>
            <Row label="Seguradora">{g.providerName || "Não informada"}</Row>
            <Row label="Apólice">{g.policyNumber || "Não informada"}</Row>
            <Row label="Arquivo da apólice"><FileButton fileId={g.policyFileId} label="Ver apólice" onView={onViewFile} /></Row>
            <Row label="Prêmio anual">{g.annualPremium != null ? formatBRL(g.annualPremium) : "Não informado"}</Row>
            <Row label="Parcelas do prêmio">
              {(g.premiumInstallments || []).length
                ? g.premiumInstallments.map((p) => `${p.number}ª ${formatDate(p.dueDate)} ${formatBRL(p.amount)}`).join(" · ")
                : "Não informadas"}
            </Row>
            <Row label="Renovação">{g.renewalDueAt ? `${formatDate(g.renewalDueAt)}${g.autoRenew ? " (automática)" : ""}` : "Não informada"}</Row>
          </>
        ) : null}
        {type === "CAPITALIZATION" ? (
          <>
            <Row label="Emissora">{g.providerName || "Não informada"}</Row>
            <Row label="Número do título">{g.certificateNumber || "Não informado"}</Row>
            <Row label="Documento do título"><FileButton fileId={g.certificateFileId} label="Ver título" onView={onViewFile} /></Row>
            <Row label="Valor de resgate">{g.redemptionAmount != null ? formatBRL(g.redemptionAmount) : "Não informado"}</Row>
          </>
        ) : null}
        {type === "OTHER" ? <Row label="Dados do fluxo homologado">{Object.entries(g.flowData || {}).map(([k, v]) => `${k.replace(/[_-]+/g, " ")}: ${v}`).join(" · ") || "Não informados"}</Row> : null}
        <Row label="Valor"><span className={styles.amount}>{g.value != null ? formatBRL(g.value) : "Sem valor cadastrado"}</span></Row>
        <Row label="Início de vigência">{g.startsAt ? formatDate(g.startsAt) : "Sem data de início"}</Row>
        <Row label="Fim de vigência">{g.endsAt ? formatDate(g.endsAt) : "Prazo indeterminado"}</Row>
        {g.notes ? <Row label="Observações">{g.notes}</Row> : null}
      </dl>

      {type === "SECURITY_DEPOSIT" ? (
        <div className={styles.trail} data-testid="deposit-trail">
          <h3 className={styles.trailTitle}>Caução no Financeiro</h3>
          {g.depositTrail ? (
            <>
              <p>
                Recebido {formatBRL(g.depositTrail.received)} · devolvido/compensado {formatBRL(g.depositTrail.released)} · saldo{" "}
                <strong>{formatBRL(g.depositTrail.available)}</strong>
              </p>
              {(g.depositTrail.movements || []).map((m) => (
                <div key={m.entryId} className={styles.trailRow}>
                  <span>{NATURE_LABELS[m.nature] || "Movimento"} — {humanizeText(m.description || "")}</span>
                  <span>{formatBRL(m.amount)}</span>
                  <Badge tone="neutral">{ENTRY_STATUS_LABELS[m.status] || "Situação no Financeiro"}</Badge>
                  <span className={styles.trailDate}>{m.createdAt ? formatDateTime(m.createdAt) : ""}</span>
                </div>
              ))}
              <p className={styles.trailNote}>Devolução e compensação são lançadas pelo Financeiro a partir do recebimento da caução.</p>
            </>
          ) : (
            <p className={styles.trailNote}>Sem recebimento vinculado: registre o recebimento da caução no Financeiro e complete os dados da garantia.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
