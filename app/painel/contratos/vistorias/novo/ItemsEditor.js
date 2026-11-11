"use client";

import { useState } from "react";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Icon from "@/components/atoms/Icon/Icon";
import Badge from "@/components/atoms/Badge/Badge";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { CONDITIONS, CONDITION_LABELS, CONDITION_TONE } from "@/lib/labels/juridico";
import { RESPONSIBLE_PARTY_LABELS } from "@/lib/mock/legal";
import { structuredItem } from "@/lib/legal/inspectionCodes";
import { toNumber, formatBRL } from "@/lib/format";
import styles from "./page.module.css";

const EMPTY_ITEM = { room: "", item: "", description: "", condition: "GOOD", notes: "", damageDescription: "", responsibleParty: "", estimatedBudget: "" };

// Itens estruturados por ambiente (Caderno §11): Ambiente + Item viram itemName "Ambiente — Item" e os códigos
// roomCode/itemCode que a API usa para parear a entrada com a saída.
export default function ItemsEditor({ items, onChange }) {
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [error, setError] = useState("");
  const set = (field) => (e) => setNewItem((prev) => ({ ...prev, [field]: e.target.value }));

  function addItem() {
    setError("");
    if (!newItem.room.trim() || !newItem.item.trim()) {
      setError("Informe o ambiente (ex.: Sala) e o item (ex.: Piso).");
      return;
    }
    if (newItem.condition === "DAMAGED") {
      if (!newItem.damageDescription.trim()) {
        setError("Descreva o dano: a descrição do dano é obrigatória para itens danificados.");
        return;
      }
      const budget = toNumber(newItem.estimatedBudget);
      if (newItem.estimatedBudget === "" || Number.isNaN(budget) || !Number.isFinite(budget) || budget < 0) {
        setError("Informe o orçamento estimado (zero ou mais) para itens danificados.");
        return;
      }
      if (!newItem.responsibleParty) {
        setError("Selecione o responsável pelo dano para itens danificados.");
        return;
      }
    }
    const codes = structuredItem(newItem.room, newItem.item);
    if (items.some((i) => i.roomCode === codes.roomCode && i.itemCode === codes.itemCode)) {
      setError("Este item já foi adicionado neste ambiente.");
      return;
    }
    onChange([...items, { id: `tmp-${Date.now()}`, ...newItem, ...codes }]);
    setNewItem((prev) => ({ ...EMPTY_ITEM, room: prev.room }));
  }

  return (
    <Card title="Itens da vistoria" subtitle="Cada ambiente tem seus itens. Para comparar entrada e saída, use os mesmos nomes de ambiente e item nas duas vistorias.">
      <div className={styles.itemsList}>
        {items.length === 0 ? (
          <p className={styles.emptyText}>Nenhum item adicionado ainda.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.itemRow} data-testid="inspection-item-row">
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.room} — {item.item}</span>
                {item.description ? <span className={styles.itemNotes}>{item.description}</span> : null}
                {item.notes ? <span className={styles.itemNotes}>Observação: {item.notes}</span> : null}
                {item.condition === "DAMAGED" ? (
                  <span className={styles.itemNotes}>
                    Dano: {item.damageDescription}
                    {item.responsibleParty ? ` — Responsável: ${RESPONSIBLE_PARTY_LABELS[item.responsibleParty] || "a apurar"}` : ""}
                    {item.estimatedBudget !== "" ? ` — Orçamento: ${formatBRL(toNumber(item.estimatedBudget))}` : ""}
                  </span>
                ) : null}
              </div>
              <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
              <button type="button" className={styles.removeBtn} onClick={() => onChange(items.filter((i) => i.id !== item.id))} aria-label="Remover item">
                <Icon name="trash" size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className={styles.addItemRow}>
        <FormField label="Ambiente" htmlFor="f-item-room" helper="Ex.: Sala, Quarto 1, Cozinha">
          <Input id="f-item-room" value={newItem.room} onChange={set("room")} placeholder="Ex: Sala" />
        </FormField>
        <FormField label="Item" htmlFor="f-item-name" helper="Ex.: Piso, Pintura, Janela">
          <Input id="f-item-name" value={newItem.item} onChange={set("item")} placeholder="Ex: Piso" />
        </FormField>
        <FormField label="Estado" htmlFor="f-item-condition">
          <Select id="f-item-condition" value={newItem.condition} onChange={set("condition")}>
            {CONDITIONS.map((k) => (
              <option key={k} value={k}>{CONDITION_LABELS[k]}</option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className={styles.addItemRow}>
        <FormField label="Descrição" htmlFor="f-item-description" helper="Como o item está (opcional)">
          <Input id="f-item-description" value={newItem.description} onChange={set("description")} placeholder="Ex: Porcelanato bege, sem trincas" />
        </FormField>
        <FormField label="Observações" htmlFor="f-item-notes" helper="Opcional">
          <Input id="f-item-notes" value={newItem.notes} onChange={set("notes")} placeholder="Ex: Sem marcas ou manchas" />
        </FormField>
      </div>

      {newItem.condition === "DAMAGED" ? (
        <div className={styles.addItemRow}>
          <FormField label="Descrição do dano" htmlFor="f-item-damage" required helper="Obrigatório para itens danificados">
            <Input id="f-item-damage" value={newItem.damageDescription} onChange={set("damageDescription")} placeholder="Ex: Vidro trincado na janela da sala" />
          </FormField>
          <FormField label="Responsável pelo dano" htmlFor="f-item-responsible">
            <Select id="f-item-responsible" value={newItem.responsibleParty} onChange={set("responsibleParty")}>
              <option value="">Selecione</option>
              {Object.entries(RESPONSIBLE_PARTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Orçamento estimado (R$)" htmlFor="f-item-budget">
            <DecimalInput id="f-item-budget" value={newItem.estimatedBudget} onChange={set("estimatedBudget")} placeholder="Ex.: 350,00" />
          </FormField>
        </div>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className={styles.addItemRow}>
        <Button variant="secondary" onClick={addItem}>
          <Icon name="plus" size={16} /> Adicionar item
        </Button>
      </div>
    </Card>
  );
}
