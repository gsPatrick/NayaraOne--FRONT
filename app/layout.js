import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata = {
  title: "Nayara One — Design System",
  description: "Fundação visual do Nayara One: tokens de design e componentes atômicos para o ERP imobiliário.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
