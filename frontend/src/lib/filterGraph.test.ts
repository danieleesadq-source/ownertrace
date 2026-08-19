import { describe, it, expect } from 'vitest';
import { filterGraph } from './filterGraph';
import type { GraphData } from './types';

const sampleGraph: GraphData = {
  nodes: [
    { id: 'p1', type: 'person', label: 'Tariq Mahmood', sublabel: 'x', isFlagged: true },
    { id: 'p2', type: 'person', label: 'Bilal Ahmed', sublabel: 'x', isFlagged: false },
    { id: 'prop1', type: 'property', label: 'Plot 104', sublabel: 'x', isFlagged: true },
    { id: 'prop2', type: 'property', label: 'House 22', sublabel: 'x', isFlagged: false },
  ],
  links: [
    { source: 'p1', target: 'prop1', isFlagged: true, label: 'Buyer' },
    { source: 'p2', target: 'prop1', isFlagged: false, label: 'Seller' },
    { source: 'p2', target: 'prop2', isFlagged: false, label: 'Owner' },
  ],
};

describe('filterGraph', () => {
  it('returns the graph unchanged for "all"', () => {
    expect(filterGraph(sampleGraph, 'all')).toBe(sampleGraph);
  });

  it('keeps only flagged nodes for "flagged", and only edges where both endpoints survive', () => {
    const result = filterGraph(sampleGraph, 'flagged');
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['p1', 'prop1']);
    // p2->prop1 is dropped even though prop1 is flagged, because p2 (unflagged) was removed
    expect(result.links).toEqual([{ source: 'p1', target: 'prop1', isFlagged: true, label: 'Buyer' }]);
  });

  it('keeps only unflagged nodes for "clean", and drops edges touching a removed node', () => {
    const result = filterGraph(sampleGraph, 'clean');
    expect(result.nodes.map((n) => n.id).sort()).toEqual(['p2', 'prop2']);
    expect(result.links).toEqual([{ source: 'p2', target: 'prop2', isFlagged: false, label: 'Owner' }]);
  });

  it('resolves node-object sources/targets (not just string ids) when checking survival', () => {
    // After a force simulation tick, react-force-graph mutates link.source/target
    // from a string id into the actual node object it refers to.
    const nodeObjectGraph: GraphData = {
      nodes: sampleGraph.nodes,
      links: [{ source: sampleGraph.nodes[0], target: sampleGraph.nodes[2], isFlagged: true, label: 'Buyer' }],
    };
    const result = filterGraph(nodeObjectGraph, 'flagged');
    expect(result.links).toHaveLength(1);
  });

  it('never returns an edge whose endpoint was filtered out', () => {
    const result = filterGraph(sampleGraph, 'flagged');
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const link of result.links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      expect(nodeIds.has(sourceId)).toBe(true);
      expect(nodeIds.has(targetId)).toBe(true);
    }
  });
});
