import { NAV_SECTIONS } from "@/app/painel/_nav";

// Achata NAV_SECTIONS num mapa href -> permissão exigida. Rotas dinâmicas/filhas não listadas
// no menu (ex.: /painel/imoveis/123, /painel/imoveis/novo) herdam a permissão do item de nav
// cujo href é o prefixo mais longo — por isso a checagem é por "starts with", não igualdade.
function buildRouteEntries() {
  const entries = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href) entries.push({ href: item.href, permission: item.permission });
      for (const child of item.children || []) {
        entries.push({ href: child.href, permission: item.permission });
      }
    }
  }
  // Prefixos mais longos primeiro, para "/painel/financeiro/lancamentos" vencer
  // "/painel/financeiro" quando ambos batem.
  return entries.sort((a, b) => b.href.length - a.href.length);
}

let cachedEntries = null;

export function getRequiredPermission(pathname) {
  if (!cachedEntries) cachedEntries = buildRouteEntries();
  const match = cachedEntries.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  return match?.permission || null;
}
