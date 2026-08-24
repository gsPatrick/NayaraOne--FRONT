"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Spinner from "@/components/atoms/Spinner/Spinner";
import FormField from "@/components/molecules/FormField/FormField";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import { fetchAddressByCep } from "@/lib/cep";
import { PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import styles from "./page.module.css";

function formatCep(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export default function NovoRadarPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState(null);
  const [errors, setErrors] = useState({});

  const [criteria, setCriteria] = useState({
    propertyType: "RESIDENTIAL",
    offerType: "RENT",
    minPrice: "",
    maxPrice: "",
    cep: "",
    city: "",
    state: "",
    minAreaM2: "",
    maxAreaM2: "",
  });

  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const cepRequestIdRef = useRef(0);
  const cepDebounceRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    };
  }, []);

  function runCepLookup(rawCep) {
    const digits = String(rawCep || "").replace(/\D/g, "");
    if (digits.length !== 8) return;
    const requestId = ++cepRequestIdRef.current;
    setCepLoading(true);
    setCepMessage("");
    fetchAddressByCep(digits).then((result) => {
      if (!mountedRef.current || requestId !== cepRequestIdRef.current) return;
      setCepLoading(false);
      if (result) {
        setCriteria((prev) => ({
          ...prev,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
        setCepMessage("");
      } else {
        setCepMessage("CEP não encontrado, preencha a cidade/UF manualmente.");
      }
    });
  }

  function setField(field, value) {
    setCriteria((prev) => ({ ...prev, [field]: value }));
  }

  function handleCepChange(value) {
    const formatted = formatCep(value);
    setCriteria((prev) => ({ ...prev, cep: formatted }));
    setCepMessage("");
    if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      cepDebounceRef.current = window.setTimeout(() => runCepLookup(formatted), 400);
    }
  }

  function handleCepBlur(value) {
    if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    runCepLookup(value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!personId) nextErrors.person = "Selecione um contato já cadastrado.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    // Shape mockado do payload — nomenclatura alinhada a crm.property_radars.criteria_json.
    const payload = {
      personId,
      opportunityId: null,
      status: "ACTIVE",
      criteriaJson: {
        propertyType: criteria.propertyType,
        offerType: criteria.offerType,
        minPrice: criteria.minPrice ? Number(criteria.minPrice) : null,
        maxPrice: criteria.maxPrice ? Number(criteria.maxPrice) : null,
        city: criteria.city || null,
        state: criteria.state || null,
        minAreaM2: criteria.minAreaM2 ? Number(criteria.minAreaM2) : null,
        maxAreaM2: criteria.maxAreaM2 ? Number(criteria.maxAreaM2) : null,
      },
    };
    // eslint-disable-next-line no-console
    console.log("[mock] novo radar", payload);
    window.setTimeout(() => router.push("/painel/radar"), 500);
  }

  return (
    <AppShell title="Novo radar" backHref="/painel/radar">
      <div className={styles.wrap}>
        <form onSubmit={handleSubmit}>
          <Card title="Cliente" className={styles.section}>
            <FormField label="Contato (comprador/locatário)" htmlFor="rd-person" required error={errors.person}>
              <PersonPicker
                id="rd-person"
                value={personName}
                personId={personId}
                placeholder="Buscar contato pelo nome..."
                onSelect={({ name, personId: pid }) => {
                  setPersonName(name);
                  setPersonId(pid);
                }}
              />
            </FormField>
          </Card>

          <Card title="Critérios de busca" className={styles.section}>
            <div className={styles.formGrid}>
              <FormField label="Tipo de imóvel" htmlFor="rd-type">
                <Select id="rd-type" value={criteria.propertyType} onChange={(e) => setField("propertyType", e.target.value)}>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Finalidade" htmlFor="rd-offer-type">
                <Select id="rd-offer-type" value={criteria.offerType} onChange={(e) => setField("offerType", e.target.value)}>
                  {Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Preço mínimo (R$)" htmlFor="rd-min-price">
                <Input id="rd-min-price" type="number" placeholder="0" value={criteria.minPrice} onChange={(e) => setField("minPrice", e.target.value)} />
              </FormField>
              <FormField label="Preço máximo (R$)" htmlFor="rd-max-price">
                <Input id="rd-max-price" type="number" placeholder="0" value={criteria.maxPrice} onChange={(e) => setField("maxPrice", e.target.value)} />
              </FormField>
              <div className={styles.span2}>
                <FormField
                  label="CEP"
                  htmlFor="rd-cep"
                  helper={cepMessage || "Opcional — preenche cidade/UF automaticamente. Deixe em branco para não filtrar."}
                >
                  <div className={styles.cepField}>
                    <Input
                      id="rd-cep"
                      placeholder="00000-000"
                      value={criteria.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      onBlur={(e) => handleCepBlur(e.target.value)}
                    />
                    {cepLoading ? <Spinner size="sm" className={styles.cepSpinner} /> : null}
                  </div>
                </FormField>
              </div>
              <FormField label="Cidade" htmlFor="rd-city">
                <Input id="rd-city" placeholder="Preenchida pelo CEP" value={criteria.city} onChange={(e) => setField("city", e.target.value)} />
              </FormField>
              <FormField label="UF" htmlFor="rd-state">
                <Input id="rd-state" maxLength={2} placeholder="Preenchida pelo CEP" value={criteria.state} onChange={(e) => setField("state", e.target.value.toUpperCase())} />
              </FormField>
              <FormField label="Área mínima (m²)" htmlFor="rd-min-area">
                <Input id="rd-min-area" type="number" placeholder="0" value={criteria.minAreaM2} onChange={(e) => setField("minAreaM2", e.target.value)} />
              </FormField>
              <FormField label="Área máxima (m²)" htmlFor="rd-max-area">
                <Input id="rd-max-area" type="number" placeholder="0" value={criteria.maxAreaM2} onChange={(e) => setField("maxAreaM2", e.target.value)} />
              </FormField>
            </div>
          </Card>

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" href="/painel/radar">Cancelar</Button>
            <Button type="submit" loading={submitting}>Salvar radar</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
