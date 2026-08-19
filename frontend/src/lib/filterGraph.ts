import type { GraphData } from './types';
import type { RiskFilter } from '@/components/search/FilterPanel';

/**
 * Client-side risk-level filter backing the sidebar's "Risk level" control.
 * Filtering nodes can orphan edges that pointed at a now-hidden node, so
 * edges are re-filtered against the surviving node id set rather than just
 * matching on `isFlagged` independently — otherwise GraphCanvas would be
 * handed a link referencing a node that isn't in the node list.
 */
export function filterGraph(data: GraphData, filter: RiskFilter): GraphData {
  if (filter === 'all') return data;

  const nodes = data.nodes.filter((n) => (filter === 'flagged' ? n.isFlagged : !n.isFlagged));
  const nodeIds = new Set(nodes.map((n) => n.id));

  const links = data.links.filter((l) => {
    const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
    const targetId = typeof l.target === 'string' ? l.target : l.target.id;
    return nodeIds.has(sourceId) && nodeIds.has(targetId);
  });

  return { nodes, links };
}
