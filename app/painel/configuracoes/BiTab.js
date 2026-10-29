"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { NatureLegend } from "@/components/molecules/analytics/NatureSeriesChart/NatureSeriesChart";
import styles from "./page.module.css";
import { BI_QUALIDADE_GROUPS } from "./biQualidadeGroups";
import { BI_DESEMPENHO_GROUPS } from "./biDesempenhoGroups";
import { BI_OBRAS_GROUPS } from "./biObrasGroups";
import { BI_COMERCIAL_GROUPS } from "./biComercialGroups";
import { BI_LOCACAO_GROUPS } from "./biLocacaoGroups";
import { BI_JURIDICO_GROUPS } from "./biJuridicoGroups";
import { BI_DRILLDOWN_GROUPS } from "./biDrilldownGroups";
import { BI_FINANCEIRO_GROUPS } from "./biFinanceiroGroups";
import { BI_FINANCEIRO_JANELAS_GROUPS } from "./biFinanceiroJanelasGroups";
import { BI_FINANCEIRO_RESULTADOS_GROUPS } from "./biFinanceiroResultadosGroups";
import { BI_CARGA_GROUPS } from "./biCargaGroups";
import { BI_SNAPSHOT_GROUPS } from "./biSnapshotGroups";
import { BI_ALERTAS_GROUPS } from "./biAlertasGroups";

