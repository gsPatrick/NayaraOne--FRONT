"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { listInventoryItems, createInventoryItem, updateInventoryItem, listInventoryLocations, createInventoryLocation, updateInventoryLocation, getItemMinStockRule, createItemMinStockRule } from "@/lib/api/inventory";
import { listProjects } from "@/lib/api/construction";
import { formatQuantity, formatBRL, toNumber } from "@/lib/format";
import styles from "../obras/lista/page.module.css";

const ITEM_TYPE_LABELS = { CONSUMABLE: "Consumível", TOOL: "Ferramenta", ASSET: "Patrimônio", SERVICE_ITEM: "Serviço" };
const ITEM_TYPE_TONE = { CONSUMABLE: "neutral", TOOL: "info", ASSET: "success", SERVICE_ITEM: "neutral" };
const LOCATION_TYPE_LABELS = { WAREHOUSE: "Almoxarifado", PROJECT_SITE: "Canteiro de obra" };

export default function EstoqueItensPage() {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", sku: "", unitOfMeasure: "", itemType: "CONSUMABLE", minimumQuantity: "" });
  const [savingItem, setSavingItem] = useState(false);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: "", locationType: "WAREHOUSE", projectId: "" });
  const [savingLocation, setSavingLocation] = useState(false);

  // F4 (auditoria Marco 7, Nayara, 14/10/2026): item e local de estoque não podiam ser editados
  // depois de criados — nem erro, nem ação de "Editar" em lugar nenhum. editingItem/editingLocation
  // reusam os mesmos modais de criação, só pré-preenchidos e chamando update em vez de create.
  const [editingItem, setEditingItem] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  // BUG REAL CORRIGIDO (auditoria Nayara, Marco 7, F2): sem a lista de obras aqui, era impossível
  // vincular um canteiro (PROJECT_SITE) a uma obra no cadastro — e sem essa obra, a API passou a
  // rejeitar (corretamente) qualquer movimento tocando esse local, tornando a transferência pra
  // canteiro de obra impossível na prática.
  const [projects, setProjects] = useState([]);

  // GAP CORRIGIDO (auditoria de conformidade Marco 7, EST-012: "Estoque mínimo e reposição vêm
  // do Motor de Regras"): a política de mínimo/reposição de cada item é a regra REG-EST-001 do
  // Motor de Regras (por item, com sobreposição opcional por local). Cada gravação publica uma
  // NOVA versão da regra — a coluna "Estoque mínimo" da tabela é só o espelho do padrão vigente.
  const [policyItem, setPolicyItem] = useState(null);
  const [policyInfo, setPolicyInfo] = useState(null);
  const [policyForm, setPolicyForm] = useState({ minimumQuantity: "", reorderQuantity: "", byLocation: {} });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listInventoryItems(), listInventoryLocations()])
      .then(([i, l]) => {
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o estoque."))
      .finally(() => setLoading(false));
    listProjects().then(setProjects).catch(() => setProjects([]));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (query && !it.name.toLowerCase().includes(query.toLowerCase()) && !(it.sku || "").toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && it.itemType !== typeFilter) return false;
      return true;
    });
  }, [items, query, typeFilter]);

  // BUG REAL CORRIGIDO (auditoria final Marco 7, Claude Browser, 14/10/2026): somava só o custo
  // UNITÁRIO de cada item, nunca multiplicava pelo saldo — "Valor em custo médio" não
  // representava nenhum valor real de estoque. A API agora já manda `totalValue` pronto
  // (saldo total × custo médio) por item; só somamos.
  const totalAvgValue = items.reduce((s, i) => s + (Number(i.totalValue) || 0), 0);

  // BUG REAL CORRIGIDO (auditoria "loop até secar", Marco 7, ciclo 1, 2026-10-07): a API exige
  // sku e unitOfMeasure (TAB-0750) mas o form só validava "name", deixando o usuário clicar em
  // "Criar" e só descobrir o erro depois da chamada à API. Agora valida os 3 campos no client.
  async function handleCreateItem() {
    if (!itemForm.name.trim() || !itemForm.sku.trim() || !itemForm.unitOfMeasure.trim()) return;
    setSavingItem(true);
    setActionError("");
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          name: itemForm.name,
          unitOfMeasure: itemForm.unitOfMeasure || undefined,
          minimumQuantity: itemForm.minimumQuantity ? toNumber(itemForm.minimumQuantity) : null,
          sku: itemForm.sku !== editingItem.sku ? itemForm.sku : undefined,
        });
      } else {
        await createInventoryItem({
          name: itemForm.name,
          sku: itemForm.sku || undefined,
          unitOfMeasure: itemForm.unitOfMeasure || undefined,
          itemType: itemForm.itemType,
          minimumQuantity: itemForm.minimumQuantity ? toNumber(itemForm.minimumQuantity) : undefined,
        });
      }
      setItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ name: "", sku: "", unitOfMeasure: "", itemType: "CONSUMABLE", minimumQuantity: "" });
      load();
    } catch (err) {
      setActionError(err?.message || `Não foi possível ${editingItem ? "salvar" : "criar"} o item.`);
    } finally {
      setSavingItem(false);
    }
  }

  function openEditItem(item) {
    setEditingItem(item);
    setItemForm({
      name: item.name || "",
      sku: item.sku || "",
      unitOfMeasure: item.unitOfMeasure || "",
      itemType: item.itemType || "CONSUMABLE",
      minimumQuantity: item.minimumQuantity != null ? toInputValue(item.minimumQuantity) : "",
    });
    setActionError("");
    setItemModalOpen(true);
  }

  const locationNeedsProject = locationForm.locationType === "PROJECT_SITE";
  const isLocationValid = locationForm.name.trim() && (!locationNeedsProject || locationForm.projectId);

  async function handleCreateLocation() {
    if (!isLocationValid) return;
    setSavingLocation(true);
    setActionError("");
    try {
      if (editingLocation) {
        await updateInventoryLocation(editingLocation.id, {
          name: locationForm.name,
          projectId: locationNeedsProject ? locationForm.projectId : null,
        });
      } else {
        await createInventoryLocation({
          name: locationForm.name,
          locationType: locationForm.locationType,
          projectId: locationNeedsProject ? locationForm.projectId : undefined,
        });
      }
      setLocationModalOpen(false);
      setEditingLocation(null);
      setLocationForm({ name: "", locationType: "WAREHOUSE", projectId: "" });
      load();
    } catch (err) {
      setActionError(err?.message || `Não foi possível ${editingLocation ? "salvar" : "criar"} o local.`);
    } finally {
      setSavingLocation(false);
    }
  }

  function openEditLocation(location) {
    setEditingLocation(location);
    setLocationForm({
      name: location.name || "",
      locationType: location.locationType || "WAREHOUSE",
      projectId: location.projectId || "",
    });
    setActionError("");
    setLocationModalOpen(true);
  }

  function toInputValue(value) {
    if (value == null) return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return String(num).replace(".", ",");
  }

  async function openPolicyModal(item) {
    setActionError("");
    setPolicyItem(item);
    setPolicyInfo(null);
    setPolicyForm({ minimumQuantity: "", reorderQuantity: "", byLocation: {} });
    setPolicyLoading(true);
    try {
      const policy = await getItemMinStockRule(item.id);
      setPolicyInfo(policy);
      const byLocation = {};
      Object.entries(policy?.byLocation || {}).forEach(([locId, qty]) => { byLocation[locId] = toInputValue(qty); });
      setPolicyForm({ minimumQuantity: toInputValue(policy?.minimumQuantity), reorderQuantity: toInputValue(policy?.reorderQuantity), byLocation });
    } catch (err) {
      setActionError(err?.message || "Não foi possível carregar a política de estoque mínimo.");
    } finally {
      setPolicyLoading(false);
    }
  }

  function optionalQuantity(raw) {
    if (raw == null || String(raw).trim() === "") return null;
    return toNumber(raw);
  }

  const policyValues = [policyForm.minimumQuantity, policyForm.reorderQuantity, ...Object.values(policyForm.byLocation)]
    .map(optionalQuantity)
    .filter((v) => v !== null);
  const policyValid = policyValues.every((v) => !Number.isNaN(v) && v >= 0);

  async function handleSavePolicy() {
    if (!policyItem || !policyValid) return;
    setSavingPolicy(true);
    setActionError("");
    try {
      const byLocation = {};
      Object.entries(policyForm.byLocation).forEach(([locId, raw]) => {
        const qty = optionalQuantity(raw);
        if (qty !== null) byLocation[locId] = qty;
      });
      await createItemMinStockRule(policyItem.id, {
        minimumQuantity: optionalQuantity(policyForm.minimumQuantity),
        reorderQuantity: optionalQuantity(policyForm.reorderQuantity),
        byLocation,
      });
      setPolicyItem(null);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível salvar a política de estoque mínimo.");
    } finally {
      setSavingPolicy(false);
    }
  }

  // BUG REAL CORRIGIDO (auditoria final Marco 7, Claude Browser, 14/10/2026): a soma das larguras
  // das colunas passava de 100% (22+12+14+10+14+14+20 = 106%), empurrando a coluna de ações
  // (botão "Editar") pra fora da área visível em larguras de tela normais — o botão ficava
  // coberto pela coluna "Custo médio" e não dava pra clicar nele. Redistribuído pra somar 100%,
  // com min-width na coluna de ações pra garantir espaço pros 2 botões.
  const columns = [
    { key: "name", label: "Nome", width: "18%", render: (row) => <span className={styles.nameMain}>{row.name}</span> },
    { key: "sku", label: "SKU", width: "10%", render: (row) => row.sku || "—" },
    { key: "itemType", label: "Tipo", width: "12%", render: (row) => <Badge tone={ITEM_TYPE_TONE[row.itemType]}>{ITEM_TYPE_LABELS[row.itemType]}</Badge> },
    { key: "unit", label: "Unidade", width: "8%", render: (row) => row.unitOfMeasure || "—" },
    { key: "min", label: "Estoque mínimo", width: "12%", render: (row) => (row.minimumQuantity != null ? formatQuantity(row.minimumQuantity) : "—") },
    { key: "avgCost", label: "Custo médio", width: "12%", render: (row) => (row.averageCost != null ? formatBRL(row.averageCost) : "—") },
    {
      key: "policy",
      label: "",
      width: "28%",
      render: (row) => (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", minWidth: 180 }}>
          <Button size="sm" variant="secondary" onClick={() => openEditItem(row)}>Editar</Button>
          {row.itemType !== "SERVICE_ITEM" ? (
            <Button size="sm" variant="secondary" onClick={() => openPolicyModal(row)}>Política de mínimo</Button>
          ) : null}
        </div>
      ),
    },
  ];

  const locationColumns = [
    { key: "name", label: "Nome", width: "24%" },
    { key: "type", label: "Tipo", width: "16%", render: (row) => LOCATION_TYPE_LABELS[row.locationType] || row.locationType },
    { key: "project", label: "Obra", width: "16%", render: (row) => row.project?.name || (row.locationType === "PROJECT_SITE" ? "—" : "") },
    { key: "status", label: "Status", width: "14%", render: (row) => <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Ativo" : "Inativo"}</Badge> },
    {
      key: "actions",
      label: "",
      width: "14%",
      render: (row) => <Button size="sm" variant="secondary" onClick={() => openEditLocation(row)}>Editar</Button>,
    },
  ];

  return (
    <AppShell title="Estoque — Itens & Locais" backHref="/painel">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar o estoque">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <div className={styles.grid}>
        {/* BUG REAL CORRIGIDO (auditoria final Marco 7, Claude Browser, 14/10/2026): os cards
            mostravam "0" por alguns segundos enquanto a lista ainda carregava, antes da resposta
            real chegar — mesmo padrão de flash de vazio já corrigido no histórico do Patrimônio
            nesta sessão. Agora mostram "—" durante o loading, nunca um "0" que pode ser confundido
            com o valor real. */}
        <StatTile label="Itens cadastrados" value={loading ? "—" : items.length} tone="neutral" icon="building" />
        <StatTile label="Ferramentas" value={loading ? "—" : items.filter((i) => i.itemType === "TOOL").length} tone="info" icon="chart" />
        <StatTile label="Locais cadastrados" value={loading ? "—" : locations.length} tone="success" icon="check" />
        <StatTile label="Valor em custo médio" value={loading ? "—" : formatBRL(totalAvgValue)} tone="neutral" icon="money" />
      </div>

      <Card title="Itens de estoque" subtitle="Catálogo mestre — materiais, ferramentas, patrimônio e serviços">
        <div className={styles.toolbar}>
          <SearchInput placeholder="Buscar por nome ou SKU..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select className={styles.filter} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <Table columns={columns} rows={loading ? [] : filtered} loading={loading} emptyMessage="Nenhum item cadastrado." />
      </Card>

      <Card title="Locais" subtitle="Almoxarifados e canteiros de obra">
        <Table columns={locationColumns} rows={loading ? [] : locations} loading={loading} emptyMessage="Nenhum local cadastrado." />
      </Card>

      <StickyActionBar>
        <Button variant="secondary" onClick={() => setLocationModalOpen(true)}>
          <Icon name="plus" size={18} /> Novo local
        </Button>
        <Button onClick={() => setItemModalOpen(true)}>
          <Icon name="plus" size={18} /> Novo item
        </Button>
      </StickyActionBar>

      <Modal
        open={itemModalOpen}
        onClose={() => { setItemModalOpen(false); setEditingItem(null); }}
        title={editingItem ? `Editar item — ${editingItem.name}` : "Novo item de estoque"}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setItemModalOpen(false); setEditingItem(null); }}>Cancelar</Button>
            <Button onClick={handleCreateItem} loading={savingItem} disabled={!itemForm.name.trim() || !itemForm.sku.trim() || !itemForm.unitOfMeasure.trim()}>{editingItem ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <FormField label="Nome" required>
          <Input value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Cimento CP-II 50kg" />
        </FormField>
        <FormField label="SKU" required helper={editingItem ? "Só pode ser alterado se o item ainda não tiver nenhuma movimentação registrada." : undefined}>
          <Input value={itemForm.sku} onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))} placeholder="Ex.: CIM-CPII-50" />
        </FormField>
        <FormField label="Unidade de medida" required>
          <Input value={itemForm.unitOfMeasure} onChange={(e) => setItemForm((p) => ({ ...p, unitOfMeasure: e.target.value }))} placeholder="Ex.: SC, UN, M3" />
        </FormField>
        <FormField label="Tipo" required helper={editingItem ? "O tipo não pode ser alterado depois de criado." : undefined}>
          <Select value={itemForm.itemType} onChange={(e) => setItemForm((p) => ({ ...p, itemType: e.target.value }))} disabled={Boolean(editingItem)}>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Estoque mínimo" helper="Vira a política de mínimo do item. Gera um aviso quando o saldo cruzar este valor; ajuste por local depois em “Política de mínimo”.">
          <DecimalInput value={itemForm.minimumQuantity} onChange={(e) => setItemForm((p) => ({ ...p, minimumQuantity: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        size="lg"
        open={Boolean(policyItem)}
        onClose={() => setPolicyItem(null)}
        title={policyItem ? `Política de estoque mínimo — ${policyItem.name}` : "Política de estoque mínimo"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPolicyItem(null)}>Cancelar</Button>
            <Button onClick={handleSavePolicy} loading={savingPolicy} disabled={policyLoading || !policyValid}>Publicar nova versão</Button>
          </>
        }
      >
        <p style={{ marginBottom: "var(--space-4)", color: "var(--color-ink-muted)", fontSize: "var(--text-body-sm)" }}>
          Política de estoque mínimo deste item.{" "}
          {policyInfo
            ? policyInfo.source === "ITEM"
              ? "Este item tem política própria vigente — salvar publica uma nova versão (a anterior é preservada no histórico)."
              : "Este item ainda usa a política padrão da empresa (sem mínimo) — salvar cria a política própria do item."
            : null}
        </p>
        <FormField label="Estoque mínimo padrão" helper="Vale para todos os locais sem valor próprio abaixo. Vazio = sem aviso de estoque baixo.">
          <DecimalInput value={policyForm.minimumQuantity} onChange={(e) => setPolicyForm((p) => ({ ...p, minimumQuantity: e.target.value }))} />
        </FormField>
        <FormField label="Quantidade de reposição" helper="Opcional — quanto repor quando o saldo cruzar o mínimo (entra no aviso de estoque baixo).">
          <DecimalInput value={policyForm.reorderQuantity} onChange={(e) => setPolicyForm((p) => ({ ...p, reorderQuantity: e.target.value }))} />
        </FormField>
        {locations.length > 0 ? (
          <>
            <p style={{ margin: "var(--space-4) 0 var(--space-2)", fontWeight: 600 }}>Mínimo por local (opcional)</p>
            {locations.map((loc) => (
              <FormField key={loc.id} label={`${loc.name} (${LOCATION_TYPE_LABELS[loc.locationType] || loc.locationType})`} helper="Vazio = usa o mínimo padrão do item.">
                <DecimalInput
                  value={policyForm.byLocation[loc.id] || ""}
                  onChange={(e) => setPolicyForm((p) => ({ ...p, byLocation: { ...p.byLocation, [loc.id]: e.target.value } }))}
                />
              </FormField>
            ))}
          </>
        ) : null}
      </Modal>

      <Modal
        open={locationModalOpen}
        onClose={() => { setLocationModalOpen(false); setEditingLocation(null); }}
        title={editingLocation ? `Editar local — ${editingLocation.name}` : "Novo local"}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setLocationModalOpen(false); setEditingLocation(null); }}>Cancelar</Button>
            <Button onClick={handleCreateLocation} loading={savingLocation} disabled={!isLocationValid}>{editingLocation ? "Salvar" : "Criar"}</Button>
          </>
        }
      >
        <FormField label="Nome" required>
          <Input value={locationForm.name} onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Almoxarifado Central" />
        </FormField>
        <FormField label="Tipo" required helper={editingLocation ? "O tipo não pode ser alterado depois de criado." : undefined}>
          <Select
            value={locationForm.locationType}
            onChange={(e) => setLocationForm((p) => ({ ...p, locationType: e.target.value, projectId: e.target.value === "PROJECT_SITE" ? p.projectId : "" }))}
            disabled={Boolean(editingLocation)}
          >
            {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        {locationNeedsProject ? (
          // BUG REAL CORRIGIDO (auditoria Nayara, Marco 7, F2): um canteiro de obra sem obra
          // vinculada ficava impossível de movimentar depois (API exige a obra do local, nunca do
          // movimento — um canteiro pertence a UMA obra fixa). Campo obrigatório só quando o tipo
          // é "Canteiro de obra".
          <FormField label="Obra" required helper="Um canteiro de obra precisa estar vinculado a uma obra — isso é o que permite transferir estoque pra ele.">
            <Select value={locationForm.projectId} onChange={(e) => setLocationForm((p) => ({ ...p, projectId: e.target.value }))}>
              <option value="">Selecione a obra...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </FormField>
        ) : null}
      </Modal>
    </AppShell>
  );
}
