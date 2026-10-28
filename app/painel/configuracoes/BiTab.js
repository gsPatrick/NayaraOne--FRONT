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
import styles from "./page.module.css";

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
        defaultValue: "Financeiro=finance:read; Comercial/Imóveis e Marketing/Atendimento=crm:opportunities:read; Locação e Jurídico=legal:read; Obras=construction:read; Estoque=inventory:read; Correspondente=correspondent:read; Tecnologia=analytics:read:tech",
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
    title: "Desempenho dos painéis",
    subtitle: "Meta de tempo de resposta dos painéis.",
    fields: [
      {
        key: "analytics.painel.p95_ms_padrao",
        label: "Meta p95 padrão do painel (milissegundos)",
        type: "number",
        defaultValue: 3000,
        helper: "Usada ao publicar um painel que não informa a própria meta. De 100 a 60.000.",
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
];

const ALL_FIELDS = BI_GROUPS.flatMap((group) => group.fields);

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

          {BI_GROUPS.map((group) => (
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
        </div>
      )}
    </Card>
  );
}
