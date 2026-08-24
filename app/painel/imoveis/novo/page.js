"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StepHeader from "@/components/organisms/StepHeader/StepHeader";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Icon from "@/components/atoms/Icon/Icon";
import Badge from "@/components/atoms/Badge/Badge";
import Spinner from "@/components/atoms/Spinner/Spinner";
import FormField from "@/components/molecules/FormField/FormField";
import MediaUploader from "@/components/molecules/MediaUploader/MediaUploader";
import LocationPicker from "@/components/molecules/LocationPicker/LocationPicker";
import PersonPicker from "@/components/molecules/PersonPicker/PersonPicker";
import { FEATURE_LABELS, REGULARIZATION_OPTIONS, OFFER_TYPE_LABELS, OWNER_ROLE_LABELS } from "@/lib/mock/properties";
import { fetchAddressByCep } from "@/lib/cep";
import { formatBRL } from "@/lib/format";
import { buildGoogleMapsUrl } from "@/lib/maps";
import styles from "./page.module.css";

const STEPS = [
  { id: "basico", label: "Informações básicas" },
  { id: "localizacao", label: "Localização" },
  { id: "caracteristicas", label: "Características" },
  { id: "documentacao", label: "Documentação" },
  { id: "midia", label: "Mídia" },
  { id: "oferta", label: "Oferta" },
  { id: "proprietarios", label: "Proprietários" },
  { id: "revisao", label: "Revisão" },
];

const EMPTY_OWNER = { name: "", personId: null, percentage: "", roleCode: "OWNER", validFrom: "", validUntil: "" };

const EMPTY_ADDRESS = {
  zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  latitude: "", longitude: "",
};

const EMPTY_FEATURES = {
  furnished: false, pool: false, concierge24h: false, petsFriendly: false, leisureArea: false,
  gym: false, elevator: false, barbecue: false, playground: false, airConditioning: false,
  solarPanels: false, constructionYear: "", coveredParkingSpots: "", uncoveredParkingSpots: "",
};

const EMPTY_DOCS = {
  registryNumber: "", registryOffice: "", iptuNumber: "", condoFee: "", regularizationStatus: "Regularizado",
};

