"use client";

import FormField from "@/components/molecules/FormField/FormField";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import Select from "@/components/atoms/Select/Select";
import Input from "@/components/atoms/Input/Input";
import { EVIDENCE_SOURCE_LABELS, EVIDENCE_FILE_SOURCES, EVIDENCE_NOTE_SOURCES } from "@/lib/changeEvidence";
import styles from "./ChangeEvidenceFields.module.css";

// Campos "Origem da alteração" (M9-D807): origem, comprovante e descrição. `value` = { source, note, file }; o pai guarda o estado e envia
// com buildChangeEvidence(value) no PATCH. A API só exige quando a alteração toca um campo crítico.
export default function ChangeEvidenceFields({ idPrefix = "evidence", value, onChange, errors = {} }) {
  const needsFile = EVIDENCE_FILE_SOURCES.includes(value.source);
  const needsNote = EVIDENCE_NOTE_SOURCES.includes(value.source);
  const patch = (next) => onChange({ ...value, ...next });
  return (
    <div className={styles.group}>
      <FormField
        label="Origem da alteração"
        htmlFor={`${idPrefix}-source`}
        helper="Obrigatória ao mudar CPF/CNPJ, nome, nascimento, matrícula, proprietário, conta bancária ou PIX: de onde veio a informação e qual documento a comprova."
        error={errors.source}
      >
        <Select id={`${idPrefix}-source`} value={value.source} onChange={(e) => patch({ source: e.target.value })}>
          <option value="">Não estou alterando dado crítico</option>
          {Object.entries(EVIDENCE_SOURCE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </Select>
      </FormField>
      {value.source ? (
        <>
          <FormField label={needsFile ? "Comprovante (obrigatório)" : "Comprovante (opcional)"} htmlFor={`${idPrefix}-file`} error={errors.file}>
            <FileDropInput
              id={`${idPrefix}-file`}
              accept=".pdf,.png,.jpg,.jpeg"
              fileNames={value.file ? [value.file.name] : []}
              onFiles={(files) => patch({ file: files[0] || null })}
              onRemove={() => patch({ file: null })}
            />
          </FormField>
          <FormField
            label={needsNote ? "Descrição da origem (mínimo 10 caracteres)" : "Descrição da origem (opcional)"}
            htmlFor={`${idPrefix}-note`}
            error={errors.note}
          >
            <Input id={`${idPrefix}-note`} value={value.note} onChange={(e) => patch({ note: e.target.value })} />
          </FormField>
        </>
      ) : null}
    </div>
  );
}
