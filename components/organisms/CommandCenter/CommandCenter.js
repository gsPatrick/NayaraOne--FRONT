"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import BiBanner from "@/components/molecules/analytics/BiBanner/BiBanner";
import { getCommandCenter } from "@/lib/api/analytics";
import { listProjects } from "@/lib/api/construction";
import { formatDateTime } from "@/lib/format";
import AccessGate from "@/components/molecules/AccessGate/AccessGate";
import CommandBlock from "./CommandBlock";
import styles from "./CommandCenter.module.css";

// M9-D685 — Centro de Comando da Diretoria: a tela inicial que responde as seis perguntas do livro. Abre `GET /analytics/dashboards/command_center` (uma resposta com
// o briefing, a faixa de qualidade e os seis blocos já ordenados e limitados) e só desenha. Nenhum número, ordem ou total é calculado aqui.
function Brief({ brief }) {
  return (
    <section className={styles.brief} data-command-brief={brief.available ? "available" : "unavailable"}>
      <h3 className={styles.briefTitle}>Briefing da NAY Diretoria</h3>
      {brief.available ? (
        <>
          <ul className={styles.briefList}>
            {brief.items.map((i) => (
              <li key={i.refId}>
                {i.fato} {i.variacao || ""}
                <span className={styles.briefSource}> Fonte: {(i.fonte || []).map((f) => f.metricCode).join(", ")}{i.freshness?.label ? ` · ${i.freshness.label}` : ""}</span>
              </li>
            ))}
          </ul>
          {brief.closing ? <p className={styles.meta}>{brief.closing}</p> : null}
        </>
      ) : (
        <p className={styles.meta}>{brief.message}</p>
      )}
    </section>
  );
}

// O BI só guarda o id da obra: quando o perfil pode ler a lista de obras (construction:read), o nome entra no lugar do código curto, como nos painéis de Obras.
const hasProjects = (view) => view.blocks.some((b) => b.items.some((i) => i.projectId));
const projectNames = (list) => Object.fromEntries((Array.isArray(list) ? list : list?.rows || list?.items || []).map((p) => [p.id, p.name || p.title]).filter(([, name]) => name));

function CommandCenterData({ block }) {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getCommandCenter({ block })
      .then((view) => {
        if (cancelled) return;
        setData(view);
        if (hasProjects(view)) listProjects().then((list) => { if (!cancelled) setProjects(projectNames(list)); }).catch(() => {});
      })
      .catch((err) => { if (!cancelled) setError(err?.message || "Não foi possível carregar o Centro de Comando."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [block]);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (loading || !data) return <Spinner size="lg" />;
  const banner = data.widgets.find((w) => w.type === "QUALITY_BANNER");
  return (
    <div className={styles.page} data-bi-panel="command_center">
      <p className={styles.meta}>Posição em {data.asOfDate.split("-").reverse().join("/")} · gerado em {formatDateTime(data.generatedAt)}</p>
      {data.brief ? <Brief brief={data.brief} /> : null}
      {banner ? <BiBanner widget={banner} /> : null}
      {data.hidden?.text ? <p className={styles.hidden} data-command-hidden-total>{data.hidden.text}</p> : null}
      <div className={styles.blocks}>
        {data.blocks.map((b) => <CommandBlock key={b.key} block={b} projects={projects} />)}
      </div>
    </div>
  );
}

// A permissão é decidida antes da carga: perfil sem `analytics:read` vê o aviso na hora, sem spinner e sem chamar a API (M9-D685, C6).
export default function CommandCenter({ block = null, permissions = null }) {
  return <AccessGate permission="analytics:read" permissions={permissions}><CommandCenterData block={block} /></AccessGate>;
}
