// Códigos de ambiente/item da vistoria (Caderno §11 "itens estruturados"; Guia §9 InspectionItem { roomCode, itemCode }).
// Mesma regra da API (wt/api-m5 src/features/legal/inspectionItemCodes.js#slug): sem acento, MAIÚSCULAS, dígitos e "_",
// até 60. A comparação entrada x saída pareia por ambiente + item — usar os mesmos nomes nas duas vistorias.

export function inspectionCode(text) {
  return String(text || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/** Item estruturado pronto para a API: nome "Ambiente — Item" e os códigos derivados. */
export function structuredItem(room, item) {
  const roomName = String(room || "").trim();
  const itemName = String(item || "").trim();
  return {
    itemName: roomName ? `${roomName} — ${itemName}` : itemName,
    roomCode: inspectionCode(roomName) || undefined,
    itemCode: inspectionCode(itemName) || undefined,
  };
}

/** Separa "Sala — Piso" em ambiente e item para exibir (itens antigos só têm o nome). */
export function splitItemName(itemName) {
  const parts = String(itemName || "").split(/\s+[—–-]\s+/);
  if (parts.length > 1) return { room: parts[0], item: parts.slice(1).join(" — ") };
  return { room: "", item: String(itemName || "") };
}
