// d3-force-3d has no published type declarations. It's API-compatible with
// d3-force for the 2D forces we use (react-force-graph-2d depends on it
// internally for exactly this reason), so this declares only what GraphCanvas
// actually imports rather than pulling in the unrelated @types/d3-force package.
declare module 'd3-force-3d' {
  export interface ForceCollide<NodeDatum> {
    (alpha: number): void;
    initialize(nodes: NodeDatum[]): void;
    radius(radius: number | ((node: NodeDatum) => number)): ForceCollide<NodeDatum>;
    iterations(iterations: number): ForceCollide<NodeDatum>;
    strength(strength: number): ForceCollide<NodeDatum>;
  }

  export function forceCollide<NodeDatum = unknown>(
    radius?: number | ((node: NodeDatum) => number),
  ): ForceCollide<NodeDatum>;
}
