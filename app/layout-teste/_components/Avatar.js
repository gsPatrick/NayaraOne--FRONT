import s from "./Avatar.module.css";

export default function Avatar({ nome, size = 22 }) {
  const ini = nome.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span className={s.av} style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} title={nome} role="img" aria-label={nome}>
      {ini}
    </span>
  );
}
