import type { MaterialId, MaterialVault } from "../game/types";
import { MaterialPill } from "./MaterialPill";

export interface MaterialInventoryProps {
  materials: MaterialVault;
  compact?: boolean;
}

export function MaterialInventory({ materials, compact }: MaterialInventoryProps) {
  const entries = Object.entries(materials ?? {}).filter(([, qty]) => (qty ?? 0) > 0) as [MaterialId, number][];
  if (entries.length === 0) {
    return <div className="inv-empty">No materials secured yet.</div>;
  }
  return (
    <div className={compact ? "material-inventory compact" : "material-inventory"}>
      {entries.map(([id, quantity]) => (
        <MaterialPill key={id} materialId={id} quantity={quantity} />
      ))}
    </div>
  );
}
