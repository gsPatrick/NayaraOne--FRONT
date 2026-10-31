"use client";

// Peças visuais da aba Integrações (cartão temático por provedor, badge de conexão e campo de segredo).
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import styles from "./page.module.css";

// Cor oficial de marca de cada provedor integrado (mesma fonte que alimenta os componentes de
// logo — ClicksignLogo.module.css usa #F15A29, banks.js usa #EC0000 pro código 033/Santander).
// Repetida aqui porque o cartão temático precisa dela em tempo de render pra montar o
// fundo/borda tingidos — os componentes de logo não expõem a cor como prop.
export const CLICKSIGN_BRAND_COLOR = "#F15A29";
export const SANTANDER_BRAND_COLOR = "#EC0000";
export const FGV_BRAND_COLOR = "#002776";
export const PORTO_SEGURO_BRAND_COLOR = "#003DA5";
export const JUNTO_SEGUROS_BRAND_COLOR = "#00B2A9";
export const YELUM_BRAND_COLOR = "#F7941D";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(value, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Monta as CSS custom properties consumidas por .brandCard (page.module.css) — fundo bem suave
// (6% de opacidade) e borda um pouco mais forte (18%) na cor oficial da marca, pra cada seção
// de integração carregar visualmente a identidade da empresa integrada, sem brigar com o texto.
export function brandCardStyle(brandHex) {
  const { r, g, b } = hexToRgb(brandHex);
  return {
    "--brand-tint": `rgba(${r}, ${g}, ${b}, 0.06)`,
    "--brand-border": `rgba(${r}, ${g}, ${b}, 0.22)`,
  };
}

// Badge de status de conexão de uma integração externa. Nunca fica "indefinido": enquanto o
// teste de conexão real está rodando mostra "Testando...", e cai em "Não configurado" (neutro)
// quando não há token salvo pra aquele provider — só tenta "Conectado"/"Não conectado" quando
// de fato há algo configurado pra testar.
export function StatusBadge({ status, testing }) {
  if (testing) {
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>Testando...</span>;
  }
  if (!status || !status.configured) {
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>Não configurado</span>;
  }
  if (status.connected) {
    return <span className={`${styles.badge} ${styles.badgeSuccess}`}>● Conectado</span>;
  }
  const reasonLabel =
    status.reason === "timeout" ? "Tempo esgotado" : status.reason ? "Falha de autenticação" : null;
  return (
    <span className={`${styles.badge} ${styles.badgeDanger}`} title={reasonLabel || undefined}>
      ● Não conectado{reasonLabel ? ` — ${reasonLabel}` : ""}
    </span>
  );
}

// Campo de segredo (token/webhook secret): quando já há um valor salvo, mostra um estado
// somente-leitura com um botão "Alterar" — clicar troca pra um input vazio de verdade, pronto
// pra digitar um valor novo (o backend NUNCA devolve o segredo real, então não há nada pra
// "revelar", só pra substituir). "Cancelar" volta ao estado somente-leitura sem perder o valor
// já salvo no backend (só descarta o que foi digitado, ainda não enviado).
export function SecretField({ id, label, configured, value, onChange, editing, onStartEdit, onCancelEdit, placeholder }) {
  const showReadOnly = configured && !editing;
  return (
    <FormField
      label={
        <span className={styles.secretLabel}>
          {label} <span title="Valor sensível protegido — nunca exibido em texto claro">🔒</span>
        </span>
      }
      htmlFor={id}
    >
      {showReadOnly ? (
        <div className={styles.secretReadOnlyRow}>
          <Input id={id} type="password" value="••••••••••••" disabled readOnly />
          <Button type="button" variant="secondary" onClick={onStartEdit}>
            Alterar
          </Button>
        </div>
      ) : (
        <div className={styles.secretReadOnlyRow}>
          <Input
            id={id}
            type="password"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus={editing}
          />
          {configured ? (
            <Button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>
      )}
    </FormField>
  );
}
