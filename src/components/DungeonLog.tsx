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
    return <p className="muted small">The dungeon is still.</p>;
  }

  return (
    <ul ref={listRef} className="dungeon-log" aria-label="Recent dungeon events">
      {tail.map(entry => (
        <li key={entry.id} className={`dungeon-log-entry dungeon-log-${entry.type}`}>
          {entry.message}
        </li>
      ))}
    </ul>
  );
}
