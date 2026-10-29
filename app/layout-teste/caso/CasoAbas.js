import { Fragment } from "react";
import StatusChip from "../_components/StatusChip";
import { brl } from "../_components/format";
import { ENVIOS, AVALIACAO, COMISSAO, AUDITORIA, EVENTOS } from "../_mock/caso";
import Timeline from "../_components/Timeline";
import DocChecklist from "./DocChecklist";
import SimTable from "./SimTable";
import VersionHistory from "./VersionHistory";
import ui from "../_components/ui.module.css";
import t from "../_components/Table.module.css";
import s from "./caso.module.css";

const Card = ({ title, aside, children }) => (
  <section className={ui.card} style={{ marginBottom: 12 }}>
    <div className={ui.cardHead}><h2 className={ui.cardTitle}>{title}</h2>{aside}</div>
    {children}
  </section>
);

export function TabDocumentos() {
  return (<><Card title="Documentos do caso" aside={<span className={ui.muted}>7 documentos</span>}><DocChecklist /></Card><VersionHistory /></>);
}
export function TabSimulacoes() {
  return (<Card title="Simulações" aside={<span className={ui.muted}>3 bancos consultados em 26/10/2026</span>}><SimTable /></Card>);
}
export function TabEnvio() {
  return (
    <div className={s.cols}>
      <Card title="Envios ao banco">
        <div className={t.wrap}><table className={t.table}>
          <thead><tr><th scope="col">Data e hora</th><th scope="col">Ação</th><th scope="col">Canal</th><th scope="col">Resultado</th><th scope="col">Protocolo do banco</th></tr></thead>
          <tbody>{ENVIOS.map((e) => (
            <tr key={e.quando}><td className={t.num}>{e.quando}</td><td className={t.strong}>{e.acao}</td><td>{e.canal}</td><td><StatusChip tone={e.resultado === "Recebido" ? "success" : "info"}>{e.resultado}</StatusChip></td><td className={ui.mono}>{e.prot}</td></tr>
          ))}</tbody>
        </table></div>
      </Card>
      <Card title="Histórico"><div className={ui.cardBody}><Timeline items={EVENTOS} /></div></Card>
    </div>
  );
}
export function TabAvaliacao() {
  return (<Card title="Avaliação do imóvel"><dl className={s.dl}>{AVALIACAO.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}</dl></Card>);
}
export function TabComissao() {
  const total = COMISSAO.reduce((a, c) => a + c.valor, 0);
  return (
    <Card title="Comissão prevista" aside={<span className={ui.muted}>Base: valor financiado R$ 612.000,00</span>}>
      <div className={t.wrap}><table className={t.table}>
        <thead><tr><th scope="col">Beneficiário</th><th scope="col">Papel</th><th scope="col" className={t.right}>Percentual</th><th scope="col" className={t.right}>Valor</th><th scope="col">Situação</th></tr></thead>
        <tbody>{COMISSAO.map((c) => (
          <tr key={c.benef}><td className={t.strong}>{c.benef}</td><td>{c.papel}</td><td className={t.right}>{c.pct}</td><td className={t.right}>{brl(c.valor)}</td><td><StatusChip tone="neutral">{c.sit}</StatusChip></td></tr>
        ))}</tbody>
        <tfoot><tr><td colSpan={3}>Total previsto</td><td className={t.right}>{brl(total)}</td><td /></tr></tfoot>
      </table></div>
    </Card>
  );
}
export function TabAuditoria() {
  return (
    <Card title="Trilha de auditoria" aside={<span className={ui.muted}>Somente leitura</span>}>
      <div className={t.wrap}><table className={t.table}>
        <thead><tr><th scope="col">Data e hora</th><th scope="col">Pessoa</th><th scope="col">Ação</th><th scope="col">Detalhe</th><th scope="col">IP</th></tr></thead>
        <tbody>{AUDITORIA.map((a) => (
          <tr key={a.quando}><td className={t.num}>{a.quando}</td><td className={t.strong}>{a.quem}</td><td className={ui.mono}>{a.acao}</td><td>{a.det}</td><td className={ui.mono}>{a.ip}</td></tr>
        ))}</tbody>
      </table></div>
    </Card>
  );
}
