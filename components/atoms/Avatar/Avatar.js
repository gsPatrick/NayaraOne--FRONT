import styles from "./Avatar.module.css";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function Avatar({ name = "", size = "md", tone = "default", src = null, className = "" }) {
  const classes = [styles.avatar, styles[size], styles[`tone-${tone}`], className].filter(Boolean).join(" ");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={[classes, styles.photo].filter(Boolean).join(" ")} />
    );
  }

  return <span className={classes}>{initials(name)}</span>;
}
