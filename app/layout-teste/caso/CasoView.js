"use client";
import { useState } from "react";
import Icon from "../_components/Icon";
import PageHeader from "../_components/PageHeader";
import StatusChip from "../_components/StatusChip";
import RowMenu from "../_components/RowMenu";
import Tabs from "../_components/Tabs";
import { RESUMO, PROXIMA_ACAO } from "../_mock/caso";
import CasoResumo from "./CasoResumo";
import { TabDocumentos, TabSimulacoes, TabEnvio, TabAvaliacao, TabComissao, TabAuditoria } from "./CasoAbas";
import ui from "../_components/ui.module.css";
import s from "./caso.module.css";

const TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "docs", label: "Documentos", count: 7 },
  { id: "sims", label: "Simulações", count: 3 },
  { id: "envio", label: "Envio e histórico" },
  { id: "aval", label: "Avaliação" },
  { id: "comissao", label: "Comissão" },
  { id: "auditoria", label: "Auditoria" },
];
const PANELS = { resumo: CasoResumo, docs: TabDocumentos, sims: TabSimulacoes, envio: TabEnvio, aval: TabAvaliacao, comissao: TabComissao, auditoria: TabAuditoria };

export default function CasoView() {
  const [tab, setTab] = useState("resumo");
  const Panel = PANELS[tab];
  return (
    <>
      <PageHeader
        title="Caso FC-2026-0412"
        subtitle="Financiamento de Beatriz Nogueira Lima · IMV-1087 Jardim Botânico"
        actions={<>
          <button type="button" className={`${ui.btn} ${ui.primary}`}><Icon name="correspondente" /> Enviar ao banco</button>
          <button type="button" className={ui.btn}><Icon name="check" /> Registrar resultado</button>
          <button type="button" className={`${ui.btn} ${ui.danger}`}>Cancelar caso</button>
          <RowMenu label="Mais ações do caso" items={[{ label: "Duplicar caso" }, { label: "Reatribuir responsável" }, { label: "Imprimir ficha" }]} />
        </>}
      />
      <section className={`${ui.card} ${s.summary}`} aria-label="Resumo do caso">
        <div className={s.grid}>
          <div className={s.cell}>
            <div className={ui.label}>Status</div>
            <div className={s.status}><StatusChip tone="info">Em análise</StatusChip></div>
            <div className={s.sub}>Atualizado há 18 min</div>
          </div>
          {RESUMO.map(([k, v, sub]) => (
            <div key={k} className={s.cell}>
              <div className={ui.label}>{k}</div>
              <div className={ui.value}>{v}</div>
              <div className={s.sub}>{sub}</div>
            </div>
          ))}
          <div className={s.cell}>
            <div className={ui.label}>Segurança</div>
            <div className={ui.value}>3 de 7 verificações</div>
            <div className={s.sub}>Duplicidade: nenhuma</div>
          </div>
        </div>
        <div className={s.next}><Icon name="alert" size={14} /><span><strong>Próxima ação sugerida:</strong> {PROXIMA_ACAO}</span></div>
      </section>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}><Panel /></div>
    </>
  );
}
