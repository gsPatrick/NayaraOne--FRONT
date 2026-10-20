"use client";

// GAP REAL CORRIGIDO (ciclo de verificação adicional 5, Marco 4, 12/10/2026): os services
// costCenters.service.js e resultCenters.service.js têm CRUD completo (create/list/update/
// delete) desde sempre, com rota HTTP própria para cada ação, mas nenhuma tela chamava
// createCostCenter/updateCostCenter/deleteCostCenter nem os equivalentes de resultado — a
// única forma de um centro de custo/resultado existir era o "default" auto-criado por
// getOrCreateDefaultCostCenter/getOrCreateDefaultResultCenter. Um usuário não conseguia nomear
// um centro de custo próprio (ex: "Manutenção — Prédio A") nem editar/remover um existente.

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import FinanceNavMenu from "@/components/molecules/FinanceNavMenu/FinanceNavMenu";
import {
  listCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  listResultCenters,
  createResultCenter,
  updateResultCenter,
  deleteResultCenter,
} from "@/lib/api/finance";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import styles from "./page.module.css";

function CenterPanel({ title, kind, items, onCreate, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  function openCreate() {
    setEditing(null);
    setForm({ code: "", name: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ code: item.code, name: item.name });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.code || !form.name) return;
    setSubmitting(true);
    setError("");
    try {
      if (editing) {
        await onUpdate(editing.id, { code: form.code.trim(), name: form.name.trim() });
      } else {
        await onCreate({ code: form.code.trim(), name: form.name.trim() });
      }
      setShowForm(false);
    } catch (err) {
      setError(err?.message || `Não foi possível salvar o ${kind}.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    const ok = await confirm({
      title: `Remover ${item.code} — ${item.name}?`,
      message: "Lançamentos que já usam este centro continuam intactos; ele só deixa de aparecer para novos lançamentos.",
      confirmLabel: "Remover",
    });
    if (!ok) return;
    try {
      await onDelete(item.id);
    } catch (err) {
      setError(err?.message || `Não foi possível remover o ${kind}.`);
    }
  }

  const canChange = useHasPermission("finance:update");

  return (
    <Card title={title} actions={<Button requires="finance:create" onClick={openCreate}><Icon name="plus" /> Novo</Button>}>
      {error && <Alert tone="danger">{error}</Alert>}
      {items.length === 0 ? (
        <p className={styles.empty}>Nenhum {kind} cadastrado ainda.</p>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={styles.row}>
              <span className={styles.code}>{item.code}</span>
              <span className={styles.name}>{item.name}</span>
              {canChange ? (
                <>
                  <button type="button" className={styles.linkBtn} onClick={() => openEdit(item)}>Editar</button>
                  <button type="button" className={styles.linkBtn} onClick={() => handleDelete(item)}>Remover</button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? `Editar ${kind}` : `Novo ${kind}`}>
        <div className={styles.form}>
          <FormField label="Código">
            <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="Ex: CC-001" />
          </FormField>
          <FormField label="Nome">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Manutenção — Prédio A" />
          </FormField>
          <Button onClick={handleSubmit} disabled={submitting || !form.code || !form.name}>
            {submitting ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </div>
      </Modal>
      <ConfirmDialog />
    </Card>
  );
}

export default function CentrosPage() {
  const [costCenters, setCostCenters] = useState([]);
  const [resultCenters, setResultCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listCostCenters(), listResultCenters()])
      .then(([cc, rc]) => {
        setCostCenters(cc || []);
        setResultCenters(rc || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os centros."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell title="Centros de custo e resultado" subtitle="Financeiro">
      <FinanceNavMenu />
      {loading ? (
        <SkeletonDetail sections={2} />
      ) : loadError ? (
        <Alert tone="danger">{loadError}</Alert>
      ) : (
        <div className={styles.grid}>
          <CenterPanel
            title="Centros de custo"
            kind="centro de custo"
            items={costCenters}
            onCreate={async (payload) => { await createCostCenter(payload); load(); }}
            onUpdate={async (id, payload) => { await updateCostCenter(id, payload); load(); }}
            onDelete={async (id) => { await deleteCostCenter(id); load(); }}
          />
          <CenterPanel
            title="Centros de resultado"
            kind="centro de resultado"
            items={resultCenters}
            onCreate={async (payload) => { await createResultCenter(payload); load(); }}
            onUpdate={async (id, payload) => { await updateResultCenter(id, payload); load(); }}
            onDelete={async (id) => { await deleteResultCenter(id); load(); }}
          />
        </div>
      )}
    </AppShell>
  );
}
