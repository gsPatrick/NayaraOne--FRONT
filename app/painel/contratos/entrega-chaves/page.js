"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import StatTile from "@/components/molecules/StatTile/StatTile";
import Icon from "@/components/atoms/Icon/Icon";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import ContractsNavMenu from "@/components/molecules/ContractsNavMenu/ContractsNavMenu";
import RowActions from "@/components/molecules/RowActions/RowActions";
import Pagination from "@/components/molecules/Pagination/Pagination";
import { listPeople } from "@/lib/api/people";
import { listKeyDeliveries, listContracts } from "@/lib/api/legal";
import { KEY_DELIVERY_STATUS_LABELS, KEY_DELIVERY_STATUS_TONE, KEY_DELIVERY_TERM_TYPE_LABELS } from "@/lib/labels/juridico";
import { useHasPermission } from "@/lib/rbac/useHasPermission";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { formatDateTime, formatContractLabel } from "@/lib/format";
import styles from "./page.module.css";

export default function EntregaChavesPage() {
  const router = useRouter();
  // Liberar exige a permissão do livro lease.keys.deliver; sem ela o botão não aparece (a API recusaria).
  const canDeliver = useHasPermission("lease.keys.deliver");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // M9-D940: carregando, vazio, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const query = useAsyncState(async () => {
    const [deliveriesRes, contractsRes, peopleRes] = await Promise.all([listKeyDeliveries(), listContracts(), listPeople()]);
    return { deliveries: deliveriesRes || [], contracts: contractsRes || [], people: peopleRes || [] };
  }, { key: "contratos-entrega-chaves", isEmpty: (d) => !d || d.deliveries.length === 0 });
  const deliveries = query.data?.deliveries || [];
  const contracts = query.data?.contracts || [];
  const people = query.data?.people || [];

  function personOf(id) {
    return people.find((p) => p.id === id) || null;
  }

  function contractOf(id) {
    return contracts.find((c) => c.id === id) || null;
  }

  const totalPages = Math.max(1, Math.ceil(deliveries.length / pageSize));
  const pageItems = deliveries.slice((page - 1) * pageSize, page * pageSize);

  const pendingCount = deliveries.filter((d) => d.status === "PENDING").length;
  const releasedCount = deliveries.filter((d) => d.status === "RELEASED").length;
  const cancelledCount = deliveries.filter((d) => d.status === "CANCELLED").length;

  // A liberação exige quantidade de chaves, signatário do termo, a via do termo assinada e (quando a política do
  // servidor exigir) fotos — o formulário fica na tela de detalhe.
  function handleRelease(delivery) {
    router.push(`/painel/contratos/entrega-chaves/${delivery.id}?liberar=1`);
  }

  return (
    <AppShell title="Entrega de chaves" backHref="/painel/contratos">
      <div className={styles.grid}>
        <StatTile label="Entregas registradas" value={deliveries.length} tone="neutral" icon="key" />
        <StatTile label="Pendentes" value={pendingCount} tone={pendingCount > 0 ? "warning" : "success"} icon="calendar" />
        <StatTile label="Entregues" value={releasedCount} tone="success" icon="check" />
        <StatTile label="Canceladas" value={cancelledCount} tone="neutral" icon="shield" />
      </div>

      <Card title="Entregas de chave" subtitle={canDeliver ? "A entrega exige contrato assinado ou ativo, checklist atendido, vistoria de entrada assinada, garantia vigente e a via do termo assinada" : "Você não tem a permissão de entregar chaves: a lista é só para consulta"}>
        <AsyncState result={query} loadingLabel="Carregando entregas de chave..." emptyTitle="Nenhuma entrega de chaves registrada" emptyDescription="Registre a primeira entrega para acompanhar a liberação das chaves." emptyAction={{ label: "Nova entrega", href: "/painel/contratos/entrega-chaves/novo" }}>
        <div className={styles.list}>
          {pageItems.map((delivery) => {
            const contract = contractOf(delivery.contractId);
            const person = personOf(delivery.deliveredToPersonId);
            return (
              <div key={delivery.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{contract ? formatContractLabel(contract) : "Contrato não encontrado"}</span>
                  <span className={styles.rowSub}>{KEY_DELIVERY_TERM_TYPE_LABELS[delivery.termType] || KEY_DELIVERY_TERM_TYPE_LABELS.KEY_DELIVERY} · para {person?.legalName || "pessoa não encontrada"}{delivery.deliveredAt ? ` · entregue em ${formatDateTime(delivery.deliveredAt)}` : ""}</span>
                </div>
                <div className={styles.rowRight}>
                  <Badge tone={KEY_DELIVERY_STATUS_TONE[delivery.status]}>{KEY_DELIVERY_STATUS_LABELS[delivery.status] || "Situação não identificada"}</Badge>
                  {delivery.status === "PENDING" && canDeliver ? (
                    <Button size="sm" onClick={() => handleRelease(delivery)}>
                      <Icon name="key" size={16} /> Liberar chaves
                    </Button>
                  ) : null}
                  <RowActions onView={() => router.push(`/painel/contratos/entrega-chaves/${delivery.id}`)} />
                </div>
              </div>
            );
          })}
        </div>
        </AsyncState>
        <div className={styles.paginationRow}>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 15, 20, 25]}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Card>

      <StickyActionBar>
        <ContractsNavMenu />
        <Button href="/painel/contratos/entrega-chaves/novo">
          <Icon name="key" size={18} /> Nova entrega
        </Button>
      </StickyActionBar>

    </AppShell>
  );
}
