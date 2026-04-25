import type { ItemAffixView } from "./v04UiTypes";

interface AffixBadgeProps {
  affix: ItemAffixView;
}

export function AffixBadge({ affix }: AffixBadgeProps) {
  const type = affix.type ?? "special";
  return (
    <span className={`affix-badge affix-badge-${type}`} title={affix.description}>
      {affix.name}
    </span>
  );
}
