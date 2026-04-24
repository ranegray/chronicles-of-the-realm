import type { ReactNode } from "react";

interface Props {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "default" | "danger" | "warm";
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export function Card({
  title, subtitle, children, footer, variant = "default", onClick, selectable, selected
}: Props) {
  const cls = [
    "card",
    `card-${variant}`,
    selectable ? "card-selectable" : "",
    selected ? "card-selected" : ""
  ].filter(Boolean).join(" ");
  return (
    <div className={cls} onClick={onClick} role={selectable ? "button" : undefined}>
      {title && <div className="card-header">
        <div className="card-title">{title}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
