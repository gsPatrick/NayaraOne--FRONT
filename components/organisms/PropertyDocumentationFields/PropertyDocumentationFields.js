"use client";

import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput";
import { REGULARIZATION_OPTIONS } from "@/lib/mock/properties";
import { DOCUMENT_TYPE_LABELS } from "@/lib/properties/documentPlan";
import styles from "./PropertyDocumentationFields.module.css";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

// Bloco "Documentação" do cadastro e da edição do imóvel (Marco 3 §6, verificação de 11/11/2026): cada documento é o ARQUIVO
// real (enviado e examinado pelo antivírus na API) com os dados que o identificam. Dado sem arquivo não é salvo — a tela avisa.
// `existingDocuments` (edição): mostra o arquivo já anexado; sem arquivo novo, o salvamento reaproveita o atual.
export default function PropertyDocumentationFields({ idPrefix, docs, onDocsChange, files = {}, onFilesChange, existingDocuments = [], error }) {
  const set = (patch) => onDocsChange({ ...docs, ...patch });
  const setFile = (type, file) => onFilesChange({ ...files, [type]: file || null });

  function fileField(type) {
    const current = existingDocuments.filter((d) => d.documentType === type && d.fileId).pop();
    const chosen = files[type];
    return (
      <FormField label={`Arquivo — ${DOCUMENT_TYPE_LABELS[type]}`} htmlFor={`${idPrefix}-file-${type}`}>
        <FileDropInput
          id={`${idPrefix}-file-${type}`}
          ariaLabel={`Arquivo do documento ${DOCUMENT_TYPE_LABELS[type]}`}
          accept={ACCEPT}
          helper="PDF ou imagem. O arquivo passa pelo antivírus ao enviar."
          fileNames={chosen ? [chosen.name] : []}
          onFiles={(list) => setFile(type, list[0])}
          onRemove={() => setFile(type, null)}
        />
        <p className={styles.attached}>
          {chosen ? "Novo arquivo será enviado ao salvar." : current ? "Arquivo já anexado (mantido se nenhum novo for escolhido)." : "Sem arquivo anexado."}
        </p>
      </FormField>
    );
  }

  return (
    <div className={styles.grid}>
      <p className={styles.intro}>
        Cada documento é salvo com o arquivo. A publicação só aceita os documentos obrigatórios que tiverem arquivo anexado.
      </p>
      {error ? <p className={`${styles.span2} ${styles.error}`} role="alert">{error}</p> : null}
      <FormField label="Matrícula" htmlFor={`${idPrefix}-registry`} helper="Número do registro do imóvel.">
        <Input id={`${idPrefix}-registry`} placeholder="Ex.: 84.320" value={docs.registryNumber} onChange={(e) => set({ registryNumber: e.target.value })} />
      </FormField>
      <FormField label="Cartório de registro" htmlFor={`${idPrefix}-registry-office`}>
        <Input id={`${idPrefix}-registry-office`} placeholder="Ex.: 3º Cartório de Registro de Imóveis" value={docs.registryOffice} onChange={(e) => set({ registryOffice: e.target.value })} />
      </FormField>
      <div className={styles.span2}>{fileField("REGISTRY")}</div>
      <FormField label="Número do IPTU" htmlFor={`${idPrefix}-iptu`}>
        <Input id={`${idPrefix}-iptu`} placeholder="Ex.: 021.045.0123-4" value={docs.iptuNumber} onChange={(e) => set({ iptuNumber: e.target.value })} />
      </FormField>
      {fileField("IPTU")}
      <FormField label="Valor do condomínio (R$)" htmlFor={`${idPrefix}-condo`}>
        <DecimalInput id={`${idPrefix}-condo`} placeholder="0,00" value={docs.condoFee} onChange={(e) => set({ condoFee: e.target.value })} />
      </FormField>
      {fileField("CONDO_FEE")}
      <FormField label="Situação de regularização" htmlFor={`${idPrefix}-reg-status`}>
        <Select id={`${idPrefix}-reg-status`} value={docs.regularizationStatus} onChange={(e) => set({ regularizationStatus: e.target.value })}>
          <option value="">Não informada</option>
          {REGULARIZATION_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
      </FormField>
      {fileField("REGULARIZATION_CERTIFICATE")}
    </div>
  );
}
