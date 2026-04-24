import type { ServiceLevel } from "../game/types";

export interface ServiceLevelBadgeProps {
  level: ServiceLevel;
  label?: string;
}

export function ServiceLevelBadge({ level, label }: ServiceLevelBadgeProps) {
  return <span className="service-level-badge">Level {level}{label ? ` - ${label}` : ""}</span>;
}
