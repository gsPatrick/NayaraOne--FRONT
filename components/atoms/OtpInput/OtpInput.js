"use client";

import { useRef } from "react";
import styles from "./OtpInput.module.css";

export default function OtpInput({ length = 6, value = "", onChange = () => {}, error = false }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const setDigit = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index, event) => {
    const raw = event.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    const chars = raw.split("");
    chars.forEach((char, offset) => {
      const target = index + offset;
      if (target < length) setDigit(target, char);
    });
    const nextIndex = Math.min(index + chars.length, length - 1);
    refs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const raw = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(raw);
    refs.current[Math.min(raw.length, length - 1)]?.focus();
  };

  return (
    <div className={[styles.group, error ? styles.error : ""].filter(Boolean).join(" ")} role="group" aria-label="Código de verificação">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          className={styles.box}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`Dígito ${index + 1} de ${length}`}
        />
      ))}
    </div>
  );
}
