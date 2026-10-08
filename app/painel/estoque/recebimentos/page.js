"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import Icon from "@/components/atoms/Icon/Icon";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import RowActions from "@/components/molecules/RowActions/RowActions";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import { listReceipts, createReceipt, reviewReceipt, confirmReceipt, suggestReceiptFromInvoice } from "@/lib/api/inventory";
import { listInventoryItems, listInventoryLocations } from "@/lib/api/inventory";
import { formatDateTime, toNumber } from "@/lib/format";
import styles from "../../obras/lista/page.module.css";

const STATUS_LABELS = { DRAFT: "Rascunho", REVIEWED: "Revisado", COMPLETED: "Confirmado" };
const STATUS_TONE = { DRAFT: "neutral", REVIEWED: "info", COMPLETED: "success" };

// OCR/IA de NF (Guia §6): "OCR/IA pode sugerir itens/quantidades/preços. Usuário confere antes
// de confirmar entrada." A sugestão só PRÉ-PREENCHE o formulário (editável) — nunca cria o
// recebimento sozinha, e o painel só aparece quando o adapter de fato devolveu uma sugestão.
const OCR_STATUS_LABELS = { SUGGESTED: "Sugestão gerada", LOW_CONFIDENCE: "Confiança baixa", NOT_CONFIGURED: "OCR não configurado", ILLEGIBLE: "Nota ilegível" };
const OCR_STATUS_TONE = { SUGGESTED: "success", LOW_CONFIDENCE: "warning", NOT_CONFIGURED: "neutral", ILLEGIBLE: "warning" };
const EMPTY_FORM = { destinationLocationId: "", invoiceNumber: "", invoiceFingerprint: "", invoiceFileId: "", lines: [{ inventoryItemId: "", quantity: "", unitCost: "" }] };
const EMPTY_OCR = { uploading: false, fileName: "", result: null, error: "", applied: false };

function toBrDecimalString(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return String(value).replace(".", ",");
}

