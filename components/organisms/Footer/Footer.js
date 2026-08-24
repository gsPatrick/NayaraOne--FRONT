import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <BrandMark tone="dark" size="sm" title="Nayara One" />
        <p className={styles.tagline}>Sistema de gestão imobiliária e construção civil.</p>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Nayara One. Todos os direitos reservados.</span>
        <span>CRECI 12345-J</span>
      </div>
    </footer>
  );
}
