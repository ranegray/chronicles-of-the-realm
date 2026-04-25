import type { ButtonHTMLAttributes, ReactNode } from "react";
import { playSfx } from "../game/audio";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

export function Button({ variant = "primary", className, children, onClick, disabled, ...rest }: Props) {
  const cls = ["btn", `btn-${variant}`, className].filter(Boolean).join(" ");
  return (
    <button
      className={cls}
      disabled={disabled}
      onClick={event => {
        if (!disabled) playSfx("button");
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
