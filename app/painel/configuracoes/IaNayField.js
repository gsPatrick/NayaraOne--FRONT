"use client";

// Um campo da aba IA NAY: texto/número (Input), lista de opções (Select, tipo "enum") ou liga/desliga (Checkbox).
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import FormField from "@/components/molecules/FormField/FormField";

export default function IaNayField({ field, value, onChange }) {
  const id = `ia-nay-${field.key}`;
  if (field.type === "enum") {
    return (
      <FormField label={field.label} htmlFor={id} helper={field.helper}>
        <Select id={id} value={value ?? field.defaultValue} onChange={(e) => onChange(e.target.value)}>
          {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </FormField>
    );
  }
  if (field.type === "text" || field.type === "integer" || field.type === "decimal") {
    return (
      <FormField label={field.label} htmlFor={id} helper={field.helper}>
        <Input
          id={id}
          inputMode={field.type === "integer" ? "numeric" : field.type === "decimal" ? "decimal" : undefined}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </FormField>
    );
  }
  return (
    <>
      <Checkbox id={id} label={field.label} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      {field.helper ? <p>{field.helper}</p> : null}
    </>
  );
}
