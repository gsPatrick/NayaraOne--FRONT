import { CompanyProvider } from "@/lib/context/CompanyContext";
import CompanySwitchOverlay from "@/components/molecules/CompanySwitchOverlay/CompanySwitchOverlay";
import AuthGuard from "@/components/organisms/AuthGuard/AuthGuard";

export const metadata = {
  title: "Painel — Nayara One",
  description: "Painel de gestão do Nayara One.",
};

export default function PainelLayout({ children }) {
  return (
    <AuthGuard>
      <CompanyProvider>
        {children}
        <CompanySwitchOverlay />
      </CompanyProvider>
    </AuthGuard>
  );
}
