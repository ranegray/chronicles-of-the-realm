import type { DungeonLogEntry, DungeonLogEntryType, DungeonRun } from "./types";
import { DUNGEON_LOG_RULES } from "./constants";

export function createEmptyDungeonLog(): DungeonLogEntry[] {
  return [];
}

export function addDungeonLogEntry(params: {
  run: DungeonRun;
  type: DungeonLogEntryType;
  message: string;
  roomId?: string;
  now?: number;
}): DungeonRun {
  const { run, type, message, roomId } = params;
  const now = params.now ?? Date.now();
  const entry: DungeonLogEntry = {
    id: makeEntryId(run, now),
    timestamp: now,
    type,
    message,
    roomId
  };
  const log = [...(run.dungeonLog ?? []), entry];
  return trimDungeonLog({ run: { ...run, dungeonLog: log } });
}

export function trimDungeonLog(params: {
  run: DungeonRun;
  maxEntries?: number;
}): DungeonRun {
  const max = params.maxEntries ?? DUNGEON_LOG_RULES.maxEntries;
  const log = params.run.dungeonLog ?? [];
  if (log.length <= max) return params.run;
  return { ...params.run, dungeonLog: log.slice(log.length - max) };
}

function makeEntryId(run: DungeonRun, now: number): string {
  const seq = (run.dungeonLog?.length ?? 0) + 1;
  return `log_${now.toString(36)}_${seq.toString(36)}`;
}
