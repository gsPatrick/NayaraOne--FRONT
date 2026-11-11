"use client";

import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import styles from "./UnitEditPanel.module.css";

// Alterar e inativar/reativar a unidade (matriz M3-05 "Empresas e unidades com criação, alteração, inativação e permissões").
// A API grava cada mudança no audit_log com antes e depois e exige units:update; sem a permissão o painel nem aparece.
export default function UnitEditPanel({ unit, onSaved }) {
  const [form, setForm] = useState({ name: unit.name || "", code: unit.code || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!hasPermission("units:update")) return null;

  async function patch(body) {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/units/${unit.id}`, { method: "PATCH", body });
      onSaved?.();
    } catch (e) {
      setError(e?.message || "Não foi possível alterar a unidade.");
    } finally {
      setBusy(false);
    }
  }

  const inactive = unit.status === "INACTIVE";
  return (
    <div className={styles.panel}>
      <FormField label="Nome da unidade" htmlFor={`unit-name-${unit.id}`} required>
        <Input id={`unit-name-${unit.id}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Código" htmlFor={`unit-code-${unit.id}`}>
        <Input id={`unit-code-${unit.id}`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      </FormField>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.actions}>
        <Button size="sm" loading={busy} disabled={!form.name.trim()} onClick={() => patch({ name: form.name.trim(), code: form.code.trim() || null })}>Salvar unidade</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ status: inactive ? "ACTIVE" : "INACTIVE" })}>
          {inactive ? "Reativar unidade" : "Inativar unidade"}
        </Button>
      </div>
    </div>
  );
}
