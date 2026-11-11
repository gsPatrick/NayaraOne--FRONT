"use client";

// Classificação do cadastro (Marco 3 §16 "Classifica qualidade do cadastro e documentos faltantes"): classe, nota de 0 a 100, notas de corte,
// campos faltantes, documentos exigidos com a situação e documentos pendentes do financiamento. Só leitura: corrigir é no cadastro da pessoa.
import Badge from "@/components/atoms/Badge/Badge";
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import { docStatus, qualityClass } from "./nayComercial.format.js";
import styles from "./page.module.css";

function TextList({ items, empty }) {
  if (!items || items.length === 0) return <p className={styles.empty}>{empty}</p>;
  return <ul className={styles.bullets}>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default function ClassificacaoCadastro({ data }) {
  if (!data) return null;
  const klass = qualityClass(data.classe);
  const cut = data.notasDeCorte || {};
  const docs = (data.documentos || []).map((d, i) => ({ id: `${d.exigido}-${i}`, ...d }));
  return (
    <Card title="Classificação do cadastro" subtitle="Sugestão da NAY para orientar o corretor. Corrigir o cadastro é com você, na tela de Contatos.">
      <dl className={styles.facts}>
        <div className={styles.fact}><dt>Classe</dt><dd><Badge tone={klass.tone}>{klass.label}</Badge></dd></div>
        <div className={styles.fact}><dt>Nota</dt><dd>{data.nota != null ? `${data.nota} de 100` : "Sem nota"}</dd></div>
        <div className={styles.fact}><dt>Notas de corte</dt><dd>{`Bom a partir de ${cut.bom ?? "não informado"}; regular a partir de ${cut.regular ?? "não informado"}`}</dd></div>
      </dl>
      <p className={styles.subTitle}>Campos faltantes</p>
      <TextList items={data.camposFaltantes} empty="Nenhum campo faltando no cadastro." />
      <p className={styles.subTitle}>Documentos exigidos</p>
      <Table
        rows={docs}
        emptyMessage="Nenhum documento exigido para este tipo de cadastro."
        columns={[
          { key: "exigido", label: "Documento" },
          { key: "situacao", label: "Situação", render: (r) => { const s = docStatus(r.situacao); return <Badge tone={s.tone}>{s.label}</Badge>; } },
        ]}
      />
      <p className={styles.subTitle}>Documentos faltantes</p>
      <TextList items={data.documentosFaltantes} empty="Nenhum documento faltando." />
      <p className={styles.subTitle}>Documentos pendentes do financiamento</p>
      <TextList items={data.documentosPendentesFinanciamento} empty="Nenhum documento pendente no financiamento." />
    </Card>
  );
}
