import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import styles from "./AuthVisual.module.css";

export default function AuthVisual() {
  return (
    <div className={styles.visual}>
      <div className={styles.glow} aria-hidden="true" />
      <svg className={styles.skyline} viewBox="0 0 800 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className={styles.layer3} d="M-40 420 L140 250 L320 380 L480 210 L680 360 L840 260 L840 560 L-40 560Z" />
        <path className={styles.layer2} d="M-40 470 L110 330 L260 430 L420 300 L560 420 L720 320 L840 400 L840 560 L-40 560Z" />
        <path className={styles.layer1} d="M-40 520 L90 410 L220 500 L360 400 L500 500 L640 420 L780 500 L840 470 L840 560 L-40 560Z" />
      </svg>
      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.brandRow}>
          <BrandMark tone="dark" size="md" />
          <span className={styles.wordmark}>Nayara One</span>
        </div>
        <p className={styles.tagline}>
          <span>Gestão completa da carteira,</span>
          <span>para uma operação sem limites.</span>
        </p>
      </div>
    </div>
  );
}
