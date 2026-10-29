import Icon from "../_components/Icon";
import Timeline from "../_components/Timeline";
import StatusChip from "../_components/StatusChip";
import DocChecklist from "./DocChecklist";
import SimTable from "./SimTable";
import VersionHistory from "./VersionHistory";
import { EVENTOS, NAY, PENDENCIAS } from "../_mock/caso";
import ui from "../_components/ui.module.css";
import s from "./caso.module.css";

export default function CasoResumo() {
  return (
    <div className={s.cols}>
      <div className={s.stack}>
        <section className={ui.card} aria-labelledby="h-docs">
          <div className={ui.cardHead}><h2 id="h-docs" className={ui.cardTitle}>Checklist de documentos</h2><span className={ui.muted}>4 validados · 1 pendente · 1 ilegível</span></div>
          <DocChecklist />
        </section>
        <VersionHistory />
        <section className={ui.card} aria-labelledby="h-sims">
          <div className={ui.cardHead}><h2 id="h-sims" className={ui.cardTitle}>Simulações comparadas</h2><span className={ui.muted}>Valor financiado R$ 612.000,00</span></div>
          <SimTable />
        </section>
      </div>
      <div className={s.stack}>
        <section className={ui.card} aria-labelledby="h-tl">
          <div className={ui.cardHead}><h2 id="h-tl" className={ui.cardTitle}>Linha do tempo</h2></div>
          <div className={ui.cardBody}><Timeline items={EVENTOS} /></div>
        </section>
        <section className={ui.card} aria-labelledby="h-nay">
          <div className={ui.cardHead}><h2 id="h-nay" className={ui.cardTitle}>Resumo da NAY</h2><StatusChip tone="brand" dot={false}>Assistivo</StatusChip></div>
          <div className={ui.cardBody}>
            <ul className={s.nayList}>{NAY.map((n) => <li key={n}>{n}</li>)}</ul>
            <p className={s.aviso}>Conteúdo assistivo: a NAY não decide crédito. A decisão é sempre do banco e do responsável.</p>
          </div>
        </section>
        <section className={ui.card} aria-labelledby="h-pend">
          <div className={ui.cardHead}><h2 id="h-pend" className={ui.cardTitle}>Pendências</h2><StatusChip tone="warning" dot={false}>{PENDENCIAS.length}</StatusChip></div>
          <div className={ui.cardBody}>
            <ul className={s.pend}>{PENDENCIAS.map((p) => <li key={p}><Icon name="alert" size={14} />{p}</li>)}</ul>
          </div>
        </section>
      </div>
    </div>
  );
}
