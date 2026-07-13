import type { DungeonRoom, DungeonRun, ItemInstance, MaterialVault } from "./types";

export interface PendingLootDeposit {
  items?: ItemInstance[];
  gold?: number;
  materials?: MaterialVault;
}

const EMPTY_PENDING_LOOT: { items: ItemInstance[]; gold: number; materials: Record<string, number> } = {
  items: [],
  gold: 0,
  materials: {}
};

export function getPendingLoot(room: DungeonRoom): { items: ItemInstance[]; gold: number; materials: Record<string, number> } {
  return room.pendingLoot ?? EMPTY_PENDING_LOOT;
}

export function hasPendingLoot(room: DungeonRoom): boolean {
  const pending = getPendingLoot(room);
  return pending.items.length > 0 || pending.gold > 0 || Object.keys(pending.materials).length > 0;
}

/**
 * Merges a fresh batch of loot (from combat, search, or treasure rooms) into a
 * room's persisted pending-loot pool. Never overwrites what is already there —
 * multiple loot sources (e.g. a combat victory followed by a hidden-loot search)
 * can deposit into the same room.
 */
export function depositPendingLoot(run: DungeonRun, roomId: string, deposit: PendingLootDeposit): DungeonRun {
  const items = deposit.items ?? [];
  const gold = deposit.gold ?? 0;
  const materials = deposit.materials ?? {};
  if (items.length === 0 && gold === 0 && Object.keys(materials).length === 0) return run;
  return {
    ...run,
    roomGraph: run.roomGraph.map(room => {
      if (room.id !== roomId) return room;
      const prev = getPendingLoot(room);
      const mergedMaterials: Record<string, number> = { ...prev.materials };
      for (const [id, amount] of Object.entries(materials)) {
        mergedMaterials[id] = (mergedMaterials[id] ?? 0) + (amount ?? 0);
      }
      return {
        ...room,
        pendingLoot: {
          items: [...prev.items, ...items],
          gold: prev.gold + gold,
          materials: mergedMaterials
        }
      };
    })
  };
}

export function clearPendingLoot(run: DungeonRun, roomId: string): DungeonRun {
  return {
    ...run,
    roomGraph: run.roomGraph.map(room =>
      room.id === roomId ? { ...room, pendingLoot: { items: [], gold: 0, materials: {} } } : room
    )
  };
}
