import React from 'react';

const NODES = [
  { x: 160, y: 90, r: 15 },
  { x: 320, y: 60, r: 15 },
  { x: 260, y: 190, r: 15 },
  { x: 420, y: 170, r: 15 },
  { x: 110, y: 210, r: 15 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [2, 4],
];

/**
 * A silhouette of the graph shape (rather than a generic pulsing rectangle)
 * so the loading state reads as "the case is being traced," not "something
 * is broken." Respects prefers-reduced-motion via the global CSS override
 * on .animate-pulse.
 */
export function GraphSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
      <div className="w-full max-w-lg animate-pulse">
        <svg viewBox="0 0 480 260" className="w-full h-auto opacity-70" aria-hidden>
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
              stroke="var(--border-strong)"
              strokeWidth={1.5}
            />
          ))}
          {NODES.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="var(--surface-raised)" stroke="var(--border-strong)" strokeWidth={1.5} />
          ))}
        </svg>
        <p className="text-center text-xs font-mono uppercase tracking-widest text-text-muted mt-2">
          Tracing ownership network&hellip;
        </p>
      </div>
    </div>
  );
}
