import type { Quest, QuestEvent, QuestStatus, VillageNpc, VillageState } from "./types";
import { QUEST_TEMPLATES, type QuestTemplate } from "../data/questTemplates";
import type { Rng } from "./rng";
import { makeId } from "./rng";

function templatesForNpc(npc: VillageNpc): QuestTemplate[] {
  const preferred = QUEST_TEMPLATES.filter(t => t.preferredRoles.includes(npc.role));
  if (preferred.length > 0) return preferred;
  return QUEST_TEMPLATES;
}

export function generateQuestForNpc(
  npc: VillageNpc,
  rng: Rng,
  existing: Quest[] = []
): Quest {
  const candidates = templatesForNpc(npc).filter(
    t => !existing.some(q => q.npcId === npc.id && q.title === t.titleTemplate)
  );
  const pool = candidates.length > 0 ? candidates : templatesForNpc(npc);
  const tpl = rng.pickOne(pool);
  return {
    id: makeId(rng, "quest"),
    title: tpl.titleTemplate,
    description: tpl.descriptionTemplate.replace("{count}", String(tpl.requiredCount)),
    npcId: npc.id,
    type: tpl.type,
    target: tpl.target,
    requiredCount: tpl.requiredCount,
    currentCount: 0,
    biome: tpl.biome,
    reward: { ...tpl.reward },
    unlockEffect: tpl.unlockEffect ? { ...tpl.unlockEffect } : undefined,
    status: "available"
  };
}

export function seedVillageQuests(village: VillageState, rng: Rng): VillageState {
  const newQuests: Quest[] = [];
  for (const npc of village.npcs) {
    const q = generateQuestForNpc(npc, rng, [...village.quests, ...newQuests]);
    npc.questIds.push(q.id);
    newQuests.push(q);
  }
  return {
    ...village,
    quests: [...village.quests, ...newQuests]
  };
}

function questMatchesTarget(quest: Quest, target: string): boolean {
  return quest.target === "any" || quest.target === target;
}

export function applyQuestEvent(quest: Quest, event: QuestEvent): Quest {
  if (quest.status !== "active") return quest;

  const inc = (delta = 1): Quest => {
    const newCount = Math.min(quest.requiredCount, quest.currentCount + delta);
    const newStatus: QuestStatus = newCount >= quest.requiredCount ? "completed" : "active";
    return { ...quest, currentCount: newCount, status: newStatus };
  };

  switch (event.kind) {
    case "enemySlain":
      if (quest.type !== "slayEnemy") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      if (!questMatchesTarget(quest, event.enemyId.split("_")[0]!)) return quest;
      return inc();
    case "roomScouted":
      if (quest.type !== "scoutRoom") return quest;
      if (!questMatchesTarget(quest, event.roomType)) return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      return inc();
    case "chestOpened":
      if (quest.type !== "openChest") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      return inc();
    case "materialCollected":
      if (quest.type !== "extractMaterial") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      if (!questMatchesTarget(quest, event.tag)) return quest;
      return inc();
    case "depthReached":
      if (quest.type !== "surviveDepth") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      return event.roomCount >= quest.requiredCount
        ? { ...quest, currentCount: quest.requiredCount, status: "completed" }
        : quest;
    case "miniBossDefeated":
      if (quest.type !== "defeatMiniBoss") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      return inc();
    case "itemRetrieved":
      if (quest.type !== "retrieveItem") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      if (!questMatchesTarget(quest, event.templateId)) return quest;
      return inc();
    case "signFound":
      if (quest.type !== "findSign") return quest;
      if (quest.biome && quest.biome !== event.biome) return quest;
      return inc();
  }
}

export function applyQuestEventToList(quests: Quest[], event: QuestEvent): Quest[] {
  return quests.map(q => applyQuestEvent(q, event));
}
