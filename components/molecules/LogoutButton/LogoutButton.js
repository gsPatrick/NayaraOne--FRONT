"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthTransition from "@/components/organisms/AuthTransition/AuthTransition";

export default function LogoutButton({ as: Component = "button", className, children, onClick, ...rest }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const handleClick = (event) => {
    event.preventDefault();
    onClick?.();
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.push("/entrar"), 1300);
  };

  return (
    <>
      <Component type={Component === "button" ? "button" : undefined} className={className} onClick={handleClick} {...rest}>
        {children}
      </Component>
      {leaving ? <AuthTransition variant="exit" label="Saindo" /> : null}
    </>
  );
}
