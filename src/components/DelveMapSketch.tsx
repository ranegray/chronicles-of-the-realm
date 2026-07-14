import type { MapSketch } from "../screens/delveMapSketch";
import "./DelveMapSketch.css";

/**
 * The cartographer's sketch (issue #38, Pillar 4). A non-interactive,
 * parchment-toned diagram of visited rooms — no minimap chrome, no
 * click-to-travel, just a sketch you consult and put away. Rendered inline
 * under the narrative line that triggered it (DelveScreen), so it scrolls
 * away with the scene like everything else in the one-column loop.
 */
export function DelveMapSketch({ sketch }: { sketch: MapSketch }) {
  const colWidth = 108;
  const rowHeight = 56;
  const padding = 28;
  const width = Math.max(1, sketch.columns) * colWidth + padding * 2;
  const height = Math.max(1, sketch.maxRows) * rowHeight + padding * 2;

  const posOf = (col: number, row: number) => ({
    x: padding + col * colWidth,
    y: padding + row * rowHeight
  });

  return (
    <div className="delve-map-sketch" role="img" aria-label="A hand-sketched map of the rooms you've visited">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={Math.min(height, 320)}>
        {sketch.edges.map(edge => {
          const from = sketch.nodes.find(n => n.id === edge.from);
          const to = sketch.nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          const a = posOf(from.col, from.row);
          const b = posOf(to.col, to.row);
          return (
            <line
              key={`${edge.from}:${edge.to}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              className="delve-map-sketch-edge"
            />
          );
        })}
        {sketch.nodes.map(node => {
          const { x, y } = posOf(node.col, node.row);
          return (
            <g key={node.id} className={`delve-map-sketch-node${node.current ? " delve-map-sketch-node-current" : ""}`}>
              <circle cx={x} cy={y} r={node.landmark ? 7 : 4.5} />
              <text x={x} y={y - 12} textAnchor="middle" className={node.landmark ? "delve-map-sketch-label-landmark" : "delve-map-sketch-label"}>
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
