"use client";

// Detalhe das respostas sobre a oportunidade escolhida: resumo do histórico, imóveis do Radar, rascunho de recuperação e preparação do
// envio de mensagem. A NAY não envia nada: o envio é do corretor, pelas mensagens do CRM.
import Badge from "@/components/atoms/Badge/Badge";
import Alert from "@/components/molecules/Alert/Alert";
import Table from "@/components/organisms/Table/Table";
import { stageLabelPt } from "@/lib/api/crm";
import { formatBRL, formatDateTime } from "@/lib/format";
import { TASKS, channelLabel, purposeLabel } from "./nayComercial.format.js";
import styles from "./page.module.css";

function Resumo({ data }) {
  return (
    <>
      <dl className={styles.facts}>
        <div className={styles.fact}><dt>Cliente</dt><dd>{data.cliente || "Cliente sem nome"}</dd></div>
        <div className={styles.fact}><dt>Etapa</dt><dd>{stageLabelPt(data.etapa)}</dd></div>
        <div className={styles.fact}><dt>Valor estimado</dt><dd>{data.valorEstimado != null ? formatBRL(data.valorEstimado) : "Sem valor estimado"}</dd></div>
        <div className={styles.fact}><dt>Última interação</dt><dd>{data.ultimaInteracaoEm ? formatDateTime(data.ultimaInteracaoEm) : "Sem interação registrada"}</dd></div>
        <div className={styles.fact}><dt>Dias sem contato</dt><dd>{data.diasSemContato != null ? String(data.diasSemContato) : "Sem contato registrado"}</dd></div>
      </dl>
      <p className={styles.subTitle}>Pendências</p>
      {data.pendencias && data.pendencias.length ? <ul className={styles.bullets}>{data.pendencias.map((p) => <li key={p}>{p}</li>)}</ul> : <p className={styles.empty}>Nenhuma pendência.</p>}
    </>
  );
}

function Radar({ data }) {
  const rows = (data.imoveis || []).map((m) => ({ id: m.propertyId, ...m }));
  return (
    <>
      <p className={styles.meta}>{`${data.exibidos ?? rows.length} de ${data.total ?? rows.length} imóveis compatíveis.${data.haMais ? " Há mais imóveis no Radar além destes." : ""}`}</p>
      <Table
        rows={rows}
        emptyMessage="Nenhum imóvel do Radar para esta oportunidade."
        columns={[
          { key: "title", label: "Imóvel", render: (r) => r.title || "Imóvel sem título" },
          { key: "city", label: "Cidade" },
          { key: "score", label: "Pontuação", render: (r) => (r.score != null ? Number(r.score).toLocaleString("pt-BR") : "") },
          { key: "reason", label: "Motivo" },
        ]}
      />
    </>
  );
}

function Envio({ data }) {
  return (
    <>
      <dl className={styles.facts}>
        <div className={styles.fact}><dt>Canal</dt><dd>{channelLabel(data.canal)}</dd></div>
        <div className={styles.fact}><dt>Finalidade conferida no consentimento</dt><dd>{purposeLabel(data.finalidade)}</dd></div>
        <div className={styles.fact}><dt>Regras de contato</dt><dd>{data.permitido ? <Badge tone="success">Permitem o envio</Badge> : <Badge tone="danger">Não permitem o envio</Badge>}</dd></div>
      </dl>
      {!data.permitido && data.motivo ? <p className={styles.rowText}>{`Motivo: ${data.motivo}.`}</p> : null}
      <Alert tone="info" title="Nenhuma mensagem foi enviada">A NAY não envia: revise o texto e envie você pelas mensagens do CRM.</Alert>
    </>
  );
}

/** Detalhamento estruturado da resposta, conforme a capacidade. */
export default function DetalhesOportunidade({ taskType, structured }) {
  if (!structured) return null;
  if (taskType === TASKS.SUMMARY) return <Resumo data={structured} />;
  if (taskType === TASKS.RADAR) return <Radar data={structured} />;
  if (taskType === TASKS.SEND) return <Envio data={structured} />;
  if (taskType === TASKS.RECOVERY) return <Alert tone="info" title="É só um rascunho">Nada foi enviado ao cliente. Se quiser usar, copie, revise e envie você pelas mensagens do CRM.</Alert>;
  return null;
}
