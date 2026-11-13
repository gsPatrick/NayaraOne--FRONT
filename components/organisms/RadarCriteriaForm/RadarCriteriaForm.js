"use client";

// Formulário dos critérios do Radar nas quatro categorias do livro (Marco 3 §13): obrigatórios (finalidade, tipo, faixa de
// preço, cidade/UF, área), preferências com peso (bairro, quartos, suítes, vagas), flexíveis com peso (característica, distância)
// e exclusões (tipo de imóvel ou característica que o cliente não aceita). Controlado: `form` + `onChange(form)`; o payload sai
// de buildRadarCriteria (lib/radarCriteria.js). Usado na criação (radar/novo) e na edição (radar/[id]/editar).
import { useEffect, useRef, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Spinner from "@/components/atoms/Spinner/Spinner";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import { fetchAddressByCep } from "@/lib/cep";
import { PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import { PREFERENCE_OPTIONS, FLEXIBLE_OPTIONS, EXCLUSION_OPTIONS } from "@/lib/radarCriteria";
import RadarCriteriaList from "./RadarCriteriaList";
import styles from "./RadarCriteriaForm.module.css";

function formatCep(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function useCepLookup(onFound) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);
  const mountedRef = useRef(true);
  const onFoundRef = useRef(onFound);
  onFoundRef.current = onFound;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  function run(rawCep) {
    const digits = String(rawCep || "").replace(/\D/g, "");
    if (digits.length !== 8) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setMessage("");
    fetchAddressByCep(digits).then((result) => {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setLoading(false);
      if (result) onFoundRef.current(result);
      else setMessage("CEP não encontrado, preencha a cidade/UF manualmente.");
    });
  }

  function change(formatted) {
    setMessage("");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (formatted.replace(/\D/g, "").length === 8) debounceRef.current = window.setTimeout(() => run(formatted), 400);
  }

  function blur(value) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    run(value);
  }

  return { loading, message, change, blur };
}

export default function RadarCriteriaForm({ form, onChange, errors = {} }) {
  const formRef = useRef(form);
  formRef.current = form;
  const setField = (field, value) => onChange({ ...formRef.current, [field]: value });
  const cep = useCepLookup((found) => onChange({ ...formRef.current, city: found.city || formRef.current.city, state: found.state || formRef.current.state }));

  return (
    <>
      <Card title="Obrigatórios" className={styles.section}>
        <p className={styles.intro}>O imóvel só aparece no radar se atender a todos estes critérios.</p>
        <div className={styles.formGrid}>
          <FormField label="Tipo de imóvel" htmlFor="rd-type">
            <Select id="rd-type" value={form.propertyType} onChange={(e) => setField("propertyType", e.target.value)}>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormField>
          <FormField label="Finalidade" htmlFor="rd-offer-type">
            <Select id="rd-offer-type" value={form.offerType} onChange={(e) => setField("offerType", e.target.value)}>
              {Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormField>
          <FormField label="Preço mínimo (R$)" htmlFor="rd-min-price" error={errors.minPrice}>
            <DecimalInput id="rd-min-price" placeholder="0,00" maxDecimals={2} value={form.minPrice} onChange={(e) => setField("minPrice", e.target.value)} />
          </FormField>
          <FormField label="Preço máximo (R$)" htmlFor="rd-max-price" error={errors.maxPrice}>
            <DecimalInput id="rd-max-price" placeholder="0,00" maxDecimals={2} value={form.maxPrice} onChange={(e) => setField("maxPrice", e.target.value)} />
          </FormField>
          <div className={styles.span2}>
            <FormField label="CEP" htmlFor="rd-cep" helper={cep.message || "Opcional: preenche cidade/UF automaticamente. Deixe em branco para não filtrar."}>
              <div className={styles.cepField}>
                <Input
                  id="rd-cep"
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => { const formatted = formatCep(e.target.value); setField("cep", formatted); cep.change(formatted); }}
                  onBlur={(e) => cep.blur(e.target.value)}
                />
                {cep.loading ? <Spinner size="sm" className={styles.cepSpinner} /> : null}
              </div>
            </FormField>
          </div>
          <FormField label="Cidade" htmlFor="rd-city">
            <Input id="rd-city" placeholder="Preenchida pelo CEP" value={form.city} onChange={(e) => setField("city", e.target.value)} />
          </FormField>
          <FormField label="UF" htmlFor="rd-state">
            <Input id="rd-state" maxLength={2} placeholder="Preenchida pelo CEP" value={form.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="Área mínima (m²)" htmlFor="rd-min-area" error={errors.minAreaM2}>
            <DecimalInput id="rd-min-area" placeholder="0" maxDecimals={2} value={form.minAreaM2} onChange={(e) => setField("minAreaM2", e.target.value)} />
          </FormField>
          <FormField label="Área máxima (m²)" htmlFor="rd-max-area" error={errors.maxAreaM2}>
            <DecimalInput id="rd-max-area" placeholder="0" maxDecimals={2} value={form.maxAreaM2} onChange={(e) => setField("maxAreaM2", e.target.value)} />
          </FormField>
        </div>
      </Card>

      <Card title="Preferências" className={styles.section}>
        <p className={styles.intro}>Não eliminam o imóvel: cada preferência atendida soma o seu peso no score.</p>
        <RadarCriteriaList group="preferences" addLabel="Adicionar preferência" emptyText="Nenhuma preferência." options={PREFERENCE_OPTIONS} weighted items={form.preferences} errors={errors} onChange={(items) => setField("preferences", items)} />
      </Card>

      <Card title="Flexíveis" className={styles.section}>
        <p className={styles.intro}>Distância, estilo, acabamento: pontuam como as preferências, com o peso que você definir.</p>
        <RadarCriteriaList group="flexible" addLabel="Adicionar critério flexível" emptyText="Nenhum critério flexível." options={FLEXIBLE_OPTIONS} weighted items={form.flexible} errors={errors} onChange={(items) => setField("flexible", items)} />
      </Card>

      <Card title="Exclusões" className={styles.section}>
        <p className={styles.intro}>O que o cliente não aceita: imóvel que tiver qualquer um destes sai do radar.</p>
        <RadarCriteriaList group="exclusions" addLabel="Adicionar exclusão" emptyText="Nenhuma exclusão." options={EXCLUSION_OPTIONS} weighted={false} items={form.exclusions} errors={errors} onChange={(items) => setField("exclusions", items)} />
      </Card>
    </>
  );
}
