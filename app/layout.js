import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata = {
  title: "Nayara One — Design System",
  description: "Fundação visual do Nayara One: tokens de design e componentes atômicos para o ERP imobiliário.",
};

// Onyx (preto) é o tema padrão do sistema — aplicado antes do primeiro paint pra não piscar
// o dourado por uma fração de segundo. Só some se o usuário escolher "Clássico" em
// Configurações > Aparência (fica salvo em localStorage).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('nayara-one:theme');
    if (stored !== 'default') {
      document.documentElement.setAttribute('data-theme', 'onyx');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
