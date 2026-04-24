import type {
  DungeonRun,
  ItemInstance,
  Quest,
  QuestProgressSummary,
  RunEndReason,
  RunSummary,
  VillageState
} from "./types";
import type { DeathSummary, ExtractionRewardSummary } from "./progression";
import { extractionDistances } from "./pathing";

interface BuildRunSummaryArgs {
  run: DungeonRun;
  village?: VillageState;
  reason: RunEndReason;
  reasonText: string;
  extraction?: ExtractionRewardSummary;
  death?: DeathSummary;
}

export function buildRunSummary({
  run,
  village,
  reason,
  reasonText,
  extraction,
  death
}: BuildRunSummaryArgs): RunSummary {
  const lootExtracted = extraction?.itemsSecured ?? [];
  const lootLost = death?.raidItemsLost ?? [];
  const gearLost = death?.gearLost ?? [];
  const itemValueLost = getInventoryValue(lootLost) + getInventoryValue(gearLost);
  const raidValueLost = getInventoryValue(lootLost) + (death?.goldLost ?? 0);

  let deathExtractionDistance: number | undefined;
  let deathExtractionKnown: boolean | undefined;
  if (reason === "dead") {
    const { absolute, knownVisited } = extractionDistances(run, run.currentRoomId);
    deathExtractionDistance = absolute;
    deathExtractionKnown = knownVisited !== undefined;
  }

  return {
    id: `${run.runId}:${Date.now()}`,
    runId: run.runId,
    seed: run.seed,
    biome: run.biome,
    tier: run.tier,
    startedAt: run.startedAt,
    endedAt: Date.now(),
    reason,
    reasonText,
    roomsVisited: (run.roomsVisitedBeforeDepth ?? 0) + run.visitedRoomIds.length,
    roomsCompleted: (run.roomsCompletedBeforeDepth ?? 0) + run.roomGraph.filter(room => room.completed).length,
    lootExtracted,
    lootLost,
    gearLost,
    goldGained: extraction?.goldGained ?? 0,
    goldLost: death?.goldLost ?? 0,
    xpGained: run.xpGained ?? extraction?.xpGained ?? 0,
    itemValueExtracted: getInventoryValue(lootExtracted),
    itemValueLost,
    raidValueLost,
    deathExtractionDistance,
    deathExtractionKnown,
    questProgress: getQuestProgress(run, village),
    questsCompleted: extraction?.questsCompleted ?? getCompletedRunQuests(run, village),
    questRewards: extraction?.questRewards ?? [],
    unlocksApplied: extraction?.unlocksApplied ?? []
  };
}

export function appendRunSummary(existing: RunSummary[], summary: RunSummary): RunSummary[] {
  return [...existing, summary].slice(-50);
}

function getInventoryValue(items: ItemInstance[]): number {
  return items.reduce((sum, item) => sum + item.value * item.quantity, 0);
}

function getQuestProgress(run: DungeonRun, village?: VillageState): QuestProgressSummary[] {
  if (!village || run.activeQuestIds.length === 0) return [];
  return village.quests
    .filter(quest => run.activeQuestIds.includes(quest.id))
    .map(quest => {
      const beforeCount = run.questProgressAtStart?.[quest.id] ?? 0;
      return {
        questId: quest.id,
        title: quest.title,
        beforeCount,
        afterCount: quest.currentCount,
        requiredCount: quest.requiredCount,
        status: quest.status
      };
    });
}

function getCompletedRunQuests(run: DungeonRun, village?: VillageState): Quest[] {
  if (!village) return [];
  return village.quests.filter(quest =>
    run.activeQuestIds.includes(quest.id) && quest.status === "completed"
  );
}
