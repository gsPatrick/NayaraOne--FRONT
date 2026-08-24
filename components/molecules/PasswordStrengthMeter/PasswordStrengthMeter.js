"use client";

import styles from "./PasswordStrengthMeter.module.css";

// Heurística simples: pontua critérios de composição, sem validar contra listas externas.
function computeStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LEVELS = [
  { min: 0, label: "Muito fraca", tone: "weak" },
  { min: 1, label: "Fraca", tone: "weak" },
  { min: 2, label: "Média", tone: "medium" },
  { min: 3, label: "Forte", tone: "strong" },
  { min: 4, label: "Muito forte", tone: "strong" },
];

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;

  const score = computeStrength(password);
  const level = [...LEVELS].reverse().find((l) => score >= l.min);

  return (
    <div className={styles.wrap}>
      <div className={styles.bars} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={[styles.bar, i < score ? styles[level.tone] : ""].filter(Boolean).join(" ")}
          />
        ))}
      </div>
      <span className={[styles.label, styles[level.tone]].join(" ")}>{level.label}</span>
    </div>
  );
}
