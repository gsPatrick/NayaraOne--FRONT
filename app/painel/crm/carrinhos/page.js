"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Card from "@/components/molecules/Card/Card";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import CrmNavMenu from "@/components/molecules/CrmNavMenu/CrmNavMenu";
import Modal from "@/components/organisms/Modal/Modal";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listOpportunities } from "@/lib/api/crm";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { listOpportunityCarts, createCart, updateCartItems, generateCartShareLink } from "@/lib/api/carts";
import { selectionError } from "@/lib/crm/carts";
import { dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE } from "@/lib/format";
import CartCard from "./CartCard";
import CartPropertyPicker from "./CartPropertyPicker";
import styles from "./page.module.css";

// Carrinho de imóveis da oportunidade (livro do Marco 3 §14; verificação de 11/11/2026: não havia tela). O corretor escolhe a
// oportunidade, seleciona os imóveis, gera o link com validade (padrão da empresa em Configurações > Imóveis e CRM) e acompanha
// o rastreio (visualizações e cliques). Cada troca de imóveis cria uma versão nova: dá para saber o que foi enviado.
export default function CarrinhosPage() {
  const [opportunityId, setOpportunityId] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState([]);
  const [expiresOn, setExpiresOn] = useState("");
  const [expiresInvalid, setExpiresInvalid] = useState(false);
  const [carts, setCarts] = useState([]);

  const base = useAsyncState(async () => {
    const [opportunities, properties, people] = await Promise.all([listOpportunities(), listProperties(), listPeople()]);
    return { opportunities, properties, people: people || [] };
  }, { key: "crm:carrinhos:base", isEmpty: () => false });

  // Atalho da oportunidade (?oportunidade=<id>) para abrir já filtrado.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("oportunidade");
    if (fromUrl) setOpportunityId(fromUrl);
  }, []);

  const cartsQuery = useAsyncState(async () => {
    const data = await listOpportunityCarts(opportunityId);
    setCarts(data);
    return data;
  }, { deps: [opportunityId], enabled: Boolean(opportunityId), isEmpty: (d) => !d || d.length === 0 });

  const label = useMemo(() => {
    const people = base.data?.people || [];
    return (o) => `${people.find((p) => p.id === o.personId)?.legalName || "Cliente sem nome"} · ${o.nextAction || "sem próxima ação"}`;
  }, [base.data]);

  async function run(fn, fallback) {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      return true;
    } catch (err) {
      setActionError(err?.message || fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function reloadCarts() {
    setCarts(await listOpportunityCarts(opportunityId));
  }

  async function handleCreate() {
    const problem = selectionError(selected);
    if (problem) { setActionError(problem); return; }
    if (expiresInvalid) { setActionError(DATE_INPUT_ERROR_MESSAGE); return; }
    const ok = await run(async () => {
      await createCart(opportunityId, { propertyIds: selected, expiresAt: expiresOn ? dateOnlyInputToIso(expiresOn) : undefined });
      await reloadCarts();
    }, "Não foi possível criar o carrinho.");
    if (ok) { setCreating(false); setSelected([]); setExpiresOn(""); }
  }

  const handleUpdateItems = (cartId, propertyIds) => run(async () => { await updateCartItems(cartId, propertyIds); await reloadCarts(); }, "Não foi possível alterar os imóveis do carrinho.");
  const handleShare = (cartId) => run(async () => { await generateCartShareLink(cartId); await reloadCarts(); }, "Não foi possível gerar o link.");

  return (
    <AppShell title="Carrinhos de imóveis">
      {actionError ? (
        <div className={styles.fixedAlert}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}

      <AsyncState result={base} loadingLabel="Carregando oportunidades e imóveis...">
        {(data) => (
          <>
            <div className={styles.toolbar}>
              <FormField label="Oportunidade" htmlFor="cart-opportunity">
                <Select id="cart-opportunity" className={styles.opportunitySelect} value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
                  <option value="">Selecione a oportunidade</option>
                  {(data?.opportunities || []).map((o) => <option key={o.id} value={o.id}>{label(o)}</option>)}
                </Select>
              </FormField>
              {opportunityId ? (
                <Button onClick={() => { setActionError(""); setCreating(true); }}>
                  <Icon name="plus" size={16} /> Novo carrinho
                </Button>
              ) : null}
            </div>

            {opportunityId ? (
              <AsyncState result={cartsQuery} loadingLabel="Carregando carrinhos..." emptyTitle="Nenhum carrinho nesta oportunidade" emptyDescription="Crie um carrinho com os imóveis para enviar ao cliente.">
                {() => (
                  <div className={styles.carts}>
                    {carts.map((cart) => (
                      <CartCard key={cart.id} cart={cart} properties={data?.properties || []} onUpdateItems={handleUpdateItems} onShare={handleShare} busy={busy} />
                    ))}
                  </div>
                )}
              </AsyncState>
            ) : (
              <Card title="Como funciona">
                <p className={styles.meta}>
                  Escolha a oportunidade, selecione os imóveis e gere o link. O cliente abre sem login e vê só os dados públicos (sem
                  observações internas nem endereço completo). As visualizações e os cliques aparecem aqui e viram eventos do CRM.
                </p>
              </Card>
            )}

            <Modal
              open={creating}
              onClose={() => setCreating(false)}
              title="Novo carrinho"
              footer={
                <>
                  <Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button>
                  <Button loading={busy} onClick={handleCreate}>Criar carrinho</Button>
                </>
              }
            >
              <FormField
                label="Validade do link (opcional)"
                htmlFor="cart-expires"
                helper="Sem data, vale o prazo configurado pela empresa."
                error={expiresInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}
              >
                <Input
                  id="cart-expires"
                  type="date"
                  value={expiresOn}
                  onChange={(e) => { setExpiresInvalid(isDateInputInvalid(e.target.validity)); setExpiresOn(e.target.value); }}
                />
              </FormField>
              <CartPropertyPicker idPrefix="cart-new" properties={data?.properties || []} selected={selected} onChange={setSelected} />
            </Modal>
          </>
        )}
      </AsyncState>

      <StickyActionBar>
        <CrmNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
