"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listContracts, listInspections, createKeyDelivery, listContractParties } from "@/lib/api/legal";
import { listPeople } from "@/lib/api/people";
import { formatContractLabel, formatDate } from "@/lib/format";
import {
  CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS, PARTY_ROLE_LABELS,
  INSPECTION_TYPE_LABELS, INSPECTION_STATUS_LABELS,
} from "@/lib/mock/legal";
import styles from "./page.module.css";

export default function NovaEntregaChavesPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractId: "",
    inspectionId: "",
    deliveredToPersonId: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listContracts(), listInspections(), listPeople()])
      .then(([contractsRes, inspectionsRes, peopleRes]) => {
        if (cancelled) return;
        // O7: sem duplicados (por id) e ordenado pelo número.
        const seen = new Set();
        setContracts((contractsRes || []).filter((c) => (seen.has(c.id) ? false : seen.add(c.id))));
        setInspections(inspectionsRes || []);
        setPeople(peopleRes || []);
        setForm((prev) => ({
          ...prev,
          contractId: prev.contractId || contractsRes?.[0]?.id || "",
        }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // F6 (auditoria M45): recebedor só pode ser PARTE do contrato (a API também recusa).
  const [parties, setParties] = useState(null);
  const [contractSearch, setContractSearch] = useState("");
  useEffect(() => {
    if (!form.contractId) { setParties([]); return undefined; }
    let cancelled = false;
    setParties(null);
    listContractParties(form.contractId)
      .then((res) => { if (!cancelled) setParties(res || []); })
      .catch(() => { if (!cancelled) setParties([]); });
    return () => { cancelled = true; };
  }, [form.contractId]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const partyOptions = useMemo(() => {
    const seen = new Set();
    return (parties || []).filter((p) => (seen.has(p.personId) ? false : seen.add(p.personId)));
  }, [parties]);
  useEffect(() => {
    if (parties === null) return;
    setForm((prev) => (partyOptions.some((p) => p.personId === prev.deliveredToPersonId)
      ? prev
      : { ...prev, deliveredToPersonId: partyOptions[0]?.personId || "" }));
  }, [parties, partyOptions]);

  const contractOptionLabel = (c) => [
    formatContractLabel(c),
    CONTRACT_TYPE_LABELS[c.contractType] || c.contractType,
    CONTRACT_STATUS_LABELS[c.status] || c.status,
  ].filter(Boolean).join(" · ");
  const filteredContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    const list = q ? contracts.filter((c) => contractOptionLabel(c).toLowerCase().includes(q)) : contracts;
    // mantém o selecionado visível mesmo fora do filtro
    const sel = contracts.find((c) => c.id === form.contractId);
    return sel && !list.includes(sel) ? [sel, ...list] : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, contractSearch, form.contractId]);

  // O4: vistorias do contrato escolhido, com rótulo em português (sem UUID cru).
  const contractInspections = inspections.filter((i) => !form.contractId || i.contractId === form.contractId);
  const inspectionLabel = (i) => [
    `Vistoria de ${(INSPECTION_TYPE_LABELS[i.inspectionType] || i.inspectionType || "").toLowerCase()}`,
    INSPECTION_STATUS_LABELS[i.status] || i.status,
    i.completedAt || i.scheduledAt ? formatDate(i.completedAt || i.scheduledAt) : null,
  ].filter(Boolean).join(" · ");

  const isValid = form.contractId && form.deliveredToPersonId;

  function update(field) {
    return (e) => setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
      ...(field === "contractId" ? { inspectionId: "", deliveredToPersonId: "" } : {}),
    }));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const delivery = await createKeyDelivery({
        contractId: form.contractId,
        inspectionId: form.inspectionId || undefined,
        deliveredToPersonId: form.deliveredToPersonId,
        notes: form.notes || undefined,
      });
      router.push(`/painel/contratos/entrega-chaves/${delivery.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar entrega de chaves.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Nova entrega de chaves" backHref="/painel/contratos/entrega-chaves">
        <SkeletonDetail sections={1} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nova entrega de chaves" backHref="/painel/contratos/entrega-chaves">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Trava de liberação">
          A liberação efetiva das chaves só é permitida quando o contrato estiver assinado ou ativo e, se houver vistoria de entrada vinculada, ela precisa estar concluída.
        </Alert>

        <Card title="Dados da entrega">
          <div className={styles.formGrid}>
            <FormField label="Contrato" htmlFor="f-contract" required helper={`${filteredContracts.length} de ${contracts.length} contrato(s)`}>
              <SearchInput
                placeholder="Buscar contrato por número, tipo ou status"
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
              />
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                {filteredContracts.map((c) => (
                  <option key={c.id} value={c.id}>{contractOptionLabel(c)}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Vistoria vinculada" htmlFor="f-inspection" helper="Opcional — vistorias deste contrato">
              <Select id="f-inspection" value={form.inspectionId} onChange={update("inspectionId")}>
                <option value="">Nenhuma</option>
                {contractInspections.map((i) => (
                  <option key={i.id} value={i.id}>{inspectionLabel(i)}</option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Entregue para"
              htmlFor="f-person"
              required
              helper={parties !== null && partyOptions.length === 0 ? "Este contrato não tem partes cadastradas — cadastre as partes no contrato antes." : "Somente partes do contrato."}
            >
              <Select id="f-person" value={form.deliveredToPersonId} onChange={update("deliveredToPersonId")} disabled={parties === null || partyOptions.length === 0}>
                {parties === null ? <option value="">Carregando partes…</option> : null}
                {partyOptions.map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {(peopleById.get(p.personId)?.legalName || "Pessoa")} — {PARTY_ROLE_LABELS[p.partyRole] || p.partyRole}
                  </option>
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
