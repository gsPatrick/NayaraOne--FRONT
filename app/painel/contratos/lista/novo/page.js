"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Icon from "@/components/atoms/Icon/Icon";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { createContract, addContractParty, listContractTemplates, renderContractTemplate, createContractVersion } from "@/lib/api/legal";
import { CONTRACT_TYPE_LABELS, PARTY_ROLE_LABELS } from "@/lib/mock/legal";
import { dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE } from "@/lib/format";
import styles from "./page.module.css";

export default function NovoContratoPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [people, setPeople] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractType: "LEASE",
    propertyId: "",
    totalValue: "",
    startsAt: "",
    endsAt: "",
    templateId: "",
  });
  const [parties, setParties] = useState([]);
  const [newParty, setNewParty] = useState({ personId: "", partyRole: "LANDLORD" });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProperties(), listPeople(), listContractTemplates()])
      .then(([propertiesRes, peopleRes, templatesRes]) => {
        if (cancelled) return;
        setProperties(propertiesRes || []);
        setPeople(peopleRes || []);
        setTemplates(templatesRes || []);
        setForm((prev) => ({ ...prev, propertyId: prev.propertyId || propertiesRes?.[0]?.id || "" }));
        setNewParty((prev) => ({ ...prev, personId: prev.personId || peopleRes?.[0]?.id || "" }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const templatesForType = templates.filter((t) => t.contractType === form.contractType);

  const [dateErrors, setDateErrors] = useState({});
  const isValid =
    form.propertyId && Number(form.totalValue) > 0 && parties.length > 0 && !dateErrors.startsAt && !dateErrors.endsAt;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function updateDate(field) {
    return (e) => {
      setDateErrors((prev) => ({ ...prev, [field]: isDateInputInvalid(e.target.validity) }));
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function checkDate(field) {
    return (e) => setDateErrors((prev) => ({ ...prev, [field]: isDateInputInvalid(e.target.validity) }));
  }

  function addParty() {
    const person = people.find((p) => p.id === newParty.personId);
    if (!person) return;
    setParties((prev) => [...prev, { id: `tmp-${Date.now()}`, personId: newParty.personId, partyRole: newParty.partyRole }]);
  }

  function removeParty(id) {
    setParties((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const contract = await createContract({
        propertyId: form.propertyId,
        contractType: form.contractType,
        totalValue: Number(form.totalValue),
        startsAt: dateOnlyInputToIso(form.startsAt),
        endsAt: dateOnlyInputToIso(form.endsAt),
      });
      for (const party of parties) {
        await addContractParty(contract.id, { personId: party.personId, partyRole: party.partyRole });
      }
      // Se um template foi escolhido, gera a primeira versão já com o texto renderizado a
      // partir dele (preview via renderContractTemplate + persistência via createContractVersion,
      // ver lib/api/legal.js). requireDocument:false porque nesta etapa ainda não existe upload
      // de arquivo real — é um rascunho textual vinculado ao template, gate de documento real
      // continua valendo mais adiante (transição para SIGNING, ver contracts.service.js).
      if (form.templateId) {
        const rendered = await renderContractTemplate(form.templateId, {});
        await createContractVersion(contract.id, {
          content: rendered.content,
          templateId: form.templateId,
          requireDocument: false,
        });
      }
      router.push(`/painel/contratos/lista/${contract.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar contrato.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Máquina de estados">
          O contrato nasce em DRAFT e avança etapa por etapa (Documentos pendentes → Análise jurídica → Aprovado → Em assinatura → Assinado → Ativo) — a transição é feita na página de detalhe.
        </Alert>

        <Card title="Dados do contrato">
          <div className={styles.formGrid}>
            <FormField label="Tipo de contrato" htmlFor="f-type">
              <Select id="f-type" value={form.contractType} onChange={update("contractType")}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Template do contrato" htmlFor="f-template" helper="Opcional — gera a primeira versão do documento já preenchida a partir do modelo">
              <Select id="f-template" value={form.templateId} onChange={update("templateId")}>
                <option value="">Sem template (conteúdo manual)</option>
                {templatesForType.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Valor total (R$)" htmlFor="f-value" required>
              <Input id="f-value" type="number" min="0" step="0.01" value={form.totalValue} onChange={update("totalValue")} placeholder="0,00" />
            </FormField>

            <FormField
              label="Início de vigência"
              htmlFor="f-starts"
              helper={dateErrors.startsAt ? undefined : "Opcional"}
              error={dateErrors.startsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-starts"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={dateErrors.startsAt}
                value={form.startsAt}
                onChange={updateDate("startsAt")}
                onBlur={checkDate("startsAt")}
              />
            </FormField>

            <FormField
              label="Fim de vigência"
              htmlFor="f-ends"
              helper={dateErrors.endsAt ? undefined : "Opcional — relevante para locação"}
              error={dateErrors.endsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-ends"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={dateErrors.endsAt}
                value={form.endsAt}
                onChange={updateDate("endsAt")}
                onBlur={checkDate("endsAt")}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Partes do contrato" subtitle="Adicione ao menos uma parte (ex: locador e locatário, ou comprador e vendedor)">
          <div className={styles.partiesList}>
            {parties.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma parte adicionada ainda.</p>
            ) : (
              parties.map((party) => {
                const person = people.find((p) => p.id === party.personId);
                return (
                  <div key={party.id} className={styles.partyRow}>
                    <div className={styles.partyInfo}>
                      <span className={styles.partyName}>{person?.legalName || "—"}</span>
                      <span className={styles.partyRole}>{PARTY_ROLE_LABELS[party.partyRole]}</span>
                    </div>
                    <button type="button" className={styles.removeBtn} onClick={() => removeParty(party.id)} aria-label="Remover parte">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.addPartyRow}>
            <FormField label="Pessoa" htmlFor="f-party-person">
              <Select id="f-party-person" value={newParty.personId} onChange={(e) => setNewParty((prev) => ({ ...prev, personId: e.target.value }))}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Papel" htmlFor="f-party-role">
              <Select id="f-party-role" value={newParty.partyRole} onChange={(e) => setNewParty((prev) => ({ ...prev, partyRole: e.target.value }))}>
                {Object.entries(PARTY_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <Button variant="secondary" onClick={addParty}>
              <Icon name="plus" size={16} /> Adicionar
            </Button>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/lista")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar contrato</Button>
        </div>
      </div>
    </AppShell>
  );
}
