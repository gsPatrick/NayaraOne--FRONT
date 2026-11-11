"use client";

// Seção "Rascunho de descrição de imóvel" (Guia §12 "Não invente metragem, acabamento, localização ou benefício"): a NAY redige só com os
// fatos públicos aprovados do imóvel e a guarda retira o que o cadastro não sustenta. É rascunho: publicar é com o corretor, na ficha do imóvel.
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Alert from "@/components/molecules/Alert/Alert";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import NayAnswer from "./NayAnswer";
import { useNayRun } from "./useNayRun";
import { TASKS, descriptionGuardIssues } from "./nayComercial.format.js";
import styles from "./page.module.css";

function Guarda({ structured }) {
  const issues = descriptionGuardIssues(structured);
  const facts = structured?.atributos || [];
  return (
    <>
      {facts.length ? (
        <>
          <p className={styles.subTitle}>Fatos do cadastro usados</p>
          <ul className={styles.bullets}>{facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </>
      ) : null}
      {issues.length ? (
        <>
          <Alert tone="warning" title="A guarda tirou trechos do rascunho">
            {structured?.guardaDescricao?.substituidaPeloTextoDosFatos ? "O texto foi trocado pelo texto montado só com os fatos do cadastro." : "Os trechos abaixo não estão no cadastro do imóvel e ficaram de fora."}
          </Alert>
          <ul className={styles.bullets}>
            {issues.map((issue, i) => <li key={`${issue.label}-${i}`}>{issue.trecho ? `${issue.label}: “${issue.trecho}”` : issue.label}</li>)}
          </ul>
        </>
      ) : null}
      <Alert tone="info" title="É só um rascunho">Nada foi publicado. Se quiser usar, revise e salve você na ficha do imóvel.</Alert>
    </>
  );
}

export default function DescricaoImovelSection({ properties }) {
  const nay = useNayRun({ notFound: "Imóvel não encontrado na sua empresa." });
  const [propertyId, setPropertyId] = useState("");

  return (
    <Card title="Rascunho de descrição de imóvel" subtitle="A NAY escreve só com os fatos públicos aprovados do imóvel. Ela não publica nem altera o anúncio.">
      <div className={styles.toolbar}>
        <FormField label="Imóvel" htmlFor="nay-property" className={styles.field}>
          <Select id="nay-property" value={propertyId} onChange={(e) => { nay.reset(); setPropertyId(e.target.value); }}>
            <option value="">Selecionar…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{[p.internalCode, p.name || "Imóvel sem título"].filter(Boolean).join(" — ")}</option>)}
          </Select>
        </FormField>
        <Button size="sm" variant="secondary" disabled={!propertyId} loading={nay.status === "loading"} onClick={() => nay.run(TASKS.PROPERTY, { propertyId })}>
          Rascunho de descrição
        </Button>
      </div>
      {properties.length === 0 ? <p className={styles.empty}>Nenhum imóvel disponível para escolher.</p> : null}
      <NayAnswer state={nay} title="Rascunho de descrição">
        {(result) => <Guarda structured={result.structured} />}
      </NayAnswer>
    </Card>
  );
}
