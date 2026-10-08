"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import { listLossCases, openLossCase, decideLossCase, listInventoryItems, listInventoryLocations, listAssets, listLossCaseAnomalies } from "@/lib/api/inventory";
import { listPeople } from "@/lib/api/people";
import { formatBRL, formatDateTime, toNumber } from "@/lib/format";

const STATUS_LABELS = { OPEN: "Em análise", APPROVED: "Aprovada (baixa gerada)", REJECTED: "Rejeitada" };
const STATUS_TONE = { OPEN: "warning", APPROVED: "danger", REJECTED: "neutral" };
const EMPTY_DECISION_FORM = { chargeResponsible: false, responsiblePersonId: "", responsibleName: "", chargeAmount: "" };

export default function PerdasPage() {
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [items, setItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);
  // EST-013/EST-TS-14: indícios da NAY (recorrência/valor fora do padrão) — contexto de LEITURA
  // para quem decide; não altera o fluxo de decisão nem gera cobrança. Falha aqui nunca impede a
  // tela de funcionar.
  const [nayFlags, setNayFlags] = useState({});
  const { confirm, ConfirmDialog } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // BUG REAL CORRIGIDO (auditoria "loop até secar", rodada 49, 2026-10-05): o back-end já
  // suporta declarar perda de um Asset/patrimônio (assetId), com lógica própria pra marcar
  // LOST/limpar custodiante/fechar empréstimos (R28/R30) — mas esta tela só permitia perda de
  // item de estoque (inventoryItemId). "targetType" alterna o formulário entre os dois modos.
  const [targetType, setTargetType] = useState("ITEM"); // ITEM | ASSET
  const [form, setForm] = useState({ inventoryItemId: "", assetId: "", locationId: "", quantity: "", context: "", evidenceFileIds: "", estimatedCost: "", responsiblePersonId: "", responsibleName: "" });

  // GAP CORRIGIDO (auditoria de conformidade Marco 7, contrato §11): "Investigação e decisão
  // humana determinam responsabilidade. Qualquer desconto financeiro segue regra/aprovação e
  // Financeiro." Aprovar agora abre um modal de decisão onde o aprovador decide SE cobra o
  // responsável (nem toda perda gera cobrança), QUEM é o responsável e QUANTO (padrão = a
  // estimativa do caso). Cobrar cria um lançamento a receber real no Financeiro.
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionForm, setDecisionForm] = useState(EMPTY_DECISION_FORM);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([
      listLossCases(),
      listInventoryItems(),
      listInventoryLocations(),
      listAssets(),
      // Nome do responsável é só exibição — sem permissão de leitura de Contatos a tela continua
      // funcionando (mostra "Responsável definido").
      listPeople().catch(() => []),
    ])
      .then(([c, i, l, a, ppl]) => {
        setCases(c || []);
        setItems(i || []);
        setLocations(l || []);
        setAssets(a || []);
        setPeople(ppl || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os casos de perda."))
      .finally(() => setLoading(false));
    listLossCaseAnomalies()
      .then((analysis) => {
        const map = {};
        for (const c of analysis?.cases || []) if (c.flags?.length) map[c.lossCaseId] = c.flags;
        setNayFlags(map);
      })
      .catch(() => setNayFlags({}));
  }
  useEffect(() => { load(); }, []);

  const evidenceIds = form.evidenceFileIds.split(",").map((s) => s.trim()).filter(Boolean);
  const isValid = targetType === "ITEM"
    ? form.inventoryItemId && form.locationId && !Number.isNaN(toNumber(form.quantity)) && toNumber(form.quantity) > 0 && form.context.trim() && evidenceIds.length > 0
    : form.assetId && form.context.trim() && evidenceIds.length > 0;

  const targetMissingPrerequisite = targetType === "ITEM"
    ? (items.length === 0 ? "item" : locations.length === 0 ? "local" : null)
    : (assets.filter((a) => a.status !== "LOST").length === 0 ? "patrimônio" : null);

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await openLossCase({
        inventoryItemId: targetType === "ITEM" ? form.inventoryItemId : undefined,
        assetId: targetType === "ASSET" ? form.assetId : undefined,
        locationId: targetType === "ITEM" ? (form.locationId || undefined) : undefined,
        quantity: targetType === "ITEM" ? toNumber(form.quantity) : undefined,
        context: form.context,
        evidenceFileIds: evidenceIds,
        estimatedCost: form.estimatedCost ? toNumber(form.estimatedCost) : undefined,
        responsiblePersonId: form.responsiblePersonId || undefined,
      });
      setModalOpen(false);
      setForm({ inventoryItemId: "", assetId: "", locationId: "", quantity: "", context: "", evidenceFileIds: "", estimatedCost: "", responsiblePersonId: "", responsibleName: "" });
      setTargetType("ITEM");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível registrar o caso de perda.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(id) {
    const ok = await confirm({
      title: "Rejeitar este caso de perda?",
      message: "O caso será rejeitado, o estoque não será baixado e ninguém será cobrado.",
      confirmLabel: "Rejeitar",
      tone: "primary",
    });
    if (!ok) return;
    setBusyId(id);
    setActionError("");
    try {
      await decideLossCase(id, "REJECTED");
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível decidir o caso de perda.");
    } finally {
      setBusyId(null);
    }
  }

  function openApproveModal(row) {
    setActionError("");
    setDecisionTarget(row);
    setDecisionForm({
      chargeResponsible: false,
      responsiblePersonId: row.responsiblePersonId || "",
      responsibleName: personName(row.responsiblePersonId) || "",
      chargeAmount: row.estimatedCost != null ? String(row.estimatedCost).replace(".", ",") : "",
    });
  }

  const decisionAmount = toNumber(decisionForm.chargeAmount);
  const decisionValid = !decisionForm.chargeResponsible
    || (Boolean(decisionForm.responsiblePersonId) && !Number.isNaN(decisionAmount) && decisionAmount > 0);

  async function handleApprove() {
    if (!decisionTarget || !decisionValid) return;
    setBusyId(decisionTarget.id);
    setActionError("");
    try {
      await decideLossCase(decisionTarget.id, "APPROVED", decisionForm.chargeResponsible
        ? { chargeResponsible: true, responsiblePersonId: decisionForm.responsiblePersonId, chargeAmount: decisionAmount }
        : {
          chargeResponsible: false,
          // Só envia quando o aprovador trocou/atribuiu o responsável nesta decisão.
          responsiblePersonId: decisionForm.responsiblePersonId && decisionForm.responsiblePersonId !== decisionTarget.responsiblePersonId
            ? decisionForm.responsiblePersonId
            : undefined,
        });
      setDecisionTarget(null);
      setDecisionForm(EMPTY_DECISION_FORM);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível aprovar o caso de perda.");
    } finally {
      setBusyId(null);
    }
  }

  function personName(id) {
    if (!id) return "";
    return people.find((p) => p.id === id)?.legalName || "";
  }

  function itemName(id) {
    return items.find((i) => i.id === id)?.name || "—";
  }

  function assetName(id) {
    const asset = assets.find((a) => a.id === id);
    return asset ? `${asset.name}${asset.assetTag ? ` (${asset.assetTag})` : ""}` : "—";
  }

  const columns = [
    { key: "item", label: "Item", width: "14%", render: (row) => (row.inventoryItemId ? itemName(row.inventoryItemId) : assetName(row.assetId)) },
    { key: "qty", label: "Quantidade", width: "7%", render: (row) => row.quantity || "—" },
    { key: "context", label: "Contexto", width: "15%" },
    { key: "estimate", label: "Estimativa", width: "9%", render: (row) => (row.estimatedCost != null ? formatBRL(row.estimatedCost) : "—") },
    { key: "responsible", label: "Responsável", width: "10%", render: (row) => (row.responsiblePersonId ? personName(row.responsiblePersonId) || "Responsável definido" : "—") },
    {
      key: "charge",
      label: "Cobrança",
      width: "10%",
      render: (row) => (row.chargeFinancialEntry ? (
        <span title="Lançamento a receber criado no Financeiro">
          {formatBRL(row.chargeFinancialEntry.amount)} <Badge tone="info">A receber</Badge>
        </span>
      ) : row.status === "APPROVED" ? "Sem cobrança" : "—"),
    },
    {
      key: "status",
      label: "Status",
      width: "21%",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge>
          {nayFlags[row.id] ? (
            <span title={`${nayFlags[row.id].map((f) => f.message).join(" ")} (Sugestão da NAY — não atribui culpa nem gera cobrança.)`} style={{ fontSize: 12 }}>
              <Badge tone="warning">NAY: {nayFlags[row.id].length} indício(s)</Badge>{" "}
              <Link href="/painel/estoque/sugestoes">ver</Link>
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "14%",
      render: (row) => (row.status === "OPEN" ? (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" variant="danger" onClick={() => openApproveModal(row)} loading={busyId === row.id}>Aprovar baixa</Button>
          <Button size="sm" variant="secondary" onClick={() => handleReject(row.id)} loading={busyId === row.id}>Rejeitar</Button>
        </div>
      ) : null),
    },
  ];

  return (
    <AppShell title="Perdas, quebras e extravios" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os casos de perda">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Casos de perda" subtitle="Perda não é baixa comum — exige evidência e decisão separada (EST-010)">
        <Table columns={columns} rows={loading ? [] : cases} loading={loading} emptyMessage="Nenhum caso de perda registrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={() => setModalOpen(true)}>
          <Icon name="plus" size={18} /> Registrar perda
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Registrar perda, quebra ou extravio"
        footer={
          targetMissingPrerequisite ? (
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Registrar</Button>
            </>
          )
        }
      >
        <FormField label="Tipo" required>
          <Select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            <option value="ITEM">Item de estoque (consumível)</option>
            <option value="ASSET">Patrimônio (ferramenta/equipamento)</option>
          </Select>
        </FormField>

        {targetMissingPrerequisite ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState
              icon={targetMissingPrerequisite === "patrimônio" ? "layers" : targetMissingPrerequisite === "local" ? "mapPin" : "layers"}
              title={`Nenhum ${targetMissingPrerequisite} cadastrado`}
              description={`Você precisa cadastrar pelo menos um ${targetMissingPrerequisite} antes de registrar essa perda.`}
            />
            <Button onClick={() => router.push(targetType === "ASSET" ? "/painel/estoque/patrimonio" : "/painel/estoque")}>
              Cadastrar {targetMissingPrerequisite} agora
            </Button>
          </div>
        ) : targetType === "ITEM" ? (
          <>
            <FormField label="Item" required>
              <Select value={form.inventoryItemId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemId: e.target.value }))}>
                <option value="">Selecione...</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Local" required helper="Obrigatório — necessário para aprovar a baixa depois (gera o movimento LOSS nesse local).">
              <Select value={form.locationId} onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}>
                <option value="">Selecione...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantidade perdida" required>
              <DecimalInput value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </FormField>
          </>
        ) : (
          <FormField label="Patrimônio" required helper="Ao aprovar, o ativo é marcado como perdido/extraviado (LOST), o custodiante é limpo e qualquer empréstimo em aberto é fechado.">
            <Select value={form.assetId} onChange={(e) => setForm((p) => ({ ...p, assetId: e.target.value }))}>
              <option value="">Selecione...</option>
              {assets.filter((a) => a.status !== "LOST").map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.assetTag ? ` (${a.assetTag})` : ""}</option>
              ))}
            </Select>
          </FormField>
        )}
        {!targetMissingPrerequisite ? (
          <>
            <FormField label="Contexto" required helper="O que aconteceu — obrigatório para auditoria.">
              <Input value={form.context} onChange={(e) => setForm((p) => ({ ...p, context: e.target.value }))} />
            </FormField>
            <FormField label="IDs de evidência (arquivo)" required helper="Pelo menos um arquivo de evidência é obrigatório (EST-TS-10). Separe por vírgula.">
              <Input value={form.evidenceFileIds} onChange={(e) => setForm((p) => ({ ...p, evidenceFileIds: e.target.value }))} />
            </FormField>
            <FormField label="Estimativa de custo (R$)">
              <DecimalInput value={form.estimatedCost} onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))} />
            </FormField>
            <FormField label="Responsável (se identificado)" helper="Opcional — a responsabilidade final é definida na decisão do caso.">
              <PersonPicker
                id="loss-open-responsible"
                value={form.responsibleName}
                personId={form.responsiblePersonId}
                placeholder="Buscar pessoa pelo nome..."
                onSelect={({ name, personId }) => setForm((p) => ({ ...p, responsibleName: name, responsiblePersonId: personId || "" }))}
              />
            </FormField>
          </>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Aprovar baixa de perda"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDecisionTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleApprove} loading={Boolean(decisionTarget) && busyId === decisionTarget.id} disabled={!decisionValid}>
              {decisionForm.chargeResponsible ? "Aprovar e cobrar" : "Aprovar baixa"}
            </Button>
          </>
        }
      >
        {decisionTarget ? (
          <>
            <p style={{ marginBottom: "var(--space-4)" }}>
              {decisionTarget.inventoryItemId
                ? "O estoque será baixado definitivamente para este item (movimento LOSS)."
                : "O patrimônio será marcado como perdido/extraviado e retirado de circulação."}
              {decisionTarget.estimatedCost != null ? ` Estimativa registrada: ${formatBRL(decisionTarget.estimatedCost)}.` : ""}
            </p>
            <FormField label="Responsável" helper={decisionForm.chargeResponsible ? "Obrigatório para cobrar." : "Opcional — registra quem foi responsabilizado pela perda."}>
              <PersonPicker
                id="loss-decision-responsible"
                value={decisionForm.responsibleName}
                personId={decisionForm.responsiblePersonId}
                placeholder="Buscar pessoa pelo nome..."
                onSelect={({ name, personId }) => setDecisionForm((p) => ({ ...p, responsibleName: name, responsiblePersonId: personId || "" }))}
              />
            </FormField>
            <FormField>
              <Checkbox
                id="loss-decision-charge"
                label="Cobrar o responsável (gera lançamento a receber no Financeiro)"
                checked={decisionForm.chargeResponsible}
                onChange={(e) => setDecisionForm((p) => ({ ...p, chargeResponsible: e.target.checked }))}
              />
            </FormField>
            {decisionForm.chargeResponsible ? (
              <FormField label="Valor a cobrar (R$)" required helper="Padrão: a estimativa de custo do caso — ajuste se a investigação apurou outro valor.">
                <DecimalInput value={decisionForm.chargeAmount} onChange={(e) => setDecisionForm((p) => ({ ...p, chargeAmount: e.target.value }))} />
              </FormField>
            ) : (
              <p style={{ color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)" }}>Sem cobrança: a perda é baixada sem desconto financeiro a ninguém.</p>
            )}
          </>
        ) : null}
      </Modal>

      <ConfirmDialog />
    </AppShell>
  );
}
