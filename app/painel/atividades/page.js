"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listAuditLog } from "@/lib/api/audit";
import { apiFetch } from "@/lib/api/client";
import { entityTypeLabel, actionVerb, ACTION_TONE, ACTION_ICON, ENTITY_TYPE_LABELS } from "@/lib/audit/labels";
import { summarizeChanges } from "@/lib/audit/humanize";
import { hasPermission } from "@/lib/rbac/permissions";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

// Entidades cuja reversão já existe como rota própria e segura no domínio dono do registro —
// "cancelar" na tela de Atividades é só um atalho pra essas rotas, nunca uma reescrita
// genérica do before_json (isso contornaria os gates de máquina de estado do Contract e a
// imutabilidade do ledger financeiro, os dois garantidos nas próprias features de domínio).
const REVERSIBLE_ENTITY_TYPES = {
  FinancialEntry: {
    label: "Estornar lançamento",
    permission: "finance:settle",
    run: (entityId, reason) => apiFetch(`/finance/entries/${entityId}/reverse`, { method: "POST", body: { reason } }),
  },
  Contract: {
    label: "Cancelar contrato",
    permission: "legal:approve",
    run: (entityId) => apiFetch(`/legal/contracts/${entityId}/transition`, { method: "POST", body: { targetStatus: "CANCELLED" } }),
  },
};

