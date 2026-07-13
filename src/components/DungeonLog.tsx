import { useEffect, useMemo, useRef } from "react";
import type { DungeonLogEntry } from "../game/types";

export interface DungeonLogProps {
  entries: DungeonLogEntry[];
  limit?: number;
}

// Display-only cleanup. The stored log entries are never mutated — we only
// reshape what gets rendered:
//   1. "You enter X." / "You step back into X." immediately followed by the
//      threat system's generic "You press deeper into the dungeon." reads as
//      two near-identical lines about the same beat. Fold the second into the
//      first, keeping any extra transition text ("The halls begin to stir.").
//   2. Raw mechanics suffixes like "(+3)" or "(+5 strain)" are stripped —
//      the HUD meters convey the numbers now, prose doesn't need to.
const ENTER_ROOM_RE = /^You (?:enter|step back into) /;
const PRESS_DEEPER_RE = /^You press deeper into the dungeon\.?\s*(.*)$/;
const MECHANIC_SUFFIX_RE = /\s*\([+-]?\d+(?:\s+[a-zA-Z]+)?\)/g;

interface DisplayEntry {
  id: string;
  type: DungeonLogEntry["type"];
  message: string;
}

function cleanMessage(message: string): string {
  return message.replace(MECHANIC_SUFFIX_RE, "").replace(/\s+([.,!?])/g, "$1").trim();
}

function collapseEntries(entries: DungeonLogEntry[]): DisplayEntry[] {
  const result: DisplayEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const next = entries[i + 1];
    if (
      ENTER_ROOM_RE.test(entry.message) &&
      next &&
      next.type === "threat" &&
      PRESS_DEEPER_RE.test(next.message)
    ) {
      const extra = next.message.match(PRESS_DEEPER_RE)?.[1]?.trim();
      result.push({
        id: entry.id,
        type: entry.type,
        message: extra ? `${cleanMessage(entry.message)} ${cleanMessage(extra)}` : cleanMessage(entry.message)
      });
      i++; // skip the folded-in threat entry
      continue;
    }
    result.push({ id: entry.id, type: entry.type, message: cleanMessage(entry.message) });
  }
  return result;
}

export function DungeonLog({ entries, limit = 50 }: DungeonLogProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const tail = entries.slice(Math.max(0, entries.length - limit));
  const displayEntries = useMemo(() => collapseEntries(tail), [tail]);
  const latestId = displayEntries[displayEntries.length - 1]?.id;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [latestId]);

  if (displayEntries.length === 0) {
    return <p className="muted small dungeon-log-empty">The dungeon is still.</p>;
  }

  // Older entries fade out the further they are from the latest. The 6 most
  // recent each get progressively dimmer; anything older settles at the
  // dimmest tier.
  const total = displayEntries.length;
  return (
    <ul ref={listRef} className="dungeon-log dungeon-log-diegetic" aria-label="Recent dungeon events">
      {displayEntries.map((entry, idx) => {
        const fromLatest = total - 1 - idx;
        const recencyClass = fromLatest === 0
          ? "dungeon-log-now"
          : fromLatest <= 5
            ? `dungeon-log-recent-${fromLatest}`
            : "dungeon-log-faded";
        return (
          <li
            key={entry.id}
            className={`dungeon-log-entry dungeon-log-${entry.type} ${recencyClass}`}
          >
            {entry.message}
          </li>
        );
      })}
    </ul>
  );
}
