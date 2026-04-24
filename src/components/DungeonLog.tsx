import type { DungeonLogEntry } from "../game/types";

export interface DungeonLogProps {
  entries: DungeonLogEntry[];
  limit?: number;
}

export function DungeonLog({ entries, limit = 12 }: DungeonLogProps) {
  const tail = entries.slice(Math.max(0, entries.length - limit));

  if (tail.length === 0) {
    return <p className="muted small">The dungeon is still.</p>;
  }

  return (
    <ul className="dungeon-log" aria-label="Recent dungeon events">
      {tail.map(entry => (
        <li key={entry.id} className={`dungeon-log-entry dungeon-log-${entry.type}`}>
          {entry.message}
        </li>
      ))}
    </ul>
  );
}