export default function NovoImovelPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [basic, setBasic] = useState({
    internalCode: "", name: "", type: "Residencial", areaM2: "", bedrooms: "", parkingSpots: "",
    description: "",
  });
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS });
  const [features, setFeatures] = useState({ ...EMPTY_FEATURES });
  const [docs, setDocs] = useState({ ...EMPTY_DOCS });
  const [media, setMedia] = useState([]);
  const [offer, setOffer] = useState({
    offerType: "RENT", askingPrice: "", confidentialMinPrice: "", acceptsFinancing: false,
    acceptsTrade: false, status: "ACTIVE", validFrom: "", validUntil: "",
  });
  const [owners, setOwners] = useState([{ ...EMPTY_OWNER }]);

  // Autocomplete de endereço via CEP (BrasilAPI) — debounce a 8 dígitos + trigger no blur.
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
        setAddress((prev) => ({
          ...prev,
          street: result.street || prev.street,
          neighborhood: result.neighborhood || prev.neighborhood,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
        setCepMessage("");
      } else {
        setCepMessage("CEP não encontrado, preencha manualmente.");
      }
    });
  }

  function handleCepChange(value) {
    setAddress((prev) => ({ ...prev, zipCode: value }));
    setCepMessage("");
    if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      cepDebounceRef.current = window.setTimeout(() => runCepLookup(value), 400);
    }
  }

  function handleCepBlur(value) {
    if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    runCepLookup(value);
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  function updateOwner(index, field, value) {
    setOwners((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  function updateOwnerFields(index, patch) {
    setOwners((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function addOwner() {
    setOwners((prev) => [...prev, { ...EMPTY_OWNER }]);
  }

  function removeOwner(index) {
    setOwners((prev) => prev.filter((_, i) => i !== index));
  }

  function goNext() {
    if (isLast) {
      setSubmitting(true);
      // Shape mockado do payload final (nomenclatura alinhada ao schema confirmado).
      const payload = {
        internalCode: basic.internalCode,
        name: basic.name,
        type: basic.type,
        publicationStatus: "DRAFT",
        availabilityStatus: "AVAILABLE",
        areaM2: basic.areaM2,
        bedrooms: basic.bedrooms,
        parkingSpots: basic.parkingSpots,
        neighborhood: address.neighborhood,
        city: address.city,
        description: basic.description,
        address,
        features,
        documentation: docs,
        media,
        activeOffer: {
          offerType: offer.offerType,
          askingPrice: offer.askingPrice,
          confidentialMinPrice: offer.confidentialMinPrice,
          acceptsFinancing: offer.acceptsFinancing,
          acceptsTrade: offer.acceptsTrade,
          status: offer.status,
          validFrom: offer.validFrom || null,
          validUntil: offer.validUntil || null,
        },
        owners: owners.map((o) => ({
          name: o.name,
          personId: o.personId || null,
          percentage: o.percentage,
          roleCode: o.roleCode,
          validFrom: o.validFrom || null,
          validUntil: o.validUntil || null,
        })),
      };
      // eslint-disable-next-line no-console
      console.log("[mock] novo imóvel", payload);
      window.setTimeout(() => router.push("/painel/imoveis"), 500);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    if (isFirst) {
      router.push("/painel/imoveis");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const photoCount = media.filter((m) => m.type === "image").length;
  const videoCount = media.filter((m) => m.type === "video").length;
  const activeFeatures = Object.entries(features).filter(([key, value]) => FEATURE_LABELS[key] && value);

  // Percentual de preenchimento dos campos obrigatórios de cada etapa — exibido no hover do StepHeader.
  const stepCompletion = STEPS.map((s) => {
    if (s.id === "basico") return basic.name.trim() ? 100 : 0;
    if (s.id === "localizacao") {
      const required = [address.zipCode, address.city, address.street, address.neighborhood, address.state];
      const done = required.filter((v) => String(v || "").trim()).length;
      return Math.round((done / required.length) * 100);
    }
    if (s.id === "oferta") return offer.askingPrice ? 100 : 0;
    if (s.id === "proprietarios") return owners.some((o) => o.name.trim()) ? 100 : 0;
    return 100;
  });

  return (
    <AppShell title="Novo imóvel" backHref="/painel/imoveis">
      <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.stepHeaderWrap}>
          <StepHeader steps={STEPS} activeIndex={stepIndex} completion={stepCompletion} />
        </div>

        <Card className={styles.card}>
          {step.id === "basico" ? (
            <div className={styles.formGrid}>
              <div className={styles.span2}>
                <FormField label="Nome / referência do imóvel" htmlFor="n-name" required>
                  <Input
                    id="n-name"
                    placeholder="Ex.: Edifício Aurora — Apto 302"
                    value={basic.name}
                    onChange={(e) => setBasic({ ...basic, name: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Código interno" htmlFor="n-internal-code" helper="Código comercial usado internamente (ex.: AP-0231).">
                <Input
                  id="n-internal-code"
                  placeholder="Ex.: AP-0231"
                  value={basic.internalCode}
                  onChange={(e) => setBasic({ ...basic, internalCode: e.target.value })}
                />
              </FormField>
              <FormField label="Tipo" htmlFor="n-type">
                <Select id="n-type" value={basic.type} onChange={(e) => setBasic({ ...basic, type: e.target.value })}>
                  <option>Residencial</option>
                  <option>Comercial</option>
                  <option>Terreno</option>
                  <option>Rural</option>
                </Select>
              </FormField>
              <div className={styles.span2}>
                <div className={styles.featuresExtraGrid}>
                  <FormField label="Metragem (m²)" htmlFor="n-area">
                    <Input id="n-area" type="number" placeholder="0" value={basic.areaM2} onChange={(e) => setBasic({ ...basic, areaM2: e.target.value })} />
                  </FormField>
                  <FormField label="Dormitórios" htmlFor="n-bed">
                    <Input id="n-bed" type="number" placeholder="0" value={basic.bedrooms} onChange={(e) => setBasic({ ...basic, bedrooms: e.target.value })} />
                  </FormField>
                  <FormField label="Vagas" htmlFor="n-park">
                    <Input id="n-park" type="number" placeholder="0" value={basic.parkingSpots} onChange={(e) => setBasic({ ...basic, parkingSpots: e.target.value })} />
                  </FormField>
                </div>
              </div>
              <div className={styles.span2}>
                <FormField label="Descrição" htmlFor="n-desc">
                  <textarea
                    id="n-desc"
                    rows={4}
                    placeholder="Detalhes adicionais do imóvel..."
                    className={styles.textarea}
                    value={basic.description}
                    onChange={(e) => setBasic({ ...basic, description: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          ) : null}

          {step.id === "localizacao" ? (
            <div className={styles.formGrid}>
              <FormField label="CEP" htmlFor="n-zip" required helper={cepMessage || "Preenche o endereço automaticamente."}>
                <div className={styles.cepField}>
                  <Input
                    id="n-zip"
                    placeholder="00000-000"
                    value={address.zipCode}
                    onChange={(e) => handleCepChange(e.target.value)}
                    onBlur={(e) => handleCepBlur(e.target.value)}
                  />
                  {cepLoading ? <Spinner size="sm" className={styles.cepSpinner} /> : null}
                </div>
              </FormField>
              <FormField label="Cidade" htmlFor="n-addr-city" required>
                <Input id="n-addr-city" placeholder="Preenchida pelo CEP" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </FormField>
              <div className={styles.span2}>
                <FormField label="Logradouro" htmlFor="n-street" required>
                  <Input id="n-street" placeholder="Rua, avenida..." value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                </FormField>
              </div>
              <FormField label="Número" htmlFor="n-number">
                <Input id="n-number" placeholder="Nº" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
              </FormField>
              <FormField label="Complemento" htmlFor="n-complement">
                <Input id="n-complement" placeholder="Apto, bloco..." value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
              </FormField>
              <FormField label="Bairro" htmlFor="n-addr-neighborhood" required>
                <Input id="n-addr-neighborhood" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
              </FormField>
              <FormField label="UF" htmlFor="n-addr-state" required>
                <Input id="n-addr-state" maxLength={2} placeholder="SP" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
              </FormField>
              <div className={styles.span2}>
                <FormField label="Geolocalização" helper="O mapa segue o endereço digitado — clique nele para marcar o ponto exato, se precisar ajustar.">
                  <LocationPicker
                    address={address}
                    onPick={(lat, lng) => setAddress((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
                  />
                  <a
                    href={buildGoogleMapsUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mapLink}
                  >
                    <Icon name="mapPin" size={16} />
                    Abrir no Google Maps
                  </a>
                </FormField>
              </div>
            </div>
          ) : null}

          {step.id === "caracteristicas" ? (
            <div className={styles.featuresWrap}>
              <div className={styles.checkboxGrid}>
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <Checkbox
                    key={key}
                    id={`n-feat-${key}`}
                    label={label}
                    checked={features[key]}
                    onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
                  />
                ))}
              </div>
              <div className={styles.featuresExtraGrid}>
                <FormField label="Ano de construção" htmlFor="n-year">
                  <Input id="n-year" type="number" placeholder="Ex.: 2015" value={features.constructionYear} onChange={(e) => setFeatures({ ...features, constructionYear: e.target.value })} />
                </FormField>
                <FormField label="Vagas cobertas" htmlFor="n-park-covered">
                  <Input id="n-park-covered" type="number" placeholder="0" value={features.coveredParkingSpots} onChange={(e) => setFeatures({ ...features, coveredParkingSpots: e.target.value })} />
                </FormField>
                <FormField label="Vagas descobertas" htmlFor="n-park-uncovered">
                  <Input id="n-park-uncovered" type="number" placeholder="0" value={features.uncoveredParkingSpots} onChange={(e) => setFeatures({ ...features, uncoveredParkingSpots: e.target.value })} />
                </FormField>
              </div>
            </div>
          ) : null}

          {step.id === "documentacao" ? (
            <div className={styles.formGrid}>
              <FormField label="Matrícula" htmlFor="n-registry" helper="Número do registro do imóvel.">
                <Input id="n-registry" placeholder="Ex.: 84.320" value={docs.registryNumber} onChange={(e) => setDocs({ ...docs, registryNumber: e.target.value })} />
              </FormField>
              <FormField label="Cartório de registro" htmlFor="n-registry-office">
                <Input id="n-registry-office" placeholder="Ex.: 3º Cartório de Registro de Imóveis" value={docs.registryOffice} onChange={(e) => setDocs({ ...docs, registryOffice: e.target.value })} />
              </FormField>
              <FormField label="Número do IPTU" htmlFor="n-iptu">
                <Input id="n-iptu" placeholder="Ex.: 021.045.0123-4" value={docs.iptuNumber} onChange={(e) => setDocs({ ...docs, iptuNumber: e.target.value })} />
              </FormField>
              <FormField label="Valor do condomínio (R$)" htmlFor="n-condo">
                <Input id="n-condo" type="number" placeholder="0,00" value={docs.condoFee} onChange={(e) => setDocs({ ...docs, condoFee: e.target.value })} />
              </FormField>
              <div className={styles.span2}>
                <FormField label="Situação de regularização" htmlFor="n-reg-status">
                  <Select id="n-reg-status" value={docs.regularizationStatus} onChange={(e) => setDocs({ ...docs, regularizationStatus: e.target.value })}>
                    {REGULARIZATION_OPTIONS.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>
          ) : null}

          {step.id === "midia" ? (
            <MediaUploader items={media} onChange={setMedia} />
          ) : null}

          {step.id === "oferta" ? (
            <div className={styles.formGrid}>
              <FormField label="Tipo de oferta" htmlFor="n-offer-type">
                <Select id="n-offer-type" value={offer.offerType} onChange={(e) => setOffer({ ...offer, offerType: e.target.value })}>
                  {Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label={`Preço (R$${offer.offerType !== "SALE" ? "/mês" : ""})`} htmlFor="n-offer-price" required>
                <Input id="n-offer-price" type="number" placeholder="0,00" value={offer.askingPrice} onChange={(e) => setOffer({ ...offer, askingPrice: e.target.value })} />
              </FormField>
              <FormField
                label="Preço mínimo confidencial"
                htmlFor="n-offer-min-price"
                helper="Uso interno, nunca público."
              >
                <div className={styles.confidentialField}>
                  <Icon name="shield" size={14} className={styles.confidentialIcon} />
                  <Input
                    id="n-offer-min-price"
                    type="number"
                    placeholder="0,00"
                    value={offer.confidentialMinPrice}
                    onChange={(e) => setOffer({ ...offer, confidentialMinPrice: e.target.value })}
                  />
                </div>
              </FormField>
              <FormField label="Vigência inicial" htmlFor="n-offer-valid-from">
                <Input id="n-offer-valid-from" type="date" value={offer.validFrom} onChange={(e) => setOffer({ ...offer, validFrom: e.target.value })} />
              </FormField>
              <FormField label="Vigência final" htmlFor="n-offer-valid-until" helper="Opcional — deixe em branco se indeterminada.">
                <Input id="n-offer-valid-until" type="date" value={offer.validUntil} onChange={(e) => setOffer({ ...offer, validUntil: e.target.value })} />
              </FormField>
              <FormField label="Status inicial" htmlFor="n-offer-status">
                <Select id="n-offer-status" value={offer.status} onChange={(e) => setOffer({ ...offer, status: e.target.value })}>
                  <option value="ACTIVE">Ativa</option>
                  <option value="PAUSED">Pausada</option>
                  <option value="CLOSED">Encerrada</option>
                </Select>
              </FormField>
              <div className={styles.span2}>
                <Checkbox
                  id="n-offer-financing"
                  label="Aceita financiamento"
                  checked={offer.acceptsFinancing}
                  onChange={(e) => setOffer({ ...offer, acceptsFinancing: e.target.checked })}
                />
              </div>
              <div className={styles.span2}>
                <Checkbox
                  id="n-offer-trade"
                  label="Aceita permuta"
                  checked={offer.acceptsTrade}
                  onChange={(e) => setOffer({ ...offer, acceptsTrade: e.target.checked })}
                />
              </div>
            </div>
          ) : null}

          {step.id === "proprietarios" ? (
            <div className={styles.ownersWrap}>
              {owners.map((owner, index) => (
                <div className={styles.ownerCard} key={index}>
                  <div className={styles.ownerCardHeader}>
                    <span className={styles.ownerCardTitle}>Proprietário {index + 1}</span>
                    {owners.length > 1 ? (
                      <button type="button" className={styles.removeOwner} onClick={() => removeOwner(index)} aria-label="Remover proprietário">
                        <Icon name="trash" size={16} />
                      </button>
                    ) : null}
                  </div>

                  <div className={styles.ownerRow}>
                    <FormField label="Proprietário" htmlFor={`n-owner-name-${index}`} required>
                      <PersonPicker
                        id={`n-owner-name-${index}`}
                        value={owner.name}
                        personId={owner.personId}
                        onSelect={({ name, personId }) => updateOwnerFields(index, { name, personId })}
                      />
                    </FormField>
                    <FormField label="Papel" htmlFor={`n-owner-role-${index}`}>
                      <Select
                        id={`n-owner-role-${index}`}
                        value={owner.roleCode}
                        onChange={(e) => updateOwner(index, "roleCode", e.target.value)}
                      >
                        {Object.entries(OWNER_ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  <div className={styles.ownerSubRow}>
                    <FormField label="Percentual (%)" htmlFor={`n-owner-pct-${index}`}>
                      <Input
                        id={`n-owner-pct-${index}`}
                        type="number"
                        placeholder="100"
                        value={owner.percentage}
                        onChange={(e) => updateOwner(index, "percentage", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Vigência início" htmlFor={`n-owner-valid-from-${index}`}>
                      <Input
                        id={`n-owner-valid-from-${index}`}
                        type="date"
                        value={owner.validFrom}
                        onChange={(e) => updateOwner(index, "validFrom", e.target.value)}
                      />
                    </FormField>
                    <FormField label="Vigência fim" htmlFor={`n-owner-valid-until-${index}`}>
                      <Input
                        id={`n-owner-valid-until-${index}`}
                        type="date"
                        value={owner.validUntil}
                        onChange={(e) => updateOwner(index, "validUntil", e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={addOwner} className={styles.addOwnerBtn}>
                <Icon name="plus" size={14} /> Adicionar proprietário
              </Button>
            </div>
          ) : null}

          {step.id === "revisao" ? (
            <div className={styles.reviewWrap}>
              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Informações básicas</p>
                <p className={styles.reviewName}>{basic.name || "—"}</p>
                <p className={styles.reviewMeta}>Código interno: {basic.internalCode || "—"}</p>
                <p className={styles.reviewMeta}>
                  {basic.type} · {basic.areaM2 || "0"} m²
                  {basic.bedrooms ? ` · ${basic.bedrooms} dorm.` : ""}
                  {basic.parkingSpots ? ` · ${basic.parkingSpots} vaga(s)` : ""}
                </p>
                <p className={styles.reviewMeta}>{address.neighborhood || "—"}, {address.city || "—"}</p>
              </div>

              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Localização</p>
                <p className={styles.reviewMeta}>
                  {address.street || "—"}{address.number ? `, ${address.number}` : ""}
                  {address.complement ? ` — ${address.complement}` : ""}
                </p>
                <p className={styles.reviewMeta}>{address.neighborhood || "—"}, {address.city || "—"} {address.state ? `— ${address.state}` : ""}</p>
                <p className={styles.reviewMeta}>CEP {address.zipCode || "—"}</p>
              </div>

              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Características</p>
                {activeFeatures.length > 0 ? (
                  <div className={styles.reviewChips}>
                    {activeFeatures.map(([key]) => (
                      <Badge tone="neutral" key={key}>{FEATURE_LABELS[key]}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className={styles.reviewMeta}>Nenhuma comodidade selecionada.</p>
                )}
                <p className={styles.reviewMeta}>
                  {features.constructionYear ? `Construído em ${features.constructionYear}` : "Ano de construção não informado"}
                  {features.coveredParkingSpots ? ` · ${features.coveredParkingSpots} vaga(s) coberta(s)` : ""}
                  {features.uncoveredParkingSpots ? ` · ${features.uncoveredParkingSpots} vaga(s) descoberta(s)` : ""}
                </p>
              </div>

              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Documentação</p>
                <p className={styles.reviewMeta}>Matrícula {docs.registryNumber || "—"} {docs.registryOffice ? `— ${docs.registryOffice}` : ""}</p>
                <p className={styles.reviewMeta}>IPTU {docs.iptuNumber || "—"} · Condomínio {docs.condoFee ? formatBRL(Number(docs.condoFee)) : "—"}</p>
                <Badge tone={docs.regularizationStatus === "Regularizado" ? "success" : "warning"}>{docs.regularizationStatus}</Badge>
              </div>

              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Mídia</p>
                <p className={styles.reviewMeta}>{photoCount} foto(s), {videoCount} vídeo(s) selecionados</p>
              </div>

              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Oferta</p>
                <div className={styles.reviewOfferRow}>
                  <span className={styles.reviewPrice}>
                    {offer.askingPrice ? formatBRL(Number(offer.askingPrice)) : "—"}
                    {offer.offerType !== "SALE" ? <span className={styles.reviewPriceSuffix}>/mês</span> : null}
                  </span>
                  <Badge tone={offer.status === "ACTIVE" ? "success" : offer.status === "PAUSED" ? "warning" : "neutral"}>
                    {offer.status === "ACTIVE" ? "Ativa" : offer.status === "PAUSED" ? "Pausada" : "Encerrada"}
                  </Badge>
                </div>
                <p className={styles.reviewMeta}>{OFFER_TYPE_LABELS[offer.offerType]}</p>
                <p className={styles.reviewMeta}>
                  Preço mínimo confidencial: {offer.confidentialMinPrice ? formatBRL(Number(offer.confidentialMinPrice)) : "—"} (uso interno)
                </p>
                <p className={styles.reviewMeta}>
                  {offer.acceptsFinancing ? "Aceita financiamento" : "Não financia"} · {offer.acceptsTrade ? "Aceita permuta" : "Sem permuta"}
                </p>
                <p className={styles.reviewMeta}>
                  Vigência: {offer.validFrom || "—"} {offer.validUntil ? `até ${offer.validUntil}` : "(indeterminada)"}
                </p>
              </div>
              <div className={styles.reviewSection}>
                <p className={styles.reviewTitle}>Proprietários</p>
                {owners.map((o, i) => (
                  <p className={styles.reviewMeta} key={i}>
                    {o.name || "—"} — {o.percentage || "0"}% · {OWNER_ROLE_LABELS[o.roleCode] || o.roleCode}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <Button variant="secondary" size="sm" onClick={goBack}>
            {isFirst ? "Cancelar" : "Voltar"}
          </Button>
          <Button size="sm" onClick={goNext} loading={submitting}>
            {isLast ? "Criar imóvel" : "Continuar"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
