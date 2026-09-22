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
import Badge from "@/components/atoms/Badge/Badge";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listProperties } from "@/lib/api/properties";
import { listContracts, createInspection, addInspectionItem } from "@/lib/api/legal";
import { INSPECTION_TYPE_LABELS, CONDITION_LABELS, CONDITION_TONE, RESPONSIBLE_PARTY_LABELS } from "@/lib/mock/legal";
import { formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

export default function NovaVistoriaPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    contractId: "",
    inspectionType: "CHECK_IN",
    scheduledAt: "",
  });
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    itemName: "",
    condition: "GOOD",
    notes: "",
    damageDescription: "",
    responsibleParty: "",
    estimatedBudget: "",
  });
  const [newItemError, setNewItemError] = useState("");
  // FIX (reportado pela cliente): reproduzido — ao digitar a data/hora agendada direto pelo
  // teclado (sem usar Tab entre os segmentos do <input type="datetime-local">), um dígito a
  // mais no ano (ex: "202610" em vez de "2026") deixa o campo em estado inválido e o
  // navegador reporta e.target.value = "" silenciosamente. Como "Data e hora agendada" é
  // obrigatória, o botão "Criar vistoria" ficava desabilitado sem NENHUM aviso — exatamente
  // o sintoma relatado ("preenchi tudo e o botão continua desabilitado"). Agora detectamos a
  // invalidez e mostramos um erro explícito no campo.
  //
  // FIX 2 (reteste da cliente): reproduzido em WebKit/Safari — o navegador da cliente. Nesse
  // motor, os segmentos do <input type="datetime-local"> podem aparecer TODOS preenchidos na
  // tela (ex: "30/09/2026, 12:30") sem nenhum indício visual de erro, mas
  // `e.target.value`/`validity` continuam vazios/sem badInput marcado — ou seja, o check
  // anterior (que só olhava validity.badInput/rangeOverflow/rangeUnderflow) não pega esse
  // caso. Resultado: campo parece 100% preenchido, mas form.scheduledAt fica "" e o botão
  // "Criar vistoria" trava desabilitado sem nenhum aviso — exatamente o que a cliente
  // reportou no reteste. Agora, qualquer vez que o campo foi tocado e o valor efetivo ficar
  // vazio, tratamos como inválido e mostramos o erro, independente da validity nativa.
  const [scheduledAtTouched, setScheduledAtTouched] = useState(false);
  const [scheduledAtBadInput, setScheduledAtBadInput] = useState(false);
  const scheduledAtInvalid = scheduledAtTouched && (scheduledAtBadInput || !form.scheduledAt);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProperties(), listContracts()])
      .then(([propertiesRes, contractsRes]) => {
        if (cancelled) return;
        setProperties(propertiesRes || []);
        setContracts(contractsRes || []);
        setForm((prev) => ({ ...prev, propertyId: prev.propertyId || propertiesRes?.[0]?.id || "" }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isValid = form.propertyId && form.inspectionType && form.scheduledAt && !scheduledAtInvalid;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleScheduledAtChange(e) {
    const validity = e.target.validity;
    const invalid = !!validity && (validity.badInput || validity.rangeOverflow || validity.rangeUnderflow);
    setScheduledAtTouched(true);
    setScheduledAtBadInput(invalid);
    setForm((prev) => ({ ...prev, scheduledAt: e.target.value }));
  }

  // FIX 3 (reteste da cliente, causa raiz de verdade): em WebKit/Safari, quando os segmentos
  // digitados no <input type="datetime-local"> nunca chegam a formar uma combinação válida
  // (ex.: por causa da ordem dd/mm/aaaa do locale do navegador conflitando com a ordem
  // esperada), o navegador NUNCA dispara o evento "input"/"change" — ou seja, o
  // handleScheduledAtChange acima nunca é chamado, o estado React nunca fica "touched", e o
  // campo mostra os dígitos digitados na tela (parecendo preenchido) enquanto
  // form.scheduledAt continua "" desde o início, sem NENHUM aviso. É exatamente o sintoma da
  // cliente: "preenchi tudo e o botão continua desabilitado". Como o evento "blur" SEMPRE
  // dispara ao sair do campo (mesmo quando "change" nunca disparou), usamos onBlur como rede
  // de segurança: ao perder o foco, lemos o estado real do input (value/validity) direto do
  // DOM e sincronizamos o estado do formulário e do erro exibido.
  function handleScheduledAtBlur(e) {
    const validity = e.target.validity;
    const invalid = !!validity && (validity.badInput || validity.rangeOverflow || validity.rangeUnderflow);
    setScheduledAtTouched(true);
    setScheduledAtBadInput(invalid);
    setForm((prev) => (prev.scheduledAt === e.target.value ? prev : { ...prev, scheduledAt: e.target.value }));
  }

  // FIX (Bug 4, reportado pela cliente): a API rejeita (400) um item com condition="DAMAGED"
  // sem "damageDescription" (e, na prática, sem "estimatedBudget" numérico >= 0 e
  // "responsibleParty" também — ver validação real em
  // NayaraOne--API/src/features/legal/inspections.service.js#addInspectionItem). Antes o
  // formulário não pedia nenhum desses campos e deixava o usuário "confirmar" o item na tela
  // (adicionar à lista local) mesmo faltando dado obrigatório — o erro só aparecia depois, ao
  // submeter TODA a vistoria, quando a vistoria-pai já tinha sido criada mas o item falhava.
  // Agora validamos aqui, antes de adicionar o item à lista, então o submit nunca chega a
  // mandar um item DAMAGED inválido pra API.
  function addItem() {
    if (!newItem.itemName.trim()) return;
    setNewItemError("");
    if (newItem.condition === "DAMAGED") {
      if (!newItem.damageDescription.trim()) {
        setNewItemError('Descreva o dano ("Descrição do dano" é obrigatória para itens com condição "Danificado").');
        return;
      }
      const budgetNumber = Number(newItem.estimatedBudget);
      if (newItem.estimatedBudget === "" || !Number.isFinite(budgetNumber) || budgetNumber < 0) {
        setNewItemError('Informe um "Orçamento estimado" numérico (>= 0) para itens com condição "Danificado".');
        return;
      }
      if (!newItem.responsibleParty) {
        setNewItemError('Selecione o "Responsável pelo dano" para itens com condição "Danificado".');
        return;
      }
    }
    setItems((prev) => [...prev, { id: `tmp-${Date.now()}`, ...newItem }]);
    setNewItem({ itemName: "", condition: "GOOD", notes: "", damageDescription: "", responsibleParty: "", estimatedBudget: "" });
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const inspection = await createInspection({
        propertyId: form.propertyId,
        contractId: form.contractId || undefined,
        inspectionType: form.inspectionType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      for (const item of items) {
        await addInspectionItem(inspection.id, {
          itemName: item.itemName,
          condition: item.condition,
          notes: item.notes || undefined,
          damageDescription: item.damageDescription || undefined,
          responsibleParty: item.responsibleParty || undefined,
          estimatedBudget: item.estimatedBudget !== "" ? item.estimatedBudget : undefined,
        });
      }
      router.push(`/painel/contratos/vistorias/${inspection.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar vistoria.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Nova vistoria" backHref="/painel/contratos/vistorias">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nova vistoria" backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        {!loading && !loadError && properties.length === 0 ? (
          <Alert tone="danger" title="Nenhum imóvel disponível">
            Não há imóveis cadastrados para vincular a esta vistoria — cadastre um imóvel antes de continuar. Sem isso o botão "Criar vistoria" fica desabilitado, mesmo com os outros campos preenchidos.
          </Alert>
        ) : null}

        <Alert tone="info" title="Itens da vistoria">
          Adicione os itens vistoriados (opcional na criação) — eles ficam registrados na página de detalhe, junto ao laudo comparativo entrada/saída.
        </Alert>

        <Card title="Dados da vistoria">
          <div className={styles.formGrid}>
            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Contrato" htmlFor="f-contract" helper="Opcional">
              <Select id="f-contract" value={form.contractId} onChange={update("contractId")}>
                <option value="">Nenhum</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tipo de vistoria" htmlFor="f-type" required>
              <Select id="f-type" value={form.inspectionType} onChange={update("inspectionType")}>
                {Object.entries(INSPECTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Data e hora agendada"
              htmlFor="f-scheduled"
              required
              error={scheduledAtInvalid ? "Data/hora inválida ou incompleta — preencha dia, mês, ano e horário (use um ano entre 1900 e 2100)." : undefined}
            >
              <Input
                id="f-scheduled"
                type="datetime-local"
                min="1900-01-01T00:00"
                max="2100-12-31T23:59"
                error={scheduledAtInvalid}
                value={form.scheduledAt}
                onChange={handleScheduledAtChange}
                onBlur={handleScheduledAtBlur}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Itens da vistoria" subtitle="Adicione os itens que serão vistoriados">
          <div className={styles.itemsList}>
            {items.length === 0 ? (
              <p className={styles.emptyText}>Nenhum item adicionado ainda.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.itemName}</span>
                    {item.notes ? <span className={styles.itemNotes}>{item.notes}</span> : null}
                    {item.condition === "DAMAGED" ? (
                      <span className={styles.itemNotes}>
                        Dano: {item.damageDescription}
                        {item.responsibleParty ? ` — Responsável: ${RESPONSIBLE_PARTY_LABELS[item.responsibleParty] || item.responsibleParty}` : ""}
                        {item.estimatedBudget !== "" ? ` — Orçamento: R$ ${Number(item.estimatedBudget).toFixed(2)}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
                  <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)} aria-label="Remover item">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.addItemRow}>
            <FormField label="Item" htmlFor="f-item-name">
              <Input id="f-item-name" value={newItem.itemName} onChange={(e) => setNewItem((prev) => ({ ...prev, itemName: e.target.value }))} placeholder="Ex: Pintura — sala" />
            </FormField>
            <FormField label="Condição" htmlFor="f-item-condition">
              <Select id="f-item-condition" value={newItem.condition} onChange={(e) => setNewItem((prev) => ({ ...prev, condition: e.target.value }))}>
                {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Observações" htmlFor="f-item-notes" helper="Opcional">
              <Input id="f-item-notes" value={newItem.notes} onChange={(e) => setNewItem((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Ex: Sem marcas ou manchas" />
            </FormField>
          </div>

          {newItem.condition === "DAMAGED" ? (
            <div className={styles.addItemRow}>
              <FormField label="Descrição do dano" htmlFor="f-item-damage" required helper="Obrigatório para itens danificados">
                <Input
                  id="f-item-damage"
                  value={newItem.damageDescription}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, damageDescription: e.target.value }))}
                  placeholder="Ex: Vidro trincado na janela da sala"
                />
              </FormField>
              <FormField label="Responsável pelo dano" htmlFor="f-item-responsible">
                <Select
                  id="f-item-responsible"
                  value={newItem.responsibleParty}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, responsibleParty: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {Object.entries(RESPONSIBLE_PARTY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Orçamento estimado (R$)" htmlFor="f-item-budget">
                <Input
                  id="f-item-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.estimatedBudget}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, estimatedBudget: e.target.value }))}
                  placeholder="Ex: 350.00"
                />
              </FormField>
            </div>
          ) : null}

          {newItemError ? <Alert tone="danger">{newItemError}</Alert> : null}

          <div className={styles.addItemRow}>
            <Button variant="secondary" onClick={addItem}>
              <Icon name="plus" size={16} /> Adicionar item
            </Button>
          </div>
        </Card>

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/vistorias")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar vistoria</Button>
        </div>
      </div>
    </AppShell>
  );
}
