"use client";

import { useEffect, useState } from "react";
import AppSidebar from "@/components/organisms/AppSidebar/AppSidebar";
import AppHeader from "@/components/organisms/AppHeader/AppHeader";
import MobileTabBar from "@/components/organisms/MobileTabBar/MobileTabBar";
import CommandPalette from "@/components/organisms/CommandPalette/CommandPalette";
import styles from "./AppShell.module.css";

const STORAGE_KEY = "nayara-one:sidebar-collapsed";
const THEME_STORAGE_KEY = "nayara-one:theme";

export default function AppShell({ title, backHref, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === "onyx") document.documentElement.dataset.theme = "onyx";
    setReady(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      const isCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCombo) {
        event.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className={[styles.shell, ready ? "" : styles.noTransition].filter(Boolean).join(" ")}>
      <AppSidebar collapsed={collapsed} onToggle={toggle} />
      <div className={styles.main}>
        <AppHeader title={title} backHref={backHref} onOpenSearch={() => setSearchOpen(true)} />
        <main className={styles.content}>{children}</main>
      </div>
      <MobileTabBar />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
