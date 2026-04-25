import { useEffect, useRef } from "react";
import type { DungeonLogEntry } from "../game/types";

export interface DungeonLogProps {
  entries: DungeonLogEntry[];
  limit?: number;
}

export function DungeonLog({ entries, limit = 50 }: DungeonLogProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const tail = entries.slice(Math.max(0, entries.length - limit));
  const latestId = tail[tail.length - 1]?.id;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [latestId]);

  if (tail.length === 0) {
    return <p className="muted small dungeon-log-empty">The dungeon is still.</p>;
  }

  // Older entries fade out the further they are from the latest. The 6 most
  // recent each get progressively dimmer; anything older settles at the
  // dimmest tier.
  const total = tail.length;
  return (
    <ul ref={listRef} className="dungeon-log dungeon-log-diegetic" aria-label="Recent dungeon events">
      {tail.map((entry, idx) => {
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
