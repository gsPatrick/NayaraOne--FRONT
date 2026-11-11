"use client";

import { useState } from "react";
import Alert from "@/components/molecules/Alert/Alert";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
import { unlinkPerson } from "@/lib/api/people";
import { hasPermission } from "@/lib/rbac/permissions";
import { humanizeApiError } from "@/lib/errors/apiErrors";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const MOTIVO_MINIMO = 5;

/**
 * Pessoa do grupo vinculada a esta empresa (DI-M9I-3): o cadastro base é mantido por outra empresa do grupo. Explica o que esta
 * empresa vê e altera e, para quem tem a permissão people:link, oferece "Desfazer vínculo" com motivo obrigatório (auditado na
 * API). Para o cadastro desta empresa, não mostra nada.
 */
export default function VinculoAviso({ person, onUnlinked }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!person || person.vinculo !== "VINCULADA") return null;
  const podeDesfazer = hasPermission("people:link");
  const curto = reason.trim().length < MOTIVO_MINIMO;

  async function confirmar() {
    if (curto) {
      setError(`Informe o motivo (mínimo de ${MOTIVO_MINIMO} caracteres).`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await unlinkPerson(person.id, reason.trim());
      setOpen(false);
      onUnlinked?.();
    } catch (err) {
      setError(humanizeApiError(err).message || "Não foi possível desfazer o vínculo. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.mergedAlert}>
      <Alert tone="info" title="Cadastro do grupo vinculado a esta empresa">
        O cadastro base desta pessoa (nome, documento e nascimento) é mantido por outra empresa do grupo e só ela o altera.
        Aqui ficam os contatos, endereços, documentos, papéis e consentimentos desta empresa; os da outra empresa não aparecem.
        {person.vinculadaEm ? ` Vinculado em ${formatDate(person.vinculadaEm)}.` : ""}
        {podeDesfazer ? (
          <span className={styles.vinculoAcao}>
            <Button variant="secondary" size="sm" onClick={() => { setReason(""); setError(""); setOpen(true); }}>
              Desfazer vínculo
            </Button>
          </span>
        ) : null}
      </Alert>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Desfazer o vínculo com esta empresa?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmar} loading={busy}>Desfazer vínculo</Button>
          </>
        }
      >
        <p>
          A pessoa deixa de aparecer nesta empresa. Os contatos, endereços, documentos, papéis e consentimentos desta empresa ficam
          guardados e voltam se o vínculo for refeito pelo CPF/CNPJ e o nome. O cadastro da outra empresa não muda.
        </p>
        <FormField label="Motivo" htmlFor="vinculo-motivo" required error={error || undefined} helper={`Fica na auditoria. Mínimo de ${MOTIVO_MINIMO} caracteres.`}>
          <Input id="vinculo-motivo" value={reason} onChange={(e) => setReason(e.target.value)} error={Boolean(error)} maxLength={500} />
        </FormField>
      </Modal>
    </div>
  );
}

/** Aviso da tela de edição: a base da pessoa vinculada só muda pela empresa responsável (os campos ficam desabilitados). */
export function BaseDeOutraEmpresa() {
  return (
    <Alert tone="info" title="Cadastro base mantido por outra empresa do grupo">
      Nome, documento, nascimento e status só mudam pela empresa responsável pelo cadastro. Aqui você altera os papéis, contatos e documentos desta empresa.
    </Alert>
  );
}
