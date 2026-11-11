"use client";

import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import MfaSetupRequiredNotice from "@/components/molecules/MfaSetupRequiredNotice/MfaSetupRequiredNotice";
import { signInspection, listInspectionSignatures } from "@/lib/api/legal";
import { PARTY_ROLE_LABELS } from "@/lib/labels/juridico";
import { isMfaSetupRequired } from "@/lib/errors/mfaSetup";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const SIGNATURE_PARTY_ROLES = ["LANDLORD", "TENANT"];

// Assinatura das partes (Guia §9): congela o conteúdo — o hash do JSON canônico da vistoria entra na assinatura.
// A rota exige verificação em duas etapas recente: o host global (MfaStepUpHost) pede o código; sem MFA configurado,
// cancelado ou recusado, a tela mostra a recusa aqui.
export default function InspectionSignaturesCard({ inspectionId, signatures, onSignatures }) {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [refusal, setRefusal] = useState("");
  const [mfaSetup, setMfaSetup] = useState(false);

  const signatureFor = (r) => signatures.find((s) => s.partyRole === r) || null;
  const allSigned = SIGNATURE_PARTY_ROLES.every((r) => signatureFor(r));
  const snapshotHash = (signatures.find((s) => s.snapshotHash) || {}).snapshotHash;

  function open(r) {
    setError("");
    setRefusal("");
    setMfaSetup(false);
    setName("");
    setRole(r);
  }

  function close() {
    if (signing) return;
    setRole(null);
    setError("");
  }

  async function confirm() {
    if (!name.trim()) {
      setError("Digite o nome completo para confirmar a assinatura.");
      return;
    }
    setSigning(true);
    setError("");
    try {
      await signInspection(inspectionId, { partyRole: role, signaturePayload: name.trim() });
      const sigs = await listInspectionSignatures(inspectionId);
      onSignatures(Array.isArray(sigs) ? sigs : []);
      setRole(null);
    } catch (err) {
      // Recusa da assinatura (MFA não configurado, verificação cancelada, permissão, conteúdo mudou): fica visível
      // fora do modal, com o motivo em português.
      setRole(null);
      if (isMfaSetupRequired(err)) setMfaSetup(true);
      setRefusal(`Assinatura não registrada: ${legalErrorMessage(err, "erro ao registrar a assinatura.")}`);
    } finally {
      setSigning(false);
    }
  }

  return (
    <>
      <Card
        title="Assinaturas"
        subtitle={allSigned ? "Vistoria assinada por locador e locatário." : "Colete a assinatura do locador e do locatário para liberar a entrega de chaves."}
      >
        {refusal ? <div data-testid="inspection-sign-refusal"><Alert tone="danger">{refusal}</Alert></div> : null}
        {mfaSetup ? <MfaSetupRequiredNotice onDismiss={() => setMfaSetup(false)} /> : null}
        <div>
          {SIGNATURE_PARTY_ROLES.map((r) => {
            const sig = signatureFor(r);
            return (
              <div key={r} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{PARTY_ROLE_LABELS[r]}</span>
                  <span className={styles.itemNotes}>{sig ? `Assinado${sig.signedAt ? ` em ${formatDateTime(sig.signedAt)}` : ""}` : "Assinatura pendente"}</span>
                </div>
                {sig ? (
                  <Badge tone="success"><Icon name="check" size={14} /> Assinado</Badge>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => open(r)}>
                    <Icon name="pencil" size={16} /> Assinar como {PARTY_ROLE_LABELS[r]}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {snapshotHash ? (
          <p className={styles.itemNotes} title={`SHA-256 do conteúdo assinado: ${snapshotHash}`}>
            Conteúdo assinado congelado — hash de integridade {snapshotHash.slice(0, 12)}…
          </p>
        ) : null}
        {allSigned ? (
          <p className={styles.divergenceNote}>
            <Icon name="check" size={14} /> Ambas as partes assinaram esta vistoria — a entrega de chaves pode ser liberada.
          </p>
        ) : null}
      </Card>

      <Modal
        open={!!role}
        onClose={close}
        title={`Assinar como ${role ? PARTY_ROLE_LABELS[role] : ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={signing}>Cancelar</Button>
            <Button onClick={confirm} loading={signing}>Confirmar assinatura</Button>
          </>
        }
      >
        <p className={styles.itemNotes}>
          Ao confirmar, esta pessoa declara estar de acordo com o laudo registrado acima. A assinatura exige a verificação em duas etapas de quem registra.
        </p>
        <FormField label="Nome completo" htmlFor="f-signature" required error={error || undefined} helper="Digite o nome completo para confirmar a assinatura.">
          <Input id="f-signature" value={name} error={!!error} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" />
        </FormField>
      </Modal>
    </>
  );
}