// Parâmetros do BI e Centro de Comando (Marco 9, bloco D) que o administrador controla. A API valida (SETTINGS_SCHEMA); o padrão
// mostrado é o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. Cada demanda do bloco
// acrescenta as suas entradas em BI_GROUPS.
const BI_GROUPS = [
  {
    title: "Painéis somente leitura",
    subtitle: "Os painéis do BI só mostram números: nenhum campo permite editar o valor de um indicador. Para mudar um número, corrija o lançamento na origem (por exemplo, no Financeiro).",
    fields: [
      {
        key: "analytics.leitura.role_somente_leitura",
        label: "Consultar o BI com o perfil de banco sem permissão de escrita",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão: além da transação somente leitura (que não pode ser desligada), as consultas do BI usam um perfil de banco que nem tem permissão de gravar. Só tem efeito se o ambiente tiver esse perfil criado.",
      },
    ],
  },
  {
    title: "Segurança dos painéis e dos dados",
    subtitle: "Quem vê o quê no BI. O mascaramento de CPF, CNPJ, conta, e-mail e telefone vale para todos e não pode ser desligado; aqui você só acrescenta campos.",
    fields: [
      {
        key: "analytics.abac.mapa_dominio_permissao",
        label: "Permissão de leitura de cada área",
        type: "text",
        defaultValue: "Financeiro=finance:read; Comercial/Imóveis=crm:opportunities:read; Marketing=marketing:attribution:read; Atendimento=crm:feedback:read; Locação e Jurídico=legal:read; Obras=construction:read; Estoque=inventory:read; Correspondente=correspondent:read; Tecnologia=analytics:read:tech",
        helper: "Quem não tem a permissão da área não vê os indicadores dela. Formato: Área=permissão, separadas por ponto e vírgula. Entrada inválida volta ao padrão.",
      },
      {
        key: "analytics.abac.equipes",
        label: "Equipe de cada gerente (visão por carteira)",
        type: "text",
        defaultValue: "nenhuma",
        helper: "Corretor só vê a própria carteira. Para o gerente ver também a equipe, informe: id do gerente=id,id; outro gerente=id. Use \"nenhuma\" para não ter equipes.",
      },
      {
        key: "analytics.mascaramento.campos_extras",
        label: "Campos extras a mascarar",
        type: "text",
        defaultValue: "nenhum",
        helper: "Nomes de campo, separados por vírgula, que também saem mascarados no detalhe e na exportação. Use \"nenhum\" para não acrescentar.",
      },
      {
        key: "analytics.log_acesso.abertura_painel",
        label: "Aberturas de painel registradas no log de acesso",
        type: "text",
        defaultValue: "CRITICAL",
        helper: "CRITICAL registra só painéis com indicador crítico; TODOS registra qualquer abertura. Detalhes, exportações e briefings são sempre registrados.",
      },
      {
        key: "analytics.log_acesso.consulta_max_linhas",
        label: "Máximo de linhas por consulta ao log de acesso",
        type: "number",
        defaultValue: 200,
        helper: "De 1 a 1.000.",
      },
    ],
  },
  {
    title: "Versões dos indicadores",
    subtitle: "Mudar a fórmula de um indicador cria uma nova versão e nunca altera os números já registrados. Toda nova versão exige o motivo da mudança.",
    fields: [
      {
        key: "analytics.metrica.motivo_minimo_caracteres",
        label: "Mínimo de caracteres do motivo de uma nova versão",
        type: "number",
        defaultValue: 10,
        helper: "Número inteiro de 1 a 500. Padrão do livro: 10.",
      },
    ],
  },
  {
    title: "Rastreio do número até a origem",
    subtitle: "Cada número do BI traz a conferência de onde veio: quantos registros o compõem e uma amostra dos ids, para quem tem permissão de ver o detalhe.",
    fields: [
      {
        key: "analytics.rastreio.amostra_ids",
        label: "Quantos ids acompanham cada número",
        type: "number",
        defaultValue: 20,
        helper: "De 0 a 20. Com 0 nenhum id é mostrado (só a contagem). Quem não tem permissão de detalhe nunca vê os ids. Padrão do livro: 20.",
      },
    ],
  },
  {
    title: "Inadimplência",
    subtitle: "Como o vencido entra na taxa de inadimplência. O valor total vencido continua somado sem limite de idade; a janela só decide o que entra na taxa.",
    fields: [
      {
        key: "analytics.inadimplencia.janela_dias",
        label: "Janela da taxa de inadimplência (dias)",
        type: "number",
        defaultValue: 90,
        helper: "De 1 a 3.650. Dívida vencida há mais dias que isto não entra na taxa (que nunca passa de 100%), mas continua no total vencido. Padrão do livro: 90.",
      },
    ],
  },
  {
    title: "Marketing e Atendimento",
    subtitle: "Os números de campanhas, entrega, avaliações, satisfação, reclamações e SLA mudam por evento e também pela passagem do tempo (status de entrega que chega depois, prazo que vence).",
    fields: [
      {
        key: "analytics.marketing_atendimento.janela_reconferencia_dias",
        label: "Dias que a agenda reconfere em Marketing e Atendimento",
        type: "number",
        defaultValue: 7,
        helper: "De 1 a 90. A cada passada da agenda, dias e meses dentro desta janela são recalculados a partir dos registros. Padrão: 7.",
      },
    ],
  },
  {
    title: "NAY Diretoria no BI",
    subtitle: "A NAY explica os indicadores só com as ferramentas de leitura do BI (valor, variação, decomposição, alertas, origem, painel e frescor). Ela nunca escreve consulta ao banco e nunca recebe dado mascarado.",
    fields: [
      {
        key: "analytics.nay.max_itens_resposta",
        label: "Máximo de itens por resposta de ferramenta da NAY",
        type: "number",
        defaultValue: 50,
        helper: "De 1 a 200. Decomposição por dimensão, alertas e referências de origem vêm cortados neste tamanho e marcados como truncados. Padrão: 50.",
      },
    ],
  },
  {
    title: "Atualização dos painéis",
    subtitle: "Como os números dos painéis são recalculados quando algo acontece (um lançamento liquidado, uma oportunidade ganha) e pela passagem do tempo.",
    fields: [
      {
        key: "analytics.refresh.max_linhas_agregado",
        label: "Máximo de linhas lidas para atualizar um número por evento",
        type: "number",
        defaultValue: 10000,
        helper: "De 1 a 1.000.000. Acima disso a atualização espera a janela agendada e o indicador fica marcado como desatualizado. Padrão: 10.000.",
      },
      {
        key: "analytics.refresh.lote_segundos",
        label: "Intervalo mínimo entre as conferências de qualidade (segundos)",
        type: "number",
        defaultValue: 30,
        helper: "De 1 a 3.600. As conferências rodam ao fim de cada lote de eventos, no máximo uma vez por este intervalo. Padrão: 30.",
      },
      {
        key: "analytics.refresh.lote_linhas",
        label: "Indicadores recalculados por vez na atualização agendada",
        type: "number",
        defaultValue: 5000,
        helper: "De 1 a 100.000. Padrão: 5.000.",
      },
      {
        key: "analytics.refresh.schedule",
        label: "Agenda da atualização por passagem do tempo",
        type: "text",
        defaultValue: "a cada 15 min e às 00:05 America/Sao_Paulo",
        helper: "Formato: a cada 15 min e às 00:05 America/Sao_Paulo. Vencimentos e atrasos mudam sem nenhum evento, por isso também são recalculados na agenda.",
      },
      {
        key: "analytics.refresh.timeout_ms",
        label: "Tempo máximo de cada consulta da atualização (milissegundos)",
        type: "number",
        defaultValue: 30000,
        helper: "De 100 a 600.000. Padrão: 30.000.",
      },
    ],
  },
  {
    title: "Reconstrução dos painéis",
    subtitle: "A reconstrução apaga e refaz o número de um painel a partir das tabelas de origem (por exemplo, depois de um erro de integração). Ela é um comando de operação; aqui você só diz se este ambiente pode usá-lo.",
    fields: [
      {
        key: "analytics.rebuild.habilitado",
        label: "Permitir a reconstrução dos painéis neste ambiente",
        type: "boolean",
        defaultValue: false,
        helper: "Enquanto você não escolher, vale o padrão do ambiente: ligado em laboratório (LAB) e desligado em produção. Os números já registrados no histórico nunca são apagados pela reconstrução.",
      },
      {
        key: "analytics.rebuild.janela_reaplicacao_minutos",
        label: "Janela de busca dos eventos ocorridos durante a reconstrução (minutos)",
        type: "number",
        defaultValue: 60,
        helper: "De 1 a 1.440. Eventos aplicados nesse intervalo antes da fotografia da reconstrução são conferidos e recalculados depois da troca. Padrão: 60.",
      },
    ],
  },
];