export default function RecebimentosPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ocr, setOcr] = useState(EMPTY_OCR);
  // Só a resposta do envio mais recente vale: remover/fechar/trocar de NF durante o upload
  // invalida respostas antigas (evita anexar a NF errada ao recebimento).
  const ocrRequestRef = useRef(0);

  function load() {
    setLoading(true);
    setLoadError("");
    Promise.all([listReceipts(), listInventoryItems(), listInventoryLocations()])
      .then(([r, i, l]) => {
        setReceipts(r || []);
        setItems(i || []);
        setLocations(l || []);
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar os recebimentos."))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function updateLine(idx, field, value) {
    setForm((p) => {
      const lines = [...p.lines];
      lines[idx] = { ...lines[idx], [field]: value };
      return { ...p, lines };
    });
  }
  function addLine() {
    setForm((p) => ({ ...p, lines: [...p.lines, { inventoryItemId: "", quantity: "", unitCost: "" }] }));
  }
  function removeLine(idx) {
    setForm((p) => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, i) => i !== idx) : p.lines }));
  }

  async function handleInvoiceFile(files) {
    const file = files?.[0];
    if (!file) return;
    const requestId = ++ocrRequestRef.current;
    setForm((p) => ({ ...clearOcrPrefill(p), invoiceFileId: "" }));
    setOcr({ ...EMPTY_OCR, uploading: true, fileName: file.name });
    try {
      const result = await suggestReceiptFromInvoice(file);
      if (requestId !== ocrRequestRef.current) return;
      // A NF fica anexada ao recebimento (invoiceFileId) com ou sem sugestão de OCR.
      setForm((p) => ({ ...p, invoiceFileId: result?.invoiceFileId || "" }));
      setOcr({ ...EMPTY_OCR, fileName: file.name, result });
    } catch (err) {
      if (requestId !== ocrRequestRef.current) return;
      setForm((p) => ({ ...p, invoiceFileId: "" }));
      setOcr({ ...EMPTY_OCR, error: err?.message || "Não foi possível enviar a nota fiscal." });
    }
  }

  function removeInvoiceFile() {
    ocrRequestRef.current += 1;
    setForm((p) => ({ ...clearOcrPrefill(p), invoiceFileId: "" }));
    setOcr(EMPTY_OCR);
  }

  // Pré-preenche (não envia): o usuário ainda revisa cada linha e clica em "Criar rascunho".
  function applyOcrSuggestion() {
    const suggestion = ocr.result?.suggestion;
    if (!suggestion) return;
    const lines = (suggestion.items || []).map((l) => ({
      inventoryItemId: l.inventoryItemId || "",
      quantity: toBrDecimalString(l.quantity),
      unitCost: toBrDecimalString(l.unitCost),
    }));
    setForm((p) => ({
      ...p,
      invoiceNumber: suggestion.invoiceNumber || p.invoiceNumber,
      invoiceFingerprint: suggestion.invoiceFingerprint || p.invoiceFingerprint,
      lines: lines.length > 0 ? lines : p.lines,
    }));
    setOcr((p) => ({ ...p, applied: true }));
  }

  const isValid = form.destinationLocationId && form.lines.every((l) =>
    l.inventoryItemId &&
    !Number.isNaN(toNumber(l.quantity)) && toNumber(l.quantity) > 0 &&
    (!l.unitCost || (!Number.isNaN(toNumber(l.unitCost)) && toNumber(l.unitCost) >= 0))
  );

  function openNewReceipt() {
    ocrRequestRef.current += 1;
    setForm(EMPTY_FORM);
    setOcr(EMPTY_OCR);
    setModalOpen(true);
  }

  // Dados pré-preenchidos por uma NF anterior não podem sobreviver à troca/remoção da NF.
  function clearOcrPrefill(prev) {
    if (!ocr.applied) return prev;
    return { ...prev, invoiceNumber: "", invoiceFingerprint: "", lines: EMPTY_FORM.lines };
  }

  async function handleCreate() {
    if (!isValid) return;
    setSaving(true);
    setActionError("");
    try {
      await createReceipt({
        destinationLocationId: form.destinationLocationId,
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceFingerprint: form.invoiceFingerprint || undefined,
        invoiceFileId: form.invoiceFileId || undefined,
        notes: ocr.applied && ocr.result?.aiRunId
          ? `Itens pré-preenchidos por OCR/IA (${ocr.result.provider}, execução ${ocr.result.aiRunId}) e conferidos pelo usuário.`
          : undefined,
        items: form.lines.map((l) => ({ inventoryItemId: l.inventoryItemId, quantity: toNumber(l.quantity), unitCost: l.unitCost ? toNumber(l.unitCost) : undefined })),
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setOcr(EMPTY_OCR);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível criar o recebimento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReview(id) {
    setBusyId(id);
    setActionError("");
    try {
      await reviewReceipt(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível revisar o recebimento.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirm(id) {
    setBusyId(id);
    setActionError("");
    try {
      await confirmReceipt(id);
      load();
    } catch (err) {
      setActionError(err?.message || "Não foi possível confirmar o recebimento.");
    } finally {
      setBusyId(null);
    }
  }

  function locationName(id) {
    return locations.find((l) => l.id === id)?.name || "—";
  }

  const columns = [
    { key: "invoice", label: "NF", width: "16%", render: (row) => row.invoiceNumber || "—" },
    { key: "dest", label: "Destino", width: "22%", render: (row) => locationName(row.destinationLocationId) },
    { key: "status", label: "Status", width: "16%", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "created", label: "Criado em", width: "20%", render: (row) => formatDateTime(row.created_at) },
    {
      key: "actions",
      label: "",
      width: "26%",
      render: (row) => (
        <div style={{ display: "flex", gap: 8 }}>
          {row.status === "DRAFT" ? (
            <Button size="sm" variant="secondary" onClick={() => handleReview(row.id)} loading={busyId === row.id}>Revisar</Button>
          ) : null}
          {row.status === "REVIEWED" ? (
            <Button size="sm" onClick={() => handleConfirm(row.id)} loading={busyId === row.id}>Confirmar entrada</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppShell title="Recebimentos (NF)" backHref="/painel/estoque">
      {loadError ? <Alert tone="danger" title="Não foi possível carregar os recebimentos">{loadError}</Alert> : null}
      {actionError ? (
        /* BUG REAL CORRIGIDO (auditoria E2E Marco 7, ciclo 4) — mesma classe sistêmica já
           catalogada no Marco 6: Alert de erro renderizado só no topo da página ficava atrás do
           overlay de qualquer modal aberto (z-index 100), deixando o usuário sem nenhum feedback
           visível ao submeter algo rejeitado pela API. Posição fixa com z-index acima do Modal. */
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <Card title="Recebimentos" subtitle="Entrada por NF — Rascunho → Revisado → Confirmado (gera saldo+custo médio)">
        <Table columns={columns} rows={loading ? [] : receipts} loading={loading} emptyMessage="Nenhum recebimento registrado." />
      </Card>

      <StickyActionBar>
        <Button onClick={openNewReceipt}>
          <Icon name="plus" size={18} /> Novo recebimento
        </Button>
      </StickyActionBar>

      <Modal
        size="lg"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo recebimento"
        footer={
          items.length === 0 || locations.length === 0 ? (
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} loading={saving} disabled={!isValid}>Criar rascunho</Button>
            </>
          )
        }
      >
        {items.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="layers" title="Nenhum item de estoque cadastrado" description="Você precisa cadastrar pelo menos um item antes de registrar um recebimento." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar item agora</Button>
          </div>
        ) : locations.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) 0" }}>
            <EmptyState icon="mapPin" title="Nenhum local de estoque cadastrado" description="Você precisa cadastrar pelo menos um local de destino antes de registrar um recebimento." />
            <Button onClick={() => router.push("/painel/estoque")}>Cadastrar local agora</Button>
          </div>
        ) : (
        <>
        <FormField label="Nota fiscal (PDF ou foto)" helper="Opcional. A NF fica anexada ao recebimento; se houver OCR/IA configurado, os itens são sugeridos para você conferir.">
          <FileDropInput
            id="receipt-invoice-file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
            uploading={ocr.uploading}
            error={ocr.error}
            fileNames={ocr.fileName && !ocr.error ? [ocr.fileName] : []}
            onFiles={handleInvoiceFile}
            onRemove={removeInvoiceFile}
          />
        </FormField>
        {ocr.result && !ocr.result.suggestion ? (
          <Alert tone="info" title={OCR_STATUS_LABELS[ocr.result.status] || ocr.result.status}>{ocr.result.message}</Alert>
        ) : null}
        {ocr.result?.suggestion ? (
          <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md, 8px)", padding: "var(--space-3, 12px)", marginBottom: "var(--space-4, 16px)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <strong>Sugestão de OCR/IA</strong>
              <Badge tone={OCR_STATUS_TONE[ocr.result.status]}>{OCR_STATUS_LABELS[ocr.result.status] || ocr.result.status}</Badge>
              <Badge tone={ocr.result.configured ? "info" : "neutral"}>{ocr.result.configured ? ocr.result.provider : "Sandbox (teste)"}</Badge>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>confiança {Math.round((ocr.result.confidence || 0) * 100)}%</span>
            </div>
            {ocr.result.warnings?.length ? (
              <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 13 }}>
                {ocr.result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 13 }}>
              {(ocr.result.suggestion.items || []).map((l) => (
                <li key={l.lineNumber}>
                  {l.description || l.sku || `Linha ${l.lineNumber}`} — {l.inventoryItemName ? `→ ${l.inventoryItemName}` : "sem item correspondente"}; qtd {l.quantity != null ? toBrDecimalString(l.quantity) : "?"}; custo {l.unitCost != null ? toBrDecimalString(l.unitCost) : "?"}
                </li>
              ))}
            </ul>
            {ocr.applied ? (
              <Alert tone="warning">Formulário pré-preenchido. Confira cada linha (item, quantidade e custo) antes de criar o rascunho — nada foi lançado no estoque.</Alert>
            ) : (
              <Button size="sm" variant="secondary" onClick={applyOcrSuggestion}>Preencher formulário com a sugestão</Button>
            )}
          </div>
        ) : null}
        <FormField label="Local de destino" required>
          <Select value={form.destinationLocationId} onChange={(e) => setForm((p) => ({ ...p, destinationLocationId: e.target.value }))}>
            <option value="">Selecione...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Número da NF">
          <Input value={form.invoiceNumber} onChange={(e) => setForm((p) => ({ ...p, invoiceNumber: e.target.value }))} />
        </FormField>
        <FormField label="Chave/fingerprint da NF" helper="Usado para detectar NF duplicada.">
          <Input value={form.invoiceFingerprint} onChange={(e) => setForm((p) => ({ ...p, invoiceFingerprint: e.target.value }))} />
        </FormField>
        {form.lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Select value={line.inventoryItemId} onChange={(e) => updateLine(idx, "inventoryItemId", e.target.value)} style={{ flex: 2 }}>
              <option value="">Item...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
            <DecimalInput placeholder="Qtd" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} style={{ flex: 1 }} />
            <DecimalInput placeholder="Custo unit." value={line.unitCost} onChange={(e) => updateLine(idx, "unitCost", e.target.value)} style={{ flex: 1 }} />
            {form.lines.length > 1 ? (
              <Button size="sm" variant="secondary" onClick={() => removeLine(idx)} aria-label={`Remover linha ${idx + 1}`}>
                <Icon name="close" size={14} />
              </Button>
            ) : null}
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={addLine}>+ Adicionar item</Button>
        </>
        )}
      </Modal>
    </AppShell>
  );
}
