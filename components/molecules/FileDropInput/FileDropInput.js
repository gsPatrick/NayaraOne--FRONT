"use client";

import { useRef, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import Spinner from "@/components/atoms/Spinner/Spinner";
import styles from "./FileDropInput.module.css";

// Achado numa revisão visual do Front do Marco 6 (30/09/2026): todo upload de evidência do
// módulo (Change Order, Não Conformidade, RDO, documento do prestador) usava um
// `<input type="file">` cru, sem estilo nenhum e sem suporte a arrastar-e-soltar — visualmente
// destoante do resto do app. Componente único, reutilizado em todos esses pontos.
//
// fileNames: nomes já selecionados/enviados, exibidos como chips removíveis (onRemove opcional).
// onFiles recebe a FileList bruta (o caller decide se processa 1 ou todos os arquivos).
export default function FileDropInput({
  id,
  accept,
  multiple = false,
  uploading = false,
  error,
  helper,
  fileNames = [],
  onFiles,
  onRemove,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    onFiles?.(fileList);
  }

  return (
    <div className={styles.wrap}>
      <div
        className={[styles.dropzone, dragOver ? styles.dropzoneDragOver : "", error ? styles.dropzoneError : ""]
          .filter(Boolean)
          .join(" ")}
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !uploading) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!uploading) handleFiles(event.dataTransfer.files);
        }}
      >
        {uploading ? (
          <Spinner size="sm" />
        ) : (
          <Icon name="upload" size={22} />
        )}
        <span className={styles.dropzoneText}>
          {uploading ? "Enviando..." : "Arraste um arquivo aqui, ou clique para selecionar"}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className={styles.hiddenInput}
          disabled={uploading}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {fileNames.length > 0 ? (
        <ul className={styles.fileList}>
          {fileNames.map((name, index) => (
            <li key={`${name}-${index}`} className={styles.fileChip}>
              <Icon name="document" size={14} />
              <span className={styles.fileChipName}>{name}</span>
              {onRemove ? (
                <button
                  type="button"
                  className={styles.fileChipRemove}
                  aria-label={`Remover ${name}`}
                  onClick={() => onRemove(index)}
                >
                  <Icon name="close" size={12} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className={styles.errorText}>{error}</p> : helper ? <p className={styles.helperText}>{helper}</p> : null}
    </div>
  );
}
