"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import s from "../layout.module.css";

export default function Shell({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setDrawer(false);
      const tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "/" && !["input", "textarea", "select"].includes(tag)) {
        e.preventDefault();
        document.getElementById("busca-global")?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`${s.shell} ${collapsed ? s.collapsed : ""} ${drawer ? s.drawerOpen : ""}`}>
      <a href="#conteudo" className={s.skip}>Ir para o conteúdo</a>
      <Sidebar pathname={pathname} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onClose={() => setDrawer(false)} />
      {drawer && <div className={s.scrim} onClick={() => setDrawer(false)} aria-hidden="true" />}
      <div className={s.main}>
        <Topbar pathname={pathname} onMenu={() => setDrawer(true)} />
        <main id="conteudo" className={s.content}>{children}</main>
      </div>
    </div>
  );
}
