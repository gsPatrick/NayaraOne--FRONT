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
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import { listInventoryItems, createInventoryItem, listInventoryLocations, createInventoryLocation } from "@/lib/api/inventory";
import { formatQuantity, formatBRL } from "@/lib/format";
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
  const [locationForm, setLocationForm] = useState({ name: "", locationType: "WAREHOUSE" });
  const [savingLocation, setSavingLocation] = useState(false);

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
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (query && !it.name.toLowerCase().includes(query.toLowerCase()) && !(it.sku || "").toLowerCase().includes(query.toLowerCase())) return false;
      if (typeFilter && it.itemType !== typeFilter) return false;
      return true;
    });
  }, [items, query, typeFilter]);

  const totalAvgValue = items.reduce((s, i) => s + (Number(i.averageCost) || 0), 0);

  async function handleCreateItem() {
    if (!itemForm.name.trim()) return;
    setSavingItem(true);
    setActionError("");
    try {
      await createInventoryItem({
        name: itemForm.name,
        sku: itemForm.sku || undefined,
        unitOfMeasure: itemForm.unitOfMeasure || undefined,
        itemType: itemForm.itemType,
        minimumQuantity: itemForm.minimumQuantity ? Number(itemForm.minimumQuantity) : undefined,
      });
      setItemModalOpen(false);
      setItemForm({ name: "", sku: "", unitOfMeasure: "", itemType: "CONSUMABLE", minimumQuantity: "" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o item.");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleCreateLocation() {
    if (!locationForm.name.trim()) return;
    setSavingLocation(true);
    setActionError("");
    try {
      await createInventoryLocation(locationForm);
      setLocationModalOpen(false);
      setLocationForm({ name: "", locationType: "WAREHOUSE" });
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o local.");
    } finally {
      setSavingLocation(false);
    }
  }

  const columns = [
    { key: "name", label: "Nome", width: "22%", render: (row) => <span className={styles.nameMain}>{row.name}</span> },
    { key: "sku", label: "SKU", width: "12%", render: (row) => row.sku || "—" },
    { key: "itemType", label: "Tipo", width: "14%", render: (row) => <Badge tone={ITEM_TYPE_TONE[row.itemType]}>{ITEM_TYPE_LABELS[row.itemType]}</Badge> },
    { key: "unit", label: "Unidade", width: "10%", render: (row) => row.unitOfMeasure || "—" },
    { key: "min", label: "Estoque mínimo", width: "14%", render: (row) => (row.minimumQuantity != null ? formatQuantity(row.minimumQuantity) : "—") },
    { key: "avgCost", label: "Custo médio", width: "14%", render: (row) => (row.averageCost != null ? formatBRL(row.averageCost) : "—") },
  ];

  const locationColumns = [
    { key: "name", label: "Nome", width: "40%" },
    { key: "type", label: "Tipo", width: "30%", render: (row) => LOCATION_TYPE_LABELS[row.locationType] || row.locationType },
    { key: "status", label: "Status", width: "30%", render: (row) => <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Ativo" : "Inativo"}</Badge> },
  ];

  return (
    <AppShell title="Estoque — Itens & Locais" backHref="/painel">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar o estoque">{loadError}</Alert> : null}
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

      <div className={styles.grid}>
        <StatTile label="Itens cadastrados" value={items.length} tone="neutral" icon="building" />
        <StatTile label="Ferramentas" value={items.filter((i) => i.itemType === "TOOL").length} tone="info" icon="chart" />
        <StatTile label="Locais cadastrados" value={locations.length} tone="success" icon="check" />
        <StatTile label="Valor em custo médio" value={formatBRL(totalAvgValue)} tone="neutral" icon="money" />
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
        onClose={() => setItemModalOpen(false)}
        title="Novo item de estoque"
        footer={
          <>
            <Button variant="secondary" onClick={() => setItemModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateItem} loading={savingItem} disabled={!itemForm.name.trim()}>Criar</Button>
          </>
        }
      >
        <FormField label="Nome" required>
          <Input value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Cimento CP-II 50kg" />
        </FormField>
        <FormField label="SKU">
          <Input value={itemForm.sku} onChange={(e) => setItemForm((p) => ({ ...p, sku: e.target.value }))} />
        </FormField>
        <FormField label="Unidade de medida">
          <Input value={itemForm.unitOfMeasure} onChange={(e) => setItemForm((p) => ({ ...p, unitOfMeasure: e.target.value }))} placeholder="Ex.: SC, UN, M3" />
        </FormField>
        <FormField label="Tipo" required>
          <Select value={itemForm.itemType} onChange={(e) => setItemForm((p) => ({ ...p, itemType: e.target.value }))}>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Estoque mínimo" helper="Dispara aviso (inventory.stock.low) quando o saldo cruzar este valor.">
          <Input type="number" value={itemForm.minimumQuantity} onChange={(e) => setItemForm((p) => ({ ...p, minimumQuantity: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        title="Novo local"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLocationModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLocation} loading={savingLocation} disabled={!locationForm.name.trim()}>Criar</Button>
          </>
        }
      >
        <FormField label="Nome" required>
          <Input value={locationForm.name} onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Almoxarifado Central" />
        </FormField>
        <FormField label="Tipo" required>
          <Select value={locationForm.locationType} onChange={(e) => setLocationForm((p) => ({ ...p, locationType: e.target.value }))}>
            {Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </FormField>
      </Modal>
    </AppShell>
  );
}
