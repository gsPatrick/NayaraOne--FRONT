"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import { listIntegrationErrors, resolveIntegrationError } from "@/lib/api/correspondent";
import { formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const PROVIDER_LABELS = { sandbox: "Sandbox (simulação)", manual: "Manual (sem banco real integrado)" };

export default function ErrosIntegracaoPage() {
  const [filter, setFilter] = useState("OPEN");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load(status = filter) {
    setLoading(true);
    setLoadError("");
    listIntegrationErrors(status || undefined)
      .then((data) => setRows(data || []))
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os erros de integração."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(filter); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolve() {
    setSaving(true);
    setError("");
    try {
      await resolveIntegrationError(target.id, { note: note.trim() });
      setMessage("Erro marcado como resolvido, com a sua observação na auditoria.");
      setTarget(null);
      setNote("");
      load();
    } catch (err) {
      setError(err?.message || "Não foi possível dar baixa neste erro.");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "createdAt", label: "Quando", render: (row) => formatDateTime(row.createdAt || row.created_at) },
    { key: "providerCode", label: "Provider", render: (row) => PROVIDER_LABELS[row.providerCode] || row.providerCode },
    { key: "operationLabel", label: "Operação" },
    { key: "message", label: "O que aconteceu" },
    { key: "financingCaseId", label: "Caso", render: (row) => (row.financingCaseId ? <Button variant="secondary" size="sm" href={`/painel/correspondente/${row.financingCaseId}`}>Abrir caso</Button> : "Sem caso vinculado") },
    { key: "status", label: "Situação", render: (row) => <Badge tone={row.status === "OPEN" ? "danger" : "success"}>{row.status === "OPEN" ? "Em aberto" : "Resolvido"}</Badge> },
    { key: "resolutionNote", label: "Resolução", render: (row) => (row.status === "RESOLVED" ? `${row.resolutionNote} (${formatDateTime(row.resolvedAt)})` : "Ainda não resolvido") },
    { key: "actions", label: "", render: (row) => (row.status === "OPEN" ? <Button variant="secondary" size="sm" onClick={() => { setTarget(row); setNote(""); setError(""); }}>Dar baixa</Button> : null) },
  ];

  return (
    <AppShell title="Erros de integração" backHref="/painel/correspondente">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Card title="Falhas na conversa com bancos e financeiras" subtitle="Cada falha mostra só a mensagem de negócio. O corpo da resposta do provider e os segredos nunca são guardados.">
          <div style={{ maxWidth: 260, marginBottom: 12 }}>
            <FormField label="Mostrar" htmlFor="err-filter">
              <Select id="err-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="OPEN">Em aberto</option>
                <option value="RESOLVED">Resolvidos</option>
                <option value="">Todos</option>
              </Select>
            </FormField>
          </div>
          <Table columns={columns} rows={rows} loading={loading} minWidth="1100px" emptyMessage={filter === "OPEN" ? "Nenhum erro de integração em aberto." : "Nenhum erro de integração registrado."} />
        </Card>
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => !saving && setTarget(null)}
        title="Dar baixa no erro"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={saving}>Voltar</Button>
            <Button onClick={handleResolve} loading={saving} disabled={note.trim().length < 3}>Marcar como resolvido</Button>
          </>
        }
      >
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormField label="O que foi feito" htmlFor="err-note" required helper="Ex.: provider voltou, caso reenviado. Fica na auditoria.">
          <Input id="err-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