const ALL_GROUPS = [...BI_GROUPS, ...BI_QUALIDADE_GROUPS, ...BI_OBRAS_GROUPS, ...BI_COMERCIAL_GROUPS, ...BI_LOCACAO_GROUPS, ...BI_JURIDICO_GROUPS, ...BI_DESEMPENHO_GROUPS, ...BI_DRILLDOWN_GROUPS, ...BI_FINANCEIRO_GROUPS, ...BI_FINANCEIRO_JANELAS_GROUPS, ...BI_FINANCEIRO_RESULTADOS_GROUPS, ...BI_CARGA_GROUPS, ...BI_SNAPSHOT_GROUPS, ...BI_ALERTAS_GROUPS];
const ALL_FIELDS = ALL_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.defaultValue;
  });
  return values;
}

export default function BiTab() {
  const [values, setValues] = useState(initialValues);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setForbidden(false);
    Promise.all([listSettings("analytics.")])
      .then((results) => {
        if (cancelled) return;
        const list = results.flatMap((data) => (Array.isArray(data) ? data : Object.values(data || {})));
        const next = initialValues();
        list.forEach((item) => {
          if (!item || !item.key || !Object.prototype.hasOwnProperty.call(next, item.key)) return;
          next[item.key] = item.value;
        });
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setError(err?.message || "Não foi possível carregar as configurações do BI.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const changed = ALL_FIELDS.filter((field) => values[field.key] !== original[field.key]);
      for (const field of changed) {
        await updateSetting(field.key, field.type === "number" ? Number(values[field.key]) : values[field.key]);
      }
      setOriginal(values);
      setSuccess("Configurações do BI salvas.");
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações do BI.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="BI e Centro de Comando">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações do BI.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="BI e Centro de Comando"
      subtitle="Regras de segurança e de uso dos painéis e indicadores desta empresa."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={loading}>
          Salvar
        </Button>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          {ALL_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    {field.type === "text" || field.type === "number" ? (
                      <FormField label={field.label} htmlFor={`bi-${field.key}`} helper={field.helper}>
                        <Input
                          id={`bi-${field.key}`}
                          type={field.type === "number" ? "number" : "text"}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValues((prev) => ({
                            ...prev,
                            [field.key]: field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value,
                          }))}
                        />
                      </FormField>
                    ) : (
                      <>
                        <Checkbox
                          id={`bi-${field.key}`}
                          label={field.label}
                          checked={Boolean(values[field.key])}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                        />
                        {field.helper ? <p>{field.helper}</p> : null}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="formGridFull">
            <h3>Como os valores aparecem nos painéis</h3>
            <p>Todo número do BI declara a natureza do valor e é desenhado de um jeito próprio, sem depender só da cor. Totais só somam valores da mesma natureza.</p>
            <NatureLegend />
          </div>
        </div>
      )}
    </Card>
  );
}
