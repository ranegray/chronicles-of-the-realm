import type { MaterialId } from "../game/types";
import { getMaterialDefinition } from "../data/materials";

export function MaterialPill({ materialId, quantity }: { materialId: MaterialId; quantity: number }) {
  const material = getMaterialDefinition(materialId);
  return (
    <span className={`material-pill rarity-${material.rarity}`} title={`${material.description} Source: ${material.sourceBiomes.join(", ")}`}>
      {material.name} x{quantity}
    </span>
  );
}
