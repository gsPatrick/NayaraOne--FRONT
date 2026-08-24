import { CompanyProvider } from "@/lib/context/CompanyContext";
import CompanySwitchOverlay from "@/components/molecules/CompanySwitchOverlay/CompanySwitchOverlay";

export const metadata = {
  title: "Painel — Nayara One",
  description: "Painel de gestão do Nayara One.",
};

export default function PainelLayout({ children }) {
  return (
    <CompanyProvider>
      {children}
      <CompanySwitchOverlay />
    </CompanyProvider>
  );
}