export default function AtividadesPage() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [selected, setSelected] = useState(null);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listAuditLog(), apiFetch("/users")])
      .then(([logEntries, apiUsers]) => {
        setEntries(logEntries || []);
        setUsers(apiUsers || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar as atividades."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function userOf(id) {
    return users.find((u) => u.id === id);
  }

  const entityTypes = useMemo(() => [...new Set(entries.map((e) => e.entityType))].sort(), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (entityFilter && e.entityType !== entityFilter) return false;
      if (!q) return true;
      const actorName = userOf(e.userId)?.name || "";
      const haystack = `${actorName} ${e.reason || ""} ${e.action} ${entityTypeLabel(e.entityType)}`.toLowerCase();
      return haystack.includes(q);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, [entries, query, entityFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns = [
    {
      key: "actor",
      label: "Quem executou",
      render: (row) => {
        const actor = userOf(row.userId);
        return (
          <div className={styles.actorCell}>
            <Avatar name={actor?.name || "Sistema"} size="sm" />
            <span>{actor?.name || "Sistema (automático)"}</span>
          </div>
        );
      },
    },
    {
      key: "reason",
      label: "O que executou",
      render: (row) => {
        const verb = actionVerb(row.action);
        return (
          <div className={styles.whatCell}>
            <span className={styles.whatIcon}>
              <Icon name={ACTION_ICON[verb] || "pencil"} size={14} />
            </span>
            <div className={styles.whatInfo}>
              <span className={styles.whatReason}>{row.reason || row.action}</span>
              <span className={styles.whatEntity}>{entityTypeLabel(row.entityType)}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "occurredAt",
      label: "Quando",
      width: "14%",
      render: (row) => formatDateTime(row.occurredAt),
    },
    {
      key: "actions",
      label: "",
      width: "6%",
      render: (row) => <RowActions onView={() => setSelected(row)} />,
    },
  ];

  return (
    <AppShell title="Atividades">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar as atividades">{loadError}</Alert> : null}

      <Card title="Trilha de atividades" subtitle="Quem fez o quê e quando, em todo o sistema">
        <div className={styles.toolbar}>
          <SearchInput placeholder="Buscar por pessoa, ação ou entidade..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <Select className={styles.filter} value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}>
            <option value="">Todas as entidades</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>{ENTITY_TYPE_LABELS[type] || type}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <SkeletonDetail />
        ) : filtered.length === 0 ? (
          <EmptyState icon="clock" title="Nenhuma atividade encontrada" description="Ajuste os filtros ou tente outra busca." />
        ) : (
          <>
            <Table columns={columns} rows={pageItems} emptyMessage="Nenhuma atividade encontrada." />
            <div className={styles.paginationRow}>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {selected ? (
        <ActivityDetailModal
          entry={selected}
          actor={userOf(selected.userId)}
          onClose={() => setSelected(null)}
          onBlocked={() => {
            setSelected(null);
            load();
          }}
          onReverted={() => {
            setSelected(null);
            load();
          }}
        />
      ) : null}
    </AppShell>
  );
}

function ActivityDetailModal({ entry, actor, onClose, onBlocked, onReverted }) {
  const [blocking, setBlocking] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const changes = summarizeChanges(entry.beforeJson, entry.afterJson);
  const reversible = REVERSIBLE_ENTITY_TYPES[entry.entityType];
  const canRevert = reversible && hasPermission(reversible.permission) && entry.entityId;
  const canBlockUser = hasPermission("users:update") && entry.userId && actor?.status !== "SUSPENDED";

  async function handleBlock() {
    setBlocking(true);
    setActionError("");
    try {
      await apiFetch(`/users/${entry.userId}`, { method: "PATCH", body: { status: "SUSPENDED" } });
      onBlocked();
    } catch (err) {
      setActionError(err?.message || "Não foi possível bloquear o acesso deste usuário.");
      setBlocking(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    setActionError("");
    try {
      await reversible.run(entry.entityId, `Revertido via tela de Atividades — registro ${entry.id}.`);
      onReverted();
    } catch (err) {
      setActionError(err?.message || "Não foi possível reverter esta ação.");
      setReverting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Detalhes da atividade">
      <div className={styles.detailWrap}>
        {actionError ? <Alert tone="danger" title="Não foi possível concluir a ação">{actionError}</Alert> : null}

        <div className={styles.detailRow}><dt>Quem</dt><dd>{actor?.name || "Sistema (automático)"} {actor?.email ? `— ${actor.email}` : ""}</dd></div>
        <div className={styles.detailRow}><dt>O que</dt><dd>{entry.reason || entry.action}</dd></div>
        <div className={styles.detailRow}><dt>Onde</dt><dd>{entityTypeLabel(entry.entityType)}</dd></div>
        <div className={styles.detailRow}><dt>Quando</dt><dd>{formatDateTime(entry.occurredAt)}</dd></div>

        {changes.length > 0 ? (
          <div className={styles.changesSection}>
            <p className={styles.jsonLabel}>{changes[0]?.isNew ? "Dados cadastrados" : "O que mudou"}</p>
            <ul className={styles.changesList}>
              {changes.map((c) => (
                <li key={c.label} className={styles.changeRow}>
                  <span className={styles.changeLabel}>{c.label}</span>
                  {c.isNew ? (
                    <span className={styles.changeValue}>{c.after}</span>
                  ) : (
                    <span className={styles.changeValue}>
                      <span className={styles.changeBefore}>{c.before}</span>
                      <Icon name="chevronRight" size={12} />
                      <span className={styles.changeAfter}>{c.after}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.actionsSection}>
          <p className={styles.actionsTitle}>Ações</p>

          {canBlockUser ? (
            confirmBlock ? (
              <div className={styles.confirmRow}>
                <span>Bloquear o acesso de <strong>{actor.name}</strong>?</span>
                <div className={styles.confirmButtons}>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmBlock(false)}>Cancelar</Button>
                  <Button variant="danger" size="sm" onClick={handleBlock} loading={blocking}>Confirmar bloqueio</Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmBlock(true)}>
                <Icon name="ban" size={14} /> Bloquear acesso de {actor?.name}
              </Button>
            )
          ) : null}

          {reversible ? (
            canRevert ? (
              confirmRevert ? (
                <div className={styles.confirmRow}>
                  <span>{reversible.label} vinculado a este registro?</span>
                  <div className={styles.confirmButtons}>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmRevert(false)}>Cancelar</Button>
                    <Button variant="danger" size="sm" onClick={handleRevert} loading={reverting}>Confirmar</Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setConfirmRevert(true)}>
                  <Icon name="refreshCcw" size={14} /> {reversible.label}
                </Button>
              )
            ) : (
              <p className={styles.emptyText}>Você não tem permissão para reverter este tipo de registro.</p>
            )
          ) : (
            <p className={styles.emptyText}>
              Não existe reversão automática para "{entityTypeLabel(entry.entityType)}" — correções para este tipo de registro
              precisam ser feitas diretamente na tela do módulo correspondente.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
