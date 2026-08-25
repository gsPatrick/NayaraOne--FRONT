"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Icon from "@/components/atoms/Icon/Icon";
import styles from "./page.module.css";

const THEME_STORAGE_KEY = "nayara-one:theme";

const THEMES = [
  {
    id: "onyx",
    name: "Onyx (padrão)",
    description: "Botões, sidebar e destaques em preto, título em fonte serifada — visual padrão do sistema.",
    preview: { bg: "#F7F5F1", accent: "#0D0D0D", panel: "#0D0D0D" },
  },
  {
    id: "default",
    name: "Clássico",
    description: "Dourado como cor de destaque principal (CTAs, marca) — visual anterior ao padrão atual.",
    preview: { bg: "#F7F5F1", accent: "#BE9130", panel: "#17130F" },
  },
];

export default function ConfiguracoesPage() {
  const [theme, setTheme] = useState("onyx");

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    setTheme(stored === "default" ? "default" : "onyx");
  }, []);

  function applyTheme(id) {
    setTheme(id);
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
    if (id === "onyx") {
      document.documentElement.dataset.theme = "onyx";
    } else {
      delete document.documentElement.dataset.theme;
    }
  }

  return (
    <AppShell title="Configurações">
      <div className={styles.wrap}>
        <Card
          title="Aparência"
          subtitle="A cliente enviou referências visuais com mais preto na identidade — escolha aqui qual estilo usar. É possível voltar ao visual atual a qualquer momento."
        >
          <div className={styles.themeGrid}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={[styles.themeCard, theme === t.id ? styles.themeCardActive : ""].filter(Boolean).join(" ")}
                onClick={() => applyTheme(t.id)}
              >
                <span className={styles.themePreview} style={{ background: t.preview.bg }}>
                  <span className={styles.themePreviewPanel} style={{ background: t.preview.panel }} />
                  <span className={styles.themePreviewAccent} style={{ background: t.preview.accent }} />
                </span>
                <span className={styles.themeInfo}>
                  <span className={styles.themeName}>
                    {t.name}
                    {theme === t.id ? <Icon name="check" size={16} className={styles.themeCheck} /> : null}
                  </span>
                  <span className={styles.themeDescription}>{t.description}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
