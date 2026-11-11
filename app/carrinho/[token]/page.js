"use client";

import { useState } from "react";
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { getPublicCart, clickPublicCartProperty } from "@/lib/api/carts";
import { formatBRL, formatDateTime } from "@/lib/format";
import styles from "./page.module.css";

const TYPE = { RESIDENTIAL: "Residencial", COMMERCIAL: "Comercial", LAND: "Terreno", RURAL: "Rural" };
const OFFER = { SALE: "Venda", RENT: "Locação", SEASONAL: "Temporada" };

// Página PÚBLICA do carrinho de imóveis (livro do Marco 3 §14): abre sem login pelo link que o corretor enviou. Mostra só os
// dados públicos devolvidos pela API (sem observações internas, endereço completo, matrícula nem preço mínimo). Abrir a página
// registra a visualização e "Tenho interesse" registra o clique no imóvel — os dois viram eventos do CRM. Link expirado ou
// revogado mostra o aviso da API.
export default function CarrinhoPublicoPage({ params }) {
  const token = params.token;
  const [interested, setInterested] = useState({});
  const [error, setError] = useState("");
  const query = useAsyncState(() => getPublicCart(token), { deps: [token], isEmpty: (d) => !d || !d.properties || d.properties.length === 0 });

  async function interest(propertyId) {
    setError("");
    try {
      await clickPublicCartProperty(token, propertyId);
      setInterested((prev) => ({ ...prev, [propertyId]: true }));
    } catch (e) {
      setError(e?.message || "Não foi possível registrar o interesse.");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>Imóveis selecionados para você</h1>
        <AsyncState result={query} loadingLabel="Carregando os imóveis..." emptyTitle="Este carrinho não tem imóveis">
          {(data) => (
            <>
              <p className={styles.subtitle}>Link válido até {formatDateTime(data.expiresAt)}.</p>
              {error ? <p className={styles.subtitle} role="alert">{error}</p> : null}
              <div className={styles.grid}>
                {data.properties.map((p) => (
                  <article className={styles.card} key={p.id}>
                    <h2 className={styles.cardTitle}>{p.title}</h2>
                    <p className={styles.meta}>{TYPE[p.propertyType] || p.propertyType}{p.city ? ` · ${p.city}${p.state ? `/${p.state}` : ""}` : ""}</p>
                    <p className={styles.meta}>
                      {p.bedrooms != null ? `${p.bedrooms} quarto(s)` : "Quartos não informados"}
                      {p.parkingSpots != null ? ` · ${p.parkingSpots} vaga(s)` : ""}
                      {p.areaTotalM2 ? ` · ${Number(p.areaTotalM2).toLocaleString("pt-BR")} m²` : ""}
                    </p>
                    {p.offer ? (
                      <>
                        <p className={styles.price}>{formatBRL(Number(p.offer.askingPrice))}{p.offer.offerType !== "SALE" ? "/mês" : ""}</p>
                        <div>
                          <Badge tone="info">{OFFER[p.offer.offerType] || p.offer.offerType}</Badge>{" "}
                          {p.offer.acceptsFinancing ? <Badge tone="success">Aceita financiamento</Badge> : null}
                        </div>
                      </>
                    ) : <p className={styles.meta}>Sem oferta ativa no momento.</p>}
                    <p className={styles.meta}>{p.photos.length} foto(s) aprovada(s)</p>
                    {interested[p.id] ? (
                      <p className={styles.thanks}>Interesse registrado. O corretor vai falar com você.</p>
                    ) : (
                      <Button size="sm" onClick={() => interest(p.id)}>Tenho interesse</Button>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </AsyncState>
      </div>
    </main>
  );
}
