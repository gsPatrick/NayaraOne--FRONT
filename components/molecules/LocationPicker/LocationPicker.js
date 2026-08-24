"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/atoms/Icon/Icon";
import { buildMapsQuery } from "@/lib/maps";
import styles from "./LocationPicker.module.css";

const DEFAULT_CENTER = [-14.235, -51.9253]; // Centro geográfico do Brasil, usado até o endereço ser geocodificado.
const DEFAULT_ZOOM = 4;
const PIN_ZOOM = 16;

// Geocodifica o endereço digitado via Nominatim (OpenStreetMap) — gratuito, sem chave de API.
async function geocodeAddress(query) {
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function LocationPicker({ address, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const geocodeDebounceRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Carrega o Leaflet (CSS + lógica) apenas no cliente, uma vez.
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled) return;
      const L = mod.default || mod;
      // Corrige os ícones padrão do Leaflet, que quebram sob bundlers (webpack resolve as URLs erradas).
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      leafletRef.current = L;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = leafletRef.current;

    const hasCoords = address?.latitude && address?.longitude;
    const initialCenter = hasCoords
      ? [parseFloat(address.latitude), parseFloat(address.longitude)]
      : DEFAULT_CENTER;
    const initialZoom = hasCoords ? PIN_ZOOM : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(initialCenter, initialZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(initialCenter, { draggable: true }).addTo(map);
    if (!hasCoords) marker.setOpacity(0);

    function placeMarker(lat, lng) {
      marker.setLatLng([lat, lng]);
      marker.setOpacity(1);
      onPick(lat, lng);
    }

    map.on("click", (e) => placeMarker(e.latlng.lat, e.latlng.lng));
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      placeMarker(pos.lat, pos.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recentraliza o mapa quando o endereço textual muda (via CEP), sem sobrescrever um pino já ajustado manualmente.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const query = buildMapsQuery({ ...address, latitude: null, longitude: null });
    if (!query) return;
    if (geocodeDebounceRef.current) window.clearTimeout(geocodeDebounceRef.current);
    geocodeDebounceRef.current = window.setTimeout(() => {
      geocodeAddress(query).then((result) => {
        if (!result || !mapRef.current) return;
        mapRef.current.setView([result.lat, result.lng], PIN_ZOOM);
      });
    }, 600);
    return () => {
      if (geocodeDebounceRef.current) window.clearTimeout(geocodeDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, address?.zipCode, address?.street, address?.number, address?.city, address?.state]);

  const hasPin = Boolean(address?.latitude && address?.longitude);

  return (
    <div className={styles.wrap}>
      <div ref={containerRef} className={styles.map} />
      <p className={styles.hint}>
        <Icon name="mapPin" size={14} />
        {hasPin ? "Arraste o pino para ajustar a localização exata." : "Clique no mapa para marcar a localização exata do imóvel."}
      </p>
    </div>
  );
}
