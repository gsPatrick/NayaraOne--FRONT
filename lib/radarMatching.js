// Espelha crm/radar/radarMatching.service.js (matchRadarToProperties) da API — mesmos nomes de
// critério em criteriaJson (propertyType, offerType, minPrice/maxPrice, city/state, minAreaM2/maxAreaM2).
// Matching 100% determinístico: todos os critérios preenchidos precisam bater simultaneamente,
// somente contra a offer ATIVA do offerType do radar. Sem heurística difusa nem scoring.

const PROPERTY_TYPE_TO_ENUM = {
  Residencial: "RESIDENTIAL",
  Comercial: "COMMERCIAL",
};

export function matchRadarToProperties(radar, properties) {
  const criteria = radar.criteriaJson || {};

  return properties
    .filter((property) => {
      const offer = property.activeOffer;
      if (!offer || offer.status !== "ACTIVE") return false;
      if (criteria.offerType && offer.offerType !== criteria.offerType) return false;
      if (criteria.minPrice != null && offer.askingPrice < criteria.minPrice) return false;
      if (criteria.maxPrice != null && offer.askingPrice > criteria.maxPrice) return false;

      const propertyTypeEnum = PROPERTY_TYPE_TO_ENUM[property.type] || property.type;
      if (criteria.propertyType && propertyTypeEnum !== criteria.propertyType) return false;

      if (criteria.city && (property.address?.city || "").toLowerCase() !== criteria.city.toLowerCase()) return false;
      if (criteria.state && (property.address?.state || "").toLowerCase() !== criteria.state.toLowerCase()) return false;

      if (criteria.minAreaM2 != null && property.areaM2 < criteria.minAreaM2) return false;
      if (criteria.maxAreaM2 != null && property.areaM2 > criteria.maxAreaM2) return false;

      return true;
    })
    .sort((a, b) => new Date(b.activeOffer.validFrom || 0) - new Date(a.activeOffer.validFrom || 0));
}

export const PROPERTY_TYPE_LABELS = {
  RESIDENTIAL: "Residencial",
  COMMERCIAL: "Comercial",
  LAND: "Terreno",
  RURAL: "Rural",
};

export const OFFER_TYPE_LABELS = {
  SALE: "Venda",
  RENT: "Locação",
};
