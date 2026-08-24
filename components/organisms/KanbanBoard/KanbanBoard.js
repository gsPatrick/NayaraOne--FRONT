"use client";

import { useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./KanbanBoard.module.css";

// Colunas de etapa não são fixas no schema (crm.opportunities.stage é STRING livre, sem ENUM/CHECK
// no Caderno) — o board permite arrastar cards entre etapas e a equipe criar/renomear colunas.
export default function KanbanBoard({
  columns = [],
  getItems,
  renderItem,
  emptyLabel = "Sem itens",
  onMoveItem,
  onAddColumn,
  onRenameColumn,
  onReorderColumns,
  onAddItem,
  addItemLabel = "Novo item",
}) {
  const [dragItemId, setDragItemId] = useState(null);
  const [dragColumnKey, setDragColumnKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");

  function handleDrop(columnKey) {
    setDragOverKey(null);
    if (dragColumnKey && dragColumnKey !== columnKey) {
      onReorderColumns?.(dragColumnKey, columnKey);
    } else if (dragItemId) {
      onMoveItem?.(dragItemId, columnKey);
    }
    setDragItemId(null);
    setDragColumnKey(null);
  }

  function commitRename(columnKey) {
    if (editingLabel.trim() && onRenameColumn) onRenameColumn(columnKey, editingLabel.trim());
    setEditingKey(null);
  }

  function commitAddColumn() {
    if (newColumnLabel.trim() && onAddColumn) onAddColumn(newColumnLabel.trim());
    setNewColumnLabel("");
    setAddingColumn(false);
  }

  return (
    <div className={styles.board}>
      {columns.map((column) => {
        const items = getItems(column.key);
        const isOver = dragOverKey === column.key;
        return (
          <div
            className={[
              styles.column,
              isOver ? styles.columnDragOver : "",
              dragColumnKey === column.key ? styles.columnBeingDragged : "",
            ].filter(Boolean).join(" ")}
            key={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverKey(column.key);
            }}
            onDragLeave={() => setDragOverKey((k) => (k === column.key ? null : k))}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDrop(column.key);
            }}
          >
            <div className={styles.columnHeader}>
              <span
                draggable
                className={styles.columnGrip}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", column.key);
                  setDragColumnKey(column.key);
                }}
                onDragEnd={() => {
                  setDragColumnKey(null);
                  setDragOverKey(null);
                }}
                title="Arraste para reordenar a etapa"
                aria-label="Arraste para reordenar a etapa"
              >
                <Icon name="dots" size={14} />
              </span>
              {editingKey === column.key ? (
                <input
                  className={styles.columnTitleInput}
                  value={editingLabel}
                  autoFocus
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={() => commitRename(column.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(column.key);
                    if (e.key === "Escape") setEditingKey(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={styles.columnTitle}
                  onClick={() => {
                    setEditingKey(column.key);
                    setEditingLabel(column.label);
                  }}
                  title="Clique para renomear a etapa"
                >
                  {column.label}
                </button>
              )}
              <span className={styles.columnCount}>{items.length}</span>
            </div>
            <div className={styles.columnBody}>
              {items.length === 0 ? (
                <div className={styles.columnEmpty}>{emptyLabel}</div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    className={styles.dragHandle}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", item.id);
                      setDragItemId(item.id);
                    }}
                    onDragEnd={() => {
                      setDragItemId(null);
                      setDragOverKey(null);
                    }}
                  >
                    <Icon name="dots" size={14} className={styles.dragGrip} />
                    {renderItem(item, column)}
                  </div>
                ))
              )}
            </div>
            {onAddItem ? (
              <button type="button" className={styles.columnAddItemBtn} onClick={() => onAddItem(column.key)}>
                <Icon name="plus" size={14} /> {addItemLabel}
              </button>
            ) : null}
          </div>
        );
      })}

      <div className={styles.addColumn}>
        {addingColumn ? (
          <input
            className={styles.addColumnInput}
            placeholder="Nome da nova etapa..."
            value={newColumnLabel}
            autoFocus
            onChange={(e) => setNewColumnLabel(e.target.value)}
            onBlur={commitAddColumn}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitAddColumn();
              if (e.key === "Escape") setAddingColumn(false);
            }}
          />
        ) : (
          <button type="button" className={styles.addColumnBtn} onClick={() => setAddingColumn(true)}>
            <Icon name="plus" size={16} /> Nova etapa
          </button>
        )}
      </div>
    </div>
  );
}
