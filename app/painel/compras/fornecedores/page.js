"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import Modal from "@/components/organisms/Modal/Modal";
import FormField from "@/components/molecules/FormField/FormField";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import { listSupplierQualifications, listPurchaseOrders } from "@/lib/api/procurement";
import { listPeople } from "@/lib/api/people";
import { formatDate } from "@/lib/format";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { DUE_DILIGENCE_LABELS, DUE_DILIGENCE_TONE, isQualificationExpired, awardBlockReason } from "@/lib/procurement/supplierQualification";

// Auditoria contratual Marco 7 (2026-10-07) — "Fornecedores: cadastro mestre; documentos/
// vigência; due diligence para alto risco". O backend (supplier-qualifications) já existia e era
// testado, mas nenhuma tela permitia registrar o risco de um fornecedor, anexar documentos ou
// aprovar/reprovar a due diligence. Esta lista mostra os fornecedores já qualificados e os que já
// receberam PO sem nenhuma qualificação registrada; a ficha de cada um fica em ./[id].
export default function FornecedoresPage() {
  const router = useRouter();
  // M9-D850: as três leituras formam uma só chamada do padrão de estados; 403 mostra acesso negado, nunca "nenhum fornecedor".
  const query = useAsyncState(
    async () => {
      const [q, o, p] = await Promise.all([listSupplierQualifications(), listPurchaseOrders(), listPeople()]);
      return { qualifications: q || [], orders: o || [], people: p || [] };
    },
    { key: "fornecedores", isEmpty: () => false }
  );
  const qualifications = useMemo(() => (query.data ? query.data.qualifications : []), [query.data]);
  const orders = useMemo(() => (query.data ? query.data.orders : []), [query.data]);
  const people = useMemo(() => (query.data ? query.data.people : []), [query.data]);
  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState({ name: "", personId: "" });

  const nameById = useMemo(() => {
    const map = new Map(people.map((p) => [p.id, p.legalName]));
    orders.forEach((o) => { if (o.supplierPersonId && o.supplierPersonName && !map.has(o.supplierPersonId)) map.set(o.supplierPersonId, o.supplierPersonName); });
    return map;
  }, [people, orders]);

  const rows = useMemo(() => {
    const qualifiedIds = new Set(qualifications.map((q) => q.supplierPersonId));
    const orderCount = new Map();
    orders.forEach((o) => { if (o.supplierPersonId) orderCount.set(o.supplierPersonId, (orderCount.get(o.supplierPersonId) || 0) + 1); });
    const qualified = qualifications.map((q) => ({ id: q.supplierPersonId, qualification: q, orders: orderCount.get(q.supplierPersonId) || 0 }));
    const unqualified = [...orderCount.keys()]
      .filter((id) => !qualifiedIds.has(id))
      .map((id) => ({ id, qualification: null, orders: orderCount.get(id) }));
    return [...qualified, ...unqualified];
  }, [qualifications, orders]);

  const pendingCount = qualifications.filter((q) => q.highRisk && q.dueDiligenceStatus === "PENDING").length;

  const columns = [
    {
      key: "supplier",
      label: "Fornecedor",
      width: "20%",
      render: (row) => <Link href={`/painel/compras/fornecedores/${row.id}`}>{nameById.get(row.id) || "Fornecedor sem nome"}</Link>,
    },
    {
      key: "risk",
      label: "Risco",
      width: "14%",
      render: (row) => (!row.qualification ? <Badge tone="neutral">Não qualificado</Badge> : row.qualification.highRisk ? <Badge tone="danger">Alto risco</Badge> : <Badge tone="success">Padrão</Badge>),
    },
    {
      key: "dd",
      label: "Due diligence",
      width: "18%",
      render: (row) => (row.qualification ? <Badge tone={DUE_DILIGENCE_TONE[row.qualification.dueDiligenceStatus]}>{DUE_DILIGENCE_LABELS[row.qualification.dueDiligenceStatus] || row.qualification.dueDiligenceStatus}</Badge> : "Sem due diligence"),
    },
    {
      key: "valid",
      label: "Vigência",
      width: "14%",
      render: (row) => {
        if (!row.qualification?.validUntil) return "Sem validade definida";
        return (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {formatDate(row.qualification.validUntil)}
            {isQualificationExpired(row.qualification) ? <Badge tone="danger">Vencida</Badge> : null}
          </span>
        );
      },
    },
    { key: "docs", label: "Documentos", width: "12%", render: (row) => (row.qualification ? (row.qualification.documentFileIds || []).length : "Fornecedor sem qualificação") },
    {
      key: "award",
      label: "Pode receber?",
      width: "14%",
      render: (row) => (row.qualification && awardBlockReason(row.qualification) ? <Badge tone="danger">Bloqueado</Badge> : <Badge tone="success">Sim</Badge>),
    },
    {
      key: "actions",
      label: "",
      width: "8%",
      render: (row) => <Button size="sm" variant="secondary" onClick={() => router.push(`/painel/compras/fornecedores/${row.id}`)}>Abrir</Button>,
    },
  ];

  return (
    <AppShell title="Fornecedores" backHref="/painel/compras">
      {pendingCount > 0 ? (
        <Alert tone="warning" title={`${pendingCount} fornecedor(es) de alto risco aguardando due diligence`}>
          Enquanto a due diligence não for aprovada, esses fornecedores não podem ser adjudicados numa cotação.
        </Alert>
      ) : null}

      <Card
        title="Qualificação de fornecedores"
        subtitle="Documentos, vigência e due diligence para alto risco"
        actions={<Button size="sm" onClick={() => { setPicked({ name: "", personId: "" }); setPickOpen(true); }}>Qualificar fornecedor</Button>}
      >
        <AsyncState result={query}>
          {() => <Table columns={columns} rows={rows} emptyMessage="Nenhum fornecedor qualificado ou com pedido de compra ainda." />}
        </AsyncState>
      </Card>

      <Modal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="Qualificar fornecedor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPickOpen(false)}>Cancelar</Button>
            <Button disabled={!picked.personId} onClick={() => router.push(`/painel/compras/fornecedores/${picked.personId}`)}>Abrir ficha</Button>
          </>
        }
      >
        <FormField label="Fornecedor (contato já cadastrado)" required>
          <PersonPicker
            id="qualify-supplier"
            value={picked.name}
            personId={picked.personId}
            placeholder="Buscar fornecedor pelo nome..."
            onSelect={({ name, personId }) => setPicked({ name, personId: personId || "" })}
          />
        </FormField>
      </Modal>
    </AppShell>
  );
}
