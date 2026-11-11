"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listProperties } from "@/lib/api/properties";
import { listContracts, createInspectionWithItems } from "@/lib/api/legal";
import { INSPECTION_TYPES, INSPECTION_TYPE_LABELS } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { formatContractLabel, toNumber } from "@/lib/format";
import styles from "./page.module.css";
import ItemsEditor from "./ItemsEditor";

export default function NovaVistoriaPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    contractId: "",
    inspectionType: "ENTRY",
    scheduledAt: "",
  });
  const [items, setItems] = useState([]);
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

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => {
    return Promise.all([listProperties(), listContracts()])
      .then(([propertiesRes, contractsRes]) => {
        setProperties(propertiesRes || []);
        setContracts(contractsRes || []);
        setForm((prev) => ({ ...prev, propertyId: prev.propertyId || propertiesRes?.[0]?.id || "" }));
      })
      .then(() => true);
  }, { deps: [], isEmpty: () => false });

  const isValid = form.propertyId && form.inspectionType && form.scheduledAt && !scheduledAtInvalid;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  // Contrato escolhido: o imóvel passa a ser o do contrato (a vistoria de entrada libera as chaves desse contrato).
  function handleContractChange(e) {
    const contractId = e.target.value;
    const contract = contracts.find((c) => c.id === contractId);
    setForm((prev) => ({ ...prev, contractId, propertyId: contract?.propertyId || prev.propertyId }));
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

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      // FIX (Bug 4, atomicidade): um único request transacional — se qualquer item for
      // inválido (ex.: DAMAGED sem dado obrigatório), NADA é gravado, nem a vistoria.
      const { inspection } = await createInspectionWithItems({
        propertyId: form.propertyId,
        contractId: form.contractId || undefined,
        inspectionType: form.inspectionType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        // Fechamento M5 (Caderno §11): item estruturado por ambiente, com os códigos de pareamento e a descrição.
        items: items.map((item) => ({
          itemName: item.itemName,
          roomCode: item.roomCode,
          itemCode: item.itemCode,
          description: item.description || undefined,
          condition: item.condition,
          notes: item.notes || undefined,
          damageDescription: item.damageDescription || undefined,
          responsibleParty: item.responsibleParty || undefined,
          estimatedBudget: item.estimatedBudget !== "" ? toNumber(item.estimatedBudget) : undefined,
        })),
      });
      router.push(`/painel/contratos/vistorias/${inspection.id}`);
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao criar vistoria."));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Nova vistoria" backHref="/painel/contratos/vistorias">
        <AsyncState result={loadQuery} loadingLabel="Carregando dados..." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Nova vistoria" backHref="/painel/contratos/vistorias">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        {properties.length === 0 ? (
          <Alert tone="danger" title="Nenhum imóvel disponível">
            Não há imóveis cadastrados para vincular a esta vistoria — cadastre um imóvel antes de continuar. Sem isso o botão “Criar vistoria” fica desabilitado, mesmo com os outros campos preenchidos.
          </Alert>
        ) : null}

        <Alert tone="info" title="Itens da vistoria">
          Adicione os itens vistoriados por ambiente (opcional na criação). Fotos e vídeos de cada item são anexados na página da vistoria, antes de concluí-la.
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

            <FormField label="Contrato" htmlFor="f-contract" helper="Opcional — com contrato, o imóvel é o do contrato">
              <Select id="f-contract" value={form.contractId} onChange={handleContractChange}>
                <option value="">Nenhum</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Tipo de vistoria" htmlFor="f-type" required>
              <Select id="f-type" value={form.inspectionType} onChange={update("inspectionType")}>
                {INSPECTION_TYPES.map((k) => (
                  <option key={k} value={k}>{INSPECTION_TYPE_LABELS[k]}</option>
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

        <ItemsEditor items={items} onChange={setItems} />

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/vistorias")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid}>Criar vistoria</Button>
        </div>
      </div>
    </AppShell>
  );
}
