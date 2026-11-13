"use client";

import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Card from "@/components/molecules/Card/Card";
import Modal from "@/components/organisms/Modal/Modal";
import { CART_STATUS_LABELS, CART_STATUS_TONE, publicCartUrl, clicksByProperty, selectionError } from "@/lib/crm/carts";
import { formatDateTime } from "@/lib/format";
import CartPropertyPicker from "./CartPropertyPicker";
import styles from "./page.module.css";

// Um carrinho da oportunidade: validade, link público (gerar e copiar), imóveis da versão enviada com os cliques de cada um,
// visualizações, histórico de versões e troca dos imóveis (nova versão; a anterior fica guardada).
export default function CartCard({ cart, properties, onUpdateItems, onShare, busy }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = cart.shareLink ? publicCartUrl(origin, cart.shareLink.token) : "";
  const rows = clicksByProperty(cart);
  const t = cart.tracking || { views: 0, clicks: 0 };

  function openEdit() {
    const current = cart.versions.find((v) => v.versionNumber === cart.currentVersion);
    setSelected((current?.properties || []).map((p) => p.id));
    setError("");
    setEditing(true);
  }

  async function saveEdit() {
    const problem = selectionError(selected);
    if (problem) { setError(problem); return; }
    const ok = await onUpdateItems(cart.id, selected);
    if (ok) setEditing(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar: selecione o endereço e copie manualmente.");
    }
  }

  return (
    <Card title={`Carrinho · versão ${cart.currentVersion}`}>
      <div className={styles.cartHead}>
        <Badge tone={CART_STATUS_TONE[cart.status] || "neutral"}>{CART_STATUS_LABELS[cart.status] || cart.status}</Badge>
        <p className={styles.meta}>Válido até {formatDateTime(cart.expiresAt)} · criado em {formatDateTime(cart.createdAt)}</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><p className={styles.statValue}>{t.views}</p><p className={styles.statLabel}>Visualizações do link</p></div>
        <div className={styles.stat}><p className={styles.statValue}>{t.clicks}</p><p className={styles.statLabel}>Cliques em imóveis</p></div>
        <div className={styles.stat}><p className={styles.statValue}>{t.lastViewedAt ? formatDateTime(t.lastViewedAt) : "Ainda não aberto"}</p><p className={styles.statLabel}>Última visualização</p></div>
      </div>

      <p className={styles.meta}>Imóveis enviados nesta versão:</p>
      <ul className={styles.list}>
        {rows.map((p) => <li key={p.id}>{p.title || "Imóvel removido"}{p.internalCode ? ` (${p.internalCode})` : ""} — {p.clicks} clique(s)</li>)}
      </ul>

      {cart.shareLink ? (
        <div className={styles.link}>
          <span className={styles.linkText}>{url}</span>
          <Button size="sm" variant="secondary" onClick={copy}>{copied ? "Copiado" : "Copiar link"}</Button>
        </div>
      ) : null}

      {error && !editing ? <p className={styles.meta} role="alert">{error}</p> : null}

      <div className={styles.actions}>
        {!cart.shareLink && cart.status === "ACTIVE" ? <Button size="sm" loading={busy} onClick={() => onShare(cart.id)}>Gerar link para o cliente</Button> : null}
        {cart.status === "ACTIVE" ? <Button size="sm" variant="secondary" onClick={openEdit}>Alterar imóveis</Button> : null}
      </div>

      {cart.versions.length > 1 ? (
        <details className={styles.versions}>
          <summary>Histórico de versões ({cart.versions.length})</summary>
          <ul className={styles.list}>
            {cart.versions.map((v) => (
              <li key={v.versionNumber}>
                Versão {v.versionNumber} ({formatDateTime(v.createdAt)}): {v.properties.map((p) => p.title || "Imóvel removido").join(", ")}
                {t.viewsByVersion && t.viewsByVersion[v.versionNumber] ? ` — vista ${t.viewsByVersion[v.versionNumber]} vez(es)` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Alterar imóveis do carrinho"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button loading={busy} onClick={saveEdit}>Salvar nova versão</Button>
          </>
        }
      >
        <p className={styles.meta}>Salvar cria a versão {cart.currentVersion + 1}; a versão atual fica guardada para saber o que já foi enviado.</p>
        {error ? <p className={styles.meta} role="alert">{error}</p> : null}
        <CartPropertyPicker idPrefix={`cart-${cart.id}`} properties={properties} selected={selected} onChange={setSelected} />
      </Modal>
    </Card>
  );
}
