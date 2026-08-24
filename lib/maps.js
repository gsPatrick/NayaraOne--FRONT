// Helpers para montar URLs do Google Maps a partir de um endereço estruturado ou lat/long —
// reutilizado pela página de detalhe, pelo wizard de criação e pela edição de imóvel.

export function buildMapsQuery(address) {
  if (address?.latitude && address?.longitude) {
    return `${address.latitude},${address.longitude}`;
  }
  return [address?.street, address?.number, address?.neighborhood, address?.city, address?.state, address?.zipCode]
    .filter(Boolean)
    .join(", ");
}

export function buildGoogleMapsUrl(address) {
  const query = buildMapsQuery(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "")}`;
}

export function buildGoogleMapsEmbedUrl(address) {
  const query = buildMapsQuery(address);
  return `https://www.google.com/maps?q=${encodeURIComponent(query || "")}&output=embed`;
}

export function buildGoogleMapsDirectionsUrl(address) {
  const query = buildMapsQuery(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query || "")}`;
}

export function buildAddressLine(address) {
  const line1 = [address?.street, address?.number].filter(Boolean).join(", ");
  const line2 = [address?.neighborhood, address?.city, address?.state].filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(" — ");
}
