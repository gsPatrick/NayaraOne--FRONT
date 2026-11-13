"use client";

// Uma categoria do livro (§13) em lista editável: preferências e flexíveis com peso; exclusões sem peso (eliminam).
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import { FEATURE_LABELS } from "@/lib/mock/properties";
import { PROPERTY_TYPE_LABELS } from "@/lib/radarMatching";
import { emptyItem, isKnownAttribute } from "@/lib/radarCriteria";
import styles from "./RadarCriteriaForm.module.css";

const OTHER = "__OUTRA__";

function AttributeFields({ fid, item, set, err, valueLabel }) {
  const known = !item.otherKey && isKnownAttribute(item.key);
  return (
    <>
      <FormField label="Característica" htmlFor={fid("key-choice")} error={item.otherKey ? undefined : err("key")}>
        <Select
          id={fid("key-choice")}
          value={item.otherKey ? OTHER : item.key}
          onChange={(e) => (e.target.value === OTHER ? set({ otherKey: true, key: "", value: "" }) : set({ otherKey: false, key: e.target.value, value: "true" }))}
        >
          <option value="">Escolha...</option>
          {Object.entries(FEATURE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          <option value={OTHER}>Outra (digitar o nome)</option>
        </Select>
      </FormField>
      {item.otherKey ? (
        <FormField label="Nome da característica" htmlFor={fid("key")} error={err("key")} helper="Ex.: acabamento, estilo, escada.">
          <Input id={fid("key")} value={item.key} onChange={(e) => set({ key: e.target.value })} />
        </FormField>
      ) : null}
      <FormField label={valueLabel} htmlFor={fid("value")} error={err("value")} required>
        {known ? (
          <Select id={fid("value")} value={item.value} onChange={(e) => set({ value: e.target.value })}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </Select>
        ) : (
          <Input id={fid("value")} value={item.value} placeholder="Ex.: alto padrão" onChange={(e) => set({ value: e.target.value })} />
        )}
      </FormField>
    </>
  );
}

function ItemFields({ group, index, item, options, weighted, onChange, onRemove, errors }) {
  const fid = (name) => `rd-${group}-${index}-${name}`;
  const err = (name) => errors[`${group}.${index}.${name}`];
  const set = (patch) => onChange({ ...item, ...patch });
  const option = options.find((o) => o.code === item.code) || options[0];
  return (
    <div className={styles.item} data-criteria-item={group}>
      <div className={styles.itemGrid}>
        <FormField label="Critério" htmlFor={fid("code")} error={err("code")}>
          <Select id={fid("code")} value={item.code} onChange={(e) => onChange({ ...emptyItem(group, e.target.value), uid: item.uid, ...(weighted ? { weight: item.weight } : {}) })}>
            {options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
          </Select>
        </FormField>

        {item.code === "ATTRIBUTE" ? (
          <AttributeFields fid={fid} item={item} set={set} err={err} valueLabel={group === "exclusions" ? "Valor recusado" : "Valor desejado"} />
        ) : item.code === "PROPERTY_TYPE" ? (
          <FormField label="Tipo recusado" htmlFor={fid("value")} error={err("value")} required>
            <Select id={fid("value")} value={item.value} onChange={(e) => set({ value: e.target.value })}>
              <option value="">Escolha...</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </FormField>
        ) : item.code === "NEIGHBORHOOD" ? (
          <FormField label="Bairro" htmlFor={fid("value")} error={err("value")} required>
            <Input id={fid("value")} value={item.value} onChange={(e) => set({ value: e.target.value })} />
          </FormField>
        ) : (
          <FormField label={item.code === "MAX_DISTANCE_KM" ? "Distância máxima (km)" : "Mínimo"} htmlFor={fid("value")} error={err("value")} required>
            <DecimalInput id={fid("value")} value={item.value} placeholder="0" maxDecimals={option.code === "MAX_DISTANCE_KM" ? 2 : 0} onChange={(e) => set({ value: e.target.value })} />
          </FormField>
        )}

        {item.code === "MAX_DISTANCE_KM" ? (
          <>
            <FormField label="Latitude do ponto" htmlFor={fid("lat")} error={err("lat")} required helper="Ex.: -22,9056">
              <DecimalInput id={fid("lat")} value={item.lat} allowNegative maxDecimals={7} onChange={(e) => set({ lat: e.target.value })} />
            </FormField>
            <FormField label="Longitude do ponto" htmlFor={fid("lng")} error={err("lng")} required helper="Ex.: -47,0608">
              <DecimalInput id={fid("lng")} value={item.lng} allowNegative maxDecimals={7} onChange={(e) => set({ lng: e.target.value })} />
            </FormField>
          </>
        ) : null}

        {weighted ? (
          <FormField label="Peso" htmlFor={fid("weight")} error={err("weight")} required helper="Quanto maior, mais conta no score.">
            <DecimalInput id={fid("weight")} value={item.weight} maxDecimals={2} onChange={(e) => set({ weight: e.target.value })} />
          </FormField>
        ) : null}
      </div>
      <div className={styles.itemActions}>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remover ${option.label.toLowerCase()} (item ${index + 1})`}>
          <Icon name="trash" size={14} /> Remover
        </Button>
      </div>
    </div>
  );
}

export default function RadarCriteriaList({ group, addLabel, emptyText, options, weighted, items, onChange, errors = {} }) {
  const update = (index, next) => onChange(items.map((it, i) => (i === index ? next : it)));
  const remove = (index) => onChange(items.filter((_, i) => i !== index));
  return (
    <div className={styles.listWrap} data-criteria-group={group}>
      {items.length === 0 ? <p className={styles.empty}>{emptyText}</p> : null}
      {items.map((item, index) => (
        <ItemFields
          key={item.uid}
          group={group}
          index={index}
          item={item}
          options={options}
          weighted={weighted}
          errors={errors}
          onChange={(next) => update(index, next)}
          onRemove={() => remove(index)}
        />
      ))}
      <div>
        <Button variant="secondary" size="sm" onClick={() => onChange([...items, emptyItem(group)])}>
          <Icon name="plus" size={14} /> {addLabel}
        </Button>
      </div>
    </div>
  );
}
