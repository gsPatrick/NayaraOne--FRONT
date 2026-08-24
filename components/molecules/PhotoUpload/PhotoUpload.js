"use client";

import { useRef } from "react";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./PhotoUpload.module.css";

export default function PhotoUpload({ name, value, onChange, size = "xl" }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.preview} onClick={() => inputRef.current?.click()}>
        <Avatar name={name} size={size} src={value} />
        <span className={styles.overlay}>
          <Icon name="upload" size={16} />
        </span>
      </button>
      <div className={styles.actions}>
        <button type="button" className={styles.link} onClick={() => inputRef.current?.click()}>
          {value ? "Trocar foto" : "Adicionar foto"}
        </button>
        {value ? (
          <button type="button" className={styles.linkDanger} onClick={() => onChange(null)}>
            Remover
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleFile} />
    </div>
  );
}
