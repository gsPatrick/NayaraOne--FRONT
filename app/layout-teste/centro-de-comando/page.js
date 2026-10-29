import PageHeader from "../_components/PageHeader";
import Icon from "../_components/Icon";
import StatusChip from "../_components/StatusChip";
import ui from "../_components/ui.module.css";
import { SAUDE } from "../_mock/comando";
import PerguntasFinanceiras from "./PerguntasFinanceiras";
import DecisoesNay from "./DecisoesNay";
import GraficoAlertas from "./GraficoAlertas";
import ObrasQualidade from "./ObrasQualidade";
import s from "./cc.module.css";

export const metadata = { title: "Centro de Comando — área de teste de layout" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Centro de Comando"
        subtitle="As seis perguntas que o dono precisa responder hoje."
        actions={<>
          <select className={ui.select} aria-label="Período" defaultValue="30"><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select>
          <select className={ui.select} aria-label="Empresa" defaultValue="grp"><option value="grp">Grupo consolidado</option><option value="mat">Nayara Imóveis</option><option value="obr">Nayara Construções</option></select>
          <button type="button" className={`${ui.btn} ${ui.primary}`}><Icon name="download" /> Exportar painel</button>
        </>}
      />
      <section className={`${ui.card} ${s.health}`} aria-label="Saúde geral">
        <span className={s.light} role="img" aria-label="Semáforo verde" />
        <div><div className={ui.label}>Saúde geral</div><div className={s.score}>{SAUDE.nota}<span>/100</span></div></div>
        <StatusChip tone="success">{SAUDE.status}</StatusChip>
        <span className={s.var}><Icon name="up" size={12} strokeWidth={2} /> {SAUDE.variacao}</span>
        <span className={s.ctx}>{SAUDE.periodo} · {SAUDE.empresa}</span>
      </section>
      <PerguntasFinanceiras />
      <DecisoesNay />
      <GraficoAlertas />
      <ObrasQualidade />
    </>
  );
}
