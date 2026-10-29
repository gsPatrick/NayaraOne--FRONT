import Link from "next/link";
import Icon from "./_components/Icon";
import PageHeader from "./_components/PageHeader";
import StatusChip from "./_components/StatusChip";
import ui from "./_components/ui.module.css";
import s from "./indice.module.css";

const TELAS = [
  { href: "/layout-teste/financiamentos", icon: "correspondente", titulo: "Financiamentos", desc: "Listagem densa com 16 casos, indicadores-filtro, ordenação, seleção em massa e paginação." },
  { href: "/layout-teste/caso", icon: "contratos", titulo: "Caso FC-2026-0412", desc: "Ficha com cabeçalho-resumo, barra de ações e 7 abas funcionais." },
  { href: "/layout-teste/centro-de-comando", icon: "comando", titulo: "Centro de Comando", desc: "Saúde geral, as seis perguntas, fila de decisões, gráficos e alertas." },
];

export default function Indice() {
  return (
    <>
      <PageHeader title="Área de teste de layout" subtitle="Três telas de exemplo para comparar com o design atual." />
      <div className={s.aviso} role="note">
        <Icon name="alert" size={16} />
        <span><strong>Área de teste de layout, dados fictícios.</strong> Sem login, sem API: tudo é mock local. Nada aqui altera o sistema.</span>
      </div>
      <div className={s.grid}>
        {TELAS.map((t) => (
          <Link key={t.href} href={t.href} className={`${ui.card} ${s.card}`}>
            <span className={s.ico}><Icon name={t.icon} size={20} /></span>
            <span className={s.titulo}>{t.titulo}</span>
            <span className={s.desc}>{t.desc}</span>
            <span className={s.abrir}>Abrir tela <Icon name="chevR" size={14} /></span>
          </Link>
        ))}
      </div>
      <p className={s.rodape}><StatusChip tone="neutral">Base 13px</StatusChip> linhas de 38px, controles de 32px, cantos de 6px, sem sombras.</p>
    </>
  );
}
