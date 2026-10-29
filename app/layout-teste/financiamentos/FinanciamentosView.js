"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../_components/Icon";
import PageHeader from "../_components/PageHeader";
import DataTable from "../_components/DataTable";
import RowMenu from "../_components/RowMenu";
import StatusChip from "../_components/StatusChip";
import Avatar from "../_components/Avatar";
import { brl, relTime } from "../_components/format";
import { CASOS, INDICADORES, SITUACOES, BANCOS, RESPONSAVEIS } from "../_mock/financiamentos";
import ui from "../_components/ui.module.css";
import t from "../_components/Table.module.css";
import s from "./fin.module.css";

const PERIODOS = { todos: Infinity, "24h": 1440, "7d": 10080, "30d": 43200 };

export default function FinanciamentosView() {
  const router = useRouter();
  const [f, setF] = useState({ q: "", situacao: "", banco: "", resp: "", periodo: "todos", parado: false });
  const [sort, setSort] = useState({ key: "min", dir: "asc" });
  const [sel, setSel] = useState(new Set());
  const [pageSize, setPageSize] = useState(16);
  const [page, setPage] = useState(1);
  const set = (patch) => { setF((p) => ({ ...p, ...patch })); setPage(1); };

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const rows = CASOS.filter((c) =>
      (!q || [c.id, c.proponente, c.cod, c.bairro].some((x) => x.toLowerCase().includes(q))) &&
      (!f.situacao || c.situacao === f.situacao) && (!f.banco || c.banco === f.banco) &&
      (!f.resp || c.resp === f.resp) && c.min <= PERIODOS[f.periodo] && (!f.parado || c.min > 10080));
    const k = sort.key, d = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => (typeof a[k] === "number" ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k]), "pt-BR")) * d);
  }, [f, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * pageSize, cur * pageSize);
  const toggleSort = (key) => setSort((p) => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" }));
  const toggle = (id) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((p) => { const n = new Set(p); const all = rows.every((r) => n.has(r.id)); rows.forEach((r) => (all ? n.delete(r.id) : n.add(r.id))); return n; });
  const abrir = () => router.push("/layout-teste/caso");
  const chipAtivo = (i) => (i.filtro.parado ? f.parado : f.situacao === i.filtro.situacao);
  const clickChip = (i) => (i.filtro.parado ? set({ parado: !f.parado, situacao: "" }) : set({ situacao: f.situacao === i.filtro.situacao ? "" : i.filtro.situacao, parado: false }));

  const columns = [
    { key: "id", label: "Protocolo", sortable: true, render: (r) => <span className={t.rowLink}>{r.id}</span> },
    { key: "proponente", label: "Proponente", sortable: true, render: (r) => <span className={t.cell2}><span className={t.strong}>{r.proponente}</span><span className={t.sub}>CPF {r.cpf}</span></span> },
    { key: "cod", label: "Imóvel", sortable: true, render: (r) => <span className={t.cell2}><span className={t.strong}>{r.cod}</span><span className={t.sub}>{r.bairro}</span></span> },
    { key: "banco", label: "Banco", sortable: true },
    { key: "valor", label: "Valor financiado", align: "right", sortable: true, render: (r) => brl(r.valor) },
    { key: "entrada", label: "Entrada", align: "right", sortable: true, render: (r) => brl(r.entrada) },
    { key: "situacao", label: "Situação", sortable: true, render: (r) => (
      <span className={s.sit}><StatusChip tone={SITUACOES[r.situacao]}>{r.situacao}</StatusChip>{r.dup && <StatusChip tone="warning" dot={false}>Possível duplicata</StatusChip>}</span>) },
    { key: "resp", label: "Responsável", sortable: true, render: (r) => <span className={ui.row}><Avatar nome={r.resp} />{r.resp.split(" ")[0]}</span> },
    { key: "min", label: "Atualização", sortable: true, render: (r) => <span className={r.min > 10080 ? s.stale : ""}>{relTime(r.min)}</span> },
  ];

  const totV = filtered.reduce((a, c) => a + c.valor, 0);
  const totE = filtered.reduce((a, c) => a + c.entrada, 0);
  const nSel = sel.size;

  return (
    <>
      <PageHeader
        title="Financiamentos"
        subtitle="Casos de financiamento imobiliário em andamento, por banco e responsável."
        actions={<>
          <button type="button" className={ui.btn}><Icon name="download" /> Exportar</button>
          <button type="button" className={`${ui.btn} ${ui.primary}`}><Icon name="plus" /> Novo caso de financiamento</button>
        </>}
      />
      <section aria-label="Indicadores" className={`${ui.card} ${s.kpis}`}>
        {INDICADORES.map((i) => (
          <button key={i.id} type="button" className={`${s.kpi} ${chipAtivo(i) ? s.kpiOn : ""}`} aria-pressed={chipAtivo(i)} onClick={() => clickChip(i)}>
            <span className={s.kpiN}>{i.n}{i.alerta && <span className={s.alertDot} aria-hidden="true" />}</span>
            <span className={ui.label}>{i.label}</span>
          </button>
        ))}
      </section>

      <section className={ui.card} aria-label="Lista de casos">
        <div className={s.filters} role="search">
          <div className={s.searchBox}>
            <Icon name="search" size={14} />
            <input type="search" aria-label="Buscar por proponente, imóvel ou protocolo" placeholder="Proponente, imóvel ou protocolo" value={f.q} onChange={(e) => set({ q: e.target.value })} />
          </div>
          <select className={ui.select} aria-label="Situação" value={f.situacao} onChange={(e) => set({ situacao: e.target.value, parado: false })}>
            <option value="">Situação: todas</option>{Object.keys(SITUACOES).map((x) => <option key={x}>{x}</option>)}
          </select>
          <select className={ui.select} aria-label="Banco" value={f.banco} onChange={(e) => set({ banco: e.target.value })}>
            <option value="">Banco: todos</option>{BANCOS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select className={ui.select} aria-label="Responsável" value={f.resp} onChange={(e) => set({ resp: e.target.value })}>
            <option value="">Responsável: todos</option>{RESPONSAVEIS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select className={ui.select} aria-label="Período de atualização" value={f.periodo} onChange={(e) => set({ periodo: e.target.value })}>
            <option value="todos">Período: todos</option><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option>
          </select>
          {(f.q || f.situacao || f.banco || f.resp || f.parado || f.periodo !== "todos") && (
            <button type="button" className={`${ui.btn} ${ui.sm}`} onClick={() => set({ q: "", situacao: "", banco: "", resp: "", periodo: "todos", parado: false })}>Limpar filtros</button>
          )}
        </div>
        {nSel > 0 && (
          <div className={s.bulk} role="status">
            <strong>{nSel} {nSel === 1 ? "selecionado" : "selecionados"}</strong>
            <button type="button" className={`${ui.btn} ${ui.sm}`}>Atribuir responsável</button>
            <button type="button" className={`${ui.btn} ${ui.sm}`}>Exportar seleção</button>
            <button type="button" className={`${ui.btn} ${ui.sm} ${ui.danger}`}>Cancelar casos</button>
            <button type="button" className={`${ui.btn} ${ui.sm}`} onClick={() => setSel(new Set())}>Limpar seleção</button>
          </div>
        )}
        <DataTable
          caption="Casos de financiamento" columns={columns} rows={rows} rowKey={(r) => r.id} maxHeight="max(360px, calc(100dvh - 310px))"
          sort={sort} onSort={toggleSort} selected={sel} onToggle={toggle} onToggleAll={toggleAll} onRowClick={abrir}
          rowActions={(r) => <RowMenu label={`Ações do caso ${r.id}`} items={[
            { label: "Abrir caso", onSelect: abrir }, { label: "Atribuir responsável" }, { label: "Duplicar caso" }, { label: "Cancelar caso", danger: true }]} />}
          footer={<>
            <td />
            <td colSpan={4}>Totais dos {filtered.length} casos filtrados</td>
            <td className={t.right}>{brl(totV)}</td><td className={t.right}>{brl(totE)}</td>
            <td colSpan={4} />
          </>}
        />
        <div className={t.pager}>
          <span>Mostrando {filtered.length ? (cur - 1) * pageSize + 1 : 0} a {Math.min(cur * pageSize, filtered.length)} de {filtered.length} casos (amostra de 58 na carteira)</span>
          <div className={t.pgBtns}>
            <label>Linhas{" "}
              <select className={ui.select} style={{ height: 26 }} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={8}>8</option><option value={16}>16</option>
              </select>
            </label>
            <button type="button" className={`${ui.btn} ${ui.sm}`} disabled={cur <= 1} onClick={() => setPage(cur - 1)} aria-label="Página anterior"><Icon name="chevL" size={14} /></button>
            <span aria-live="polite">Página {cur} de {pages}</span>
            <button type="button" className={`${ui.btn} ${ui.sm}`} disabled={cur >= pages} onClick={() => setPage(cur + 1)} aria-label="Próxima página"><Icon name="chevR" size={14} /></button>
          </div>
        </div>
      </section>
    </>
  );
}
