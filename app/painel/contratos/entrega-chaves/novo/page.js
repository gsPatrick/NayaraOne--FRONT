"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { CONTRACTS, INSPECTIONS } from "@/lib/mock/legal";
import { PEOPLE } from "@/lib/mock/people";
import styles from "./page.module.css";

export default function NovaEntregaChavesPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractId: CONTRACTS[0]?.id || "",
    inspectionId: "",
    deliveredToPersonId: PEOPLE[0]?.id || "",
    notes: "",
  });

  const isValid = form.contractId && form.deliveredToPersonId;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit() {
    if (!isValid) return;
    setSubmitting(true);
    // Mock: em produção isto chamaria POST /v1/legal/key-deliveries (keyDeliveries.service.js)
    window.setTimeout(() => router.push("/painel/contratos/entrega-chaves"), 500);
  }

  return (
    <AppShell title="Nova entrega de chaves" backHref="/painel/contratos/entrega-chaves">
      <div className={styles.wrap}>
        <Alert tone="info" title="Trava de liberação">
          A liberação efetiva das chaves só é permitida quando o contrato estiver assinado (SIGNED) ou ativo (ACTIVE) e, se houver vistoria de entrada vinculada, ela precisa estar concluída.
        </Alert>

        <Card title="Dados da entrega">
          <div className={styles.formGrid}>
            <FormField label="Contrato" htmlFor="f-contract" required>
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                {CONTRACTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNumber}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Vistoria vinculada" htmlFor="f-inspection" helper="Opcional — vistoria de entrada (CHECK_IN)">
              <Select id="f-inspection" value={form.inspectionId} onChange={update("inspectionId")}>
                <option value="">Nenhuma</option>
                {INSPECTIONS.map((i) => (
                  <option key={i.id} value={i.id}>{i.id} — {i.inspectionType}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Entregue para" htmlFor="f-person" required>
              <Select id="f-person" value={form.deliveredToPersonId} onChange={update("deliveredToPersonId")}>
                {PEOPLE.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Observações" htmlFor="f-notes" helper="Opcional">
            <textarea
              id="f-notes"
              className={styles.textarea}
              value={form.notes}
              onChange={update("notes")}
              placeholder="Ex: Entregues 2 jogos de chave + controle do portão."
              rows={4}
            />
          </FormField>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/entrega-chaves")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar entrega</Button>
        </div>
      </div>
    </AppShell>
  );
}
