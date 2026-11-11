"use client";

// Seção "Leads esquecidos" (Marco 3 §16 "Detecta lead esquecido"): a NAY lista as oportunidades abertas da carteira de quem pede que
// estão sem contato há mais dias que o prazo da empresa. Só lista: retomar o contato é com o corretor.
import Button from "@/components/atoms/Button/Button";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import { stageLabelPt } from "@/lib/api/crm";
import { formatDateTime } from "@/lib/format";
import NayAnswer from "./NayAnswer";
import { useNayRun } from "./useNayRun";
import { TASKS } from "./nayComercial.format.js";
import styles from "./page.module.css";

function LeadsTable({ data }) {
  if (!data) return null;
  const rows = data.oportunidades || [];
  return (
    <>
      <p className={styles.meta}>
        {`${data.prazoDias != null ? `Prazo usado: mais de ${data.prazoDias} dias sem contato. ` : ""}${data.total ?? rows.length} oportunidade(s) encontrada(s)${data.total > rows.length ? `; aparecem as ${rows.length} primeiras` : ""}.`}
      </p>
      <Table
        rows={rows}
        emptyMessage="Nenhum lead esquecido na sua carteira."
        columns={[
          { key: "cliente", label: "Cliente", render: (r) => r.cliente || "Cliente sem nome" },
          { key: "etapa", label: "Etapa", render: (r) => stageLabelPt(r.etapa) },
          { key: "diasSemContato", label: "Dias sem contato", render: (r) => (r.diasSemContato != null ? String(r.diasSemContato) : "") },
          { key: "ultimoContatoEm", label: "Último contato", render: (r) => (r.ultimoContatoEm ? formatDateTime(r.ultimoContatoEm) : "Nunca houve contato"), emptyText: "Nunca houve contato" },
        ]}
      />
    </>
  );
}

export default function LeadsSection() {
  const nay = useNayRun();
  return (
    <Card title="Leads esquecidos" subtitle="Oportunidades da sua carteira sem contato há mais tempo que o prazo definido pela empresa.">
      <div className={styles.actions}>
        <Button size="sm" variant="secondary" loading={nay.status === "loading"} onClick={() => nay.run(TASKS.FORGOTTEN, {})}>
          Procurar leads esquecidos
        </Button>
      </div>
      <NayAnswer state={nay} title="Leads esquecidos">
        {(result) => <LeadsTable data={result.structured} />}
      </NayAnswer>
    </Card>
  );
}
