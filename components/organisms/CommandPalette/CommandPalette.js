"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Icon from "@/components/atoms/Icon/Icon";
import { SEARCH_INDEX } from "@/app/painel/_search";
import styles from "./CommandPalette.module.css";

const DEFAULT_RESULTS = SEARCH_INDEX.filter((item) => item.group === "Módulos");

export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEFAULT_RESULTS;
    return SEARCH_INDEX.filter(
      (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = results[activeIndex];
        if (item) {
          onClose();
          router.push(item.href);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, results, activeIndex, onClose, router]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.panel} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.searchRow}>
          <Icon name="search" size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar em todo o sistema — imóveis, pessoas, contratos..."
            aria-label="Busca"
          />
          <kbd className={styles.esc}>esc</kbd>
        </div>

        <div className={styles.results}>
          {results.length === 0 ? (
            <p className={styles.empty}>Nenhum resultado para &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul className={styles.list} role="listbox">
              {results.map((item, index) => (
                <li key={item.href + item.label}>
                  <button
                    type="button"
                    className={[styles.item, index === activeIndex ? styles.active : ""]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onClose();
                      router.push(item.href);
                    }}
                    role="option"
                    aria-selected={index === activeIndex}
                  >
                    <span className={styles.itemIcon}>
                      <Icon name={item.icon} size={16} />
                    </span>
                    <span className={styles.itemLabel}>{item.label}</span>
                    <span className={styles.itemSection}>{item.group}</span>
                    <Icon name="chevronRight" size={14} className={styles.itemArrow} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
