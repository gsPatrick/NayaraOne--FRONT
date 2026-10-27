"use client";

import { useEffect, useRef, useState } from "react";
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
import { hasPermission } from "@/lib/rbac/permissions";
import { providerLabel } from "../_labels";
import styles from "./page.module.css";

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
  const [canResolve, setCanResolve] = useState(false);
  const pedido = useRef(0);
  useEffect(() => { setCanResolve(hasPermission("correspondent:create")); }, []);

  // Troca rápida de filtro: só a resposta do pedido mais recente vale (a antiga não sobrescreve a tela).
  function load(status = filter) {
    pedido.current += 1;
    const meu = pedido.current;
    setLoading(true);
    setLoadError("");
    listIntegrationErrors(status || undefined)
      .then((data) => { if (meu === pedido.current) setRows(data || []); })
      .catch((err) => { if (meu === pedido.current) setLoadError(err?.message || "Não foi possível carregar os erros de integração."); })
      .finally(() => { if (meu === pedido.current) setLoading(false); });
  }

  useEffect(() => { load(filter); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolve() {
    if (saving || note.trim().length < 3) return;
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
    { key: "providerCode", label: "Provider", render: (row) => providerLabel(row.providerCode) },
    { key: "operationLabel", label: "Operação", render: (row) => row.operationLabel || "Operação não identificada" },
    { key: "message", label: "O que aconteceu", render: (row) => row.message || "O provider não informou detalhes." },
    { key: "financingCaseId", label: "Caso", render: (row) => (row.financingCaseId ? <Button variant="secondary" size="sm" href={`/painel/correspondente/${row.financingCaseId}`}>Abrir caso</Button> : "Sem caso vinculado") },
    { key: "status", label: "Situação", render: (row) => <Badge tone={row.status === "OPEN" ? "danger" : "success"}>{row.status === "OPEN" ? "Em aberto" : "Resolvido"}</Badge> },
    { key: "resolutionNote", label: "Resolução", render: (row) => (row.status === "RESOLVED" ? <span style={{ display: "inline-block", maxWidth: 320, overflowWrap: "anywhere", whiteSpace: "normal" }}>{`${row.resolutionNote || "Sem observação registrada"} (${formatDateTime(row.resolvedAt)})`}</span> : "Ainda não resolvido") },
    { key: "actions", label: "", render: (row) => (row.status === "OPEN" && canResolve ? <Button variant="secondary" size="sm" onClick={() => { setTarget(row); setNote(""); setError(""); setMessage(""); }}>Dar baixa</Button> : null) },
  ];

  return (
    <AppShell title="Erros de integração" backHref="/painel/correspondente">
      <div className={styles.wrap}>
        {loadError ? (
          <>
            <Alert tone="danger">{loadError}</Alert>
            <div><Button variant="secondary" onClick={() => load(filter)}>Tentar de novo</Button></div>
          </>
        ) : null}
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
          {!loading && filter !== "RESOLVED" && rows.some((r) => r.status === "OPEN") ? <p className={styles.helper} style={{ marginBottom: 8 }}>{rows.filter((r) => r.status === "OPEN").length} erro(s) em aberto.</p> : null}
          <Table columns={columns} rows={rows} loading={loading} minWidth="1100px" emptyMessage={filter === "OPEN" ? "Nenhum erro de integração em aberto." : "Nenhum erro de integração registrado."} />
        </Card>
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => { if (!saving) { setTarget(null); setError(""); } }}
        title="Dar baixa no erro"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setTarget(null); setError(""); }} disabled={saving}>Voltar</Button>
            <Button onClick={handleResolve} loading={saving} disabled={note.trim().length < 3}>Marcar como resolvido</Button>
          </>
        }
      >
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <FormField label="O que foi feito" htmlFor="err-note" required helper="Ex.: provider voltou, caso reenviado. Fica na auditoria.">
          <Input id="err-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleResolve(); } }} />
        </FormField>
      </Modal>
    </AppShell>
  );
}
