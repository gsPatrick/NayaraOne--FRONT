"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import Table from "@/components/organisms/Table/Table";
import Modal from "@/components/organisms/Modal/Modal";
import Pagination from "@/components/molecules/Pagination/Pagination";
import FabLink from "@/components/molecules/FabLink/FabLink";
import RowActions from "@/components/molecules/RowActions/RowActions";
import {
  ROLE_TONE,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  CONTACT_TYPE_ICON,
} from "@/lib/mock/people";
import { listPeople, listDuplicatePairs, deletePerson, mergePeople } from "@/lib/api/people";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const PAGE_SIZE = 8;

const ROLE_TABS = [
  { key: "todos", label: "Todos" },
  { key: "CLIENTE", label: "Clientes" },
  { key: "PROPRIETARIO", label: "Proprietários" },
  { key: "LOCATARIO", label: "Locatários" },
  { key: "FORNECEDOR", label: "Fornecedores" },
];

const KIND_OPTIONS = [
  { key: "todos", label: "Todos" },
  { key: "PF", label: "PF" },
  { key: "PJ", label: "PJ" },
];

export default function PessoasPage() {
  const router = useRouter();
  const [nameQuery, setNameQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("todos");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState([]);
  const [duplicatePairs, setDuplicatePairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reviewPair, setReviewPair] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listPeople(), listDuplicatePairs()])
      .then(([apiPeople, pairs]) => {
        if (cancelled) return;
        setPeople(apiPeople);
        setDuplicatePairs(pairs);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os contatos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      await deletePerson(deleteTarget.id);
      setPeople((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir o contato.");
    } finally {
      setDeleting(false);
    }
  }

  const duplicateIds = useMemo(() => new Set(duplicatePairs.flat()), [duplicatePairs]);

  const roleCounts = useMemo(() => {
    const counts = {};
    ROLE_TABS.forEach((tab) => {
      counts[tab.key] = tab.key === "todos" ? people.length : people.filter((p) => p.roles.includes(tab.key)).length;
    });
    return counts;
  }, [people]);

  function findDuplicatePartner(personId) {
    const pair = duplicatePairs.find((p) => p.includes(personId));
    if (!pair) return null;
    const partnerId = pair.find((id) => id !== personId);
    return people.find((p) => p.id === partnerId) || null;
  }

  const filtered = useMemo(() => {
    const name = nameQuery.trim().toLowerCase();
    const doc = docQuery.trim().toLowerCase();
    return people.filter((p) => {
      const matchesName =
        name.length === 0 ||
        p.legalName.toLowerCase().includes(name) ||
        (p.preferredName || "").toLowerCase().includes(name);
      const matchesDoc = doc.length === 0 || (p.taxIdNormalized || "").toLowerCase().includes(doc);
      const matchesKind = kindFilter === "todos" || p.personType === kindFilter;
      const matchesRole = roleFilter === "todos" || p.roles.includes(roleFilter);
      return matchesName && matchesDoc && matchesKind && matchesRole;
    });
  }, [people, nameQuery, docQuery, kindFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleMerge(canonicalId, absorbedId) {
    setActionError("");
    try {
      // POST /people/:canonicalId/merge — a API remapeia todas as referências do absorvido
      // (papéis, contatos, documentos, oportunidades, visitas, contratos...) e o marca como
      // MERGED; o par deixa de aparecer em /people/duplicates depois disso.
      await mergePeople(canonicalId, absorbedId);
      setPeople((prev) => prev.map((p) => (p.id === absorbedId ? { ...p, status: "MERGED", mergedInto: canonicalId } : p)));
      setDuplicatePairs((prev) => prev.filter((pair) => !pair.includes(absorbedId)));
      setReviewPair(null);
      router.push(`/painel/pessoas/${canonicalId}`);
    } catch (err) {
      setActionError(err?.message || "Não foi possível mesclar os cadastros.");
      setReviewPair(null);
    }
  }

  const columns = [
    {
      key: "legalName",
      label: "Nome",
      render: (row) => (
        <div
          role="button"
          tabIndex={0}
          className={styles.rowButton}
          onClick={() => router.push(`/painel/pessoas/${row.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/painel/pessoas/${row.id}`);
            }
          }}
        >
          <div className={styles.nameCellRow}>
          <Avatar name={row.legalName} src={row.photoUrl} size="sm" />
          <div className={styles.nameCell}>
            <span className={styles.nameMain}>
              {row.legalName}
              {row.preferredName ? <span className={styles.nameAka}> ({row.preferredName})</span> : null}
            </span>
            <span className={styles.nameSub}>{row.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"}</span>
          </div>
          </div>
        </div>
      ),
    },
    { key: "taxIdNormalized", label: "Documento" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className={styles.statusCell}>
          <Badge tone={STATUS_TONE[row.status] || "neutral"}>{STATUS_LABELS[row.status] || row.status}</Badge>
          {duplicateIds.has(row.id) && row.status !== "MERGED" ? (
            <div className={styles.duplicateFlag}>
              <Badge tone="warning">Possível duplicata</Badge>
              <button
                type="button"
                className={styles.reviewBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setReviewPair({ person: row, partner: findDuplicatePartner(row.id) });
                }}
              >
                Revisar
              </button>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "roles",
      label: "Papéis",
      render: (row) => {
        const visibleRoles = row.roles.slice(0, 3);
        const extraCount = row.roles.length - visibleRoles.length;
        return (
          <div className={styles.roleTags}>
            {visibleRoles.map((role) => (
              <Badge key={role} tone={ROLE_TONE[role] || "neutral"}>{ROLE_LABELS[role] || role}</Badge>
            ))}
            {extraCount > 0 ? (
              <Badge tone="neutral" title={row.roles.slice(3).map((r) => ROLE_LABELS[r] || r).join(", ")}>
                +{extraCount}
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "contact",
      label: "Contato principal",
      render: (row) => (
        <div className={styles.contactCell}>
          {row.contacts.filter((c) => c.primary).map((c) => (
            <span key={c.id || `${c.type}-${c.value}`} className={styles.contactRow}>
              <Icon name={CONTACT_TYPE_ICON[c.type] || "phone"} size={12} />
              {c.value}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Cadastro",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <RowActions
          onView={() => router.push(`/painel/pessoas/${row.id}`)}
          onEdit={() => router.push(`/painel/pessoas/${row.id}`)}
          onDelete={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <AppShell title="Contatos">
      <div className={styles.roleTabs} role="tablist">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={roleFilter === tab.key}
            className={[styles.roleTab, roleFilter === tab.key ? styles.roleTabActive : ""].filter(Boolean).join(" ")}
            onClick={() => { setRoleFilter(tab.key); setPage(1); }}
          >
            {tab.label}
            <span className={styles.roleTabCount}>{roleCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <SearchInput
          placeholder="Buscar por nome..."
          value={nameQuery}
          onChange={(e) => { setNameQuery(e.target.value); setPage(1); }}
        />
        <SearchInput
          placeholder="Buscar por documento..."
          value={docQuery}
          onChange={(e) => { setDocQuery(e.target.value); setPage(1); }}
        />
        <div className={styles.kindSwitch} role="tablist" aria-label="Filtrar por tipo de pessoa">
          {KIND_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={kindFilter === opt.key}
              className={[styles.kindOption, kindFilter === opt.key ? styles.kindOptionActive : ""].filter(Boolean).join(" ")}
              onClick={() => { setKindFilter(opt.key); setPage(1); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button href="/painel/pessoas/novo" className={styles.createBtn}>
          <Icon name="plus" size={16} /> Novo contato
        </Button>
      </div>

      {loadError ? (
        <Alert tone="danger" title="Não foi possível carregar os contatos">{loadError}</Alert>
      ) : null}

      {actionError ? (
        <Alert tone="danger" title="Ação não concluída">{actionError}</Alert>
      ) : null}

      <Table columns={columns} rows={loading ? [] : pageItems} loading={loading} emptyMessage="Nenhum contato encontrado." />

      <div className={styles.paginationRow}>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>

      <FabLink href="/painel/pessoas/novo" label="Novo contato" />

      <DuplicateReviewModal
        pair={reviewPair}
        onClose={() => setReviewPair(null)}
        onMerge={handleMerge}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir contato"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir <strong>{deleteTarget?.legalName}</strong>? Esta ação não pode ser desfeita.</p>
      </Modal>
    </AppShell>
  );
}

function DuplicateReviewModal({ pair, onClose, onMerge }) {
  const [canonicalId, setCanonicalId] = useState(null);

  if (!pair || !pair.partner) return null;
  const { person, partner } = pair;
  const options = [person, partner];
  const selectedId = canonicalId || person.id;

  return (
    <Modal
      open={Boolean(pair)}
      onClose={onClose}
      title="Revisar possível duplicata"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              const absorbedId = options.find((p) => p.id !== selectedId).id;
              onMerge(selectedId, absorbedId);
            }}
          >
            Mesclar cadastros
          </Button>
        </>
      }
    >
      <p className={styles.compareHint}>
        Os cadastros abaixo compartilham nome e telefone. Confirme se representam a mesma pessoa e
        escolha qual deve permanecer como cadastro canônico — o outro será marcado como mesclado e
        todas as suas referências (papéis, contatos, documentos, oportunidades, visitas etc.) serão
        remapeadas para o canônico.
      </p>
      <div className={styles.compareGrid}>
        {options.map((p) => {
          const isSelected = p.id === selectedId;
          return (
            <button
              type="button"
              key={p.id}
              className={[styles.compareCard, isSelected ? styles.compareCardSelected : ""].filter(Boolean).join(" ")}
              onClick={() => setCanonicalId(p.id)}
            >
              <span className={styles.compareCardHeader}>
                {isSelected ? (
                  <Badge tone="brand">Manter como canônico</Badge>
                ) : (
                  <span className={styles.compareCardPick}>Escolher este</span>
                )}
              </span>
              <p className={styles.compareName}>{p.legalName}</p>
              <p className={styles.compareMeta}>{p.taxIdNormalized}</p>
              <p className={styles.compareMeta}>Cadastrado em {formatDate(p.createdAt)}</p>
              <p className={styles.compareMeta}>{p.contacts.find((c) => c.primary)?.value || "—"}</p>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
