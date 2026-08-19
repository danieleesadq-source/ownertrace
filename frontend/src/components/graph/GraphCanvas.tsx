import React, { useRef, useEffect, useCallback, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from 'react-force-graph-2d';
import { forceCollide } from 'd3-force-3d';
import { GraphData, GraphNode, GraphEdge } from '@/lib/types';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick: (nodeId: string) => void;
  onBackgroundClick?: () => void;
  selectedNodeId: string | null;
}

const COLORS = {
  ink: '#0B0D10',
  surface: '#14171C',
  surfaceRaised: '#1B1F26',
  border: '#262B33',
  borderStrong: '#3A414C',
  textPrimary: '#E7E9EC',
  textMuted: '#8A909B',
  verified: '#3FA796',
  flagged: '#C1502E',
  accentGold: '#C9A227',
} as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function drawPersonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(x, y - r * 0.22, r * 0.28, 0, 2 * Math.PI);
  ctx.moveTo(x - r * 0.48, y + r * 0.55);
  ctx.quadraticCurveTo(x, y - r * 0.02, x + r * 0.48, y + r * 0.55);
  ctx.stroke();
}

function drawBuildingIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const hs = size / 2;
  ctx.rect(x - hs * 0.55, y - hs * 0.15, hs * 1.1, hs * 0.75);
  ctx.moveTo(x - hs * 0.75, y - hs * 0.15);
  ctx.lineTo(x, y - hs * 0.75);
  ctx.lineTo(x + hs * 0.75, y - hs * 0.15);
  ctx.moveTo(x - hs * 0.18, y + hs * 0.6);
  ctx.lineTo(x - hs * 0.18, y + hs * 0.15);
  ctx.lineTo(x + hs * 0.18, y + hs * 0.15);
  ctx.lineTo(x + hs * 0.18, y + hs * 0.6);
  ctx.stroke();
}

// Approximates the on-screen footprint of a node's label pill (drawn in
// paintNode below) so the collision force can keep neighboring labels from
// overlapping. Character-width constants are tuned for the label/sublabel
// fonts and sizes used there (Inter 600 12px / IBM Plex Mono 9.5px).
function estimateLabelRadius(node: GraphNode): number {
  const primaryWidth = (node.label?.length ?? 0) * 7.2;
  const secondaryWidth = (node.sublabel?.length ?? 0) * 6;
  const halfWidth = Math.max(primaryWidth, secondaryWidth) / 2;
  return Math.max(40, halfWidth + 14);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function GraphCanvas({ data, onNodeClick, onBackgroundClick, selectedNodeId }: GraphCanvasProps) {
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphEdge>> | undefined>(undefined);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Neighbor lookup for hover-focus (dim everything not connected to the hovered node)
  const neighborsRef = useRef<Map<string, Set<string>>>(new Map());
  useEffect(() => {
    const map = new Map<string, Set<string>>();
    for (const node of data.nodes) map.set(node.id, new Set([node.id]));
    for (const link of data.links) {
      const s = typeof link.source === 'string' ? link.source : link.source.id;
      const t = typeof link.target === 'string' ? link.target : link.target.id;
      map.get(s)?.add(t);
      map.get(t)?.add(s);
    }
    neighborsRef.current = map;
  }, [data]);

  // Default d3-force spacing (charge ~-30, link distance ~30) packs nodes too
  // tightly for our node size + label pills to stay legible, and neither d3's
  // charge nor link-distance forces know anything about label size — so two
  // nodes can end up close enough that their circles don't overlap but their
  // (much wider) name/address labels do. Widen charge/link-distance and add
  // an explicit collision force sized to each node's actual label width,
  // whenever the graph data changes, then reheat so it applies immediately
  // rather than only affecting nodes added after this point.
  useEffect(() => {
    const fg = fgRef.current as any;
    if (!fg) return;
    const nodeCount = data.nodes.length;
    const chargeForce = fg.d3Force('charge');
    // Larger graphs need more repulsion per node to keep separate branches
    // (e.g. several properties hanging off one shared person) from being
    // squeezed together once zoomToFit shrinks everything into view.
    if (chargeForce?.strength) chargeForce.strength(-260 - Math.min(400, nodeCount * 6));
    const linkForce = fg.d3Force('link');
    if (linkForce?.distance) linkForce.distance(140 + Math.min(60, nodeCount * 2));
    fg.d3Force('collide', forceCollide((node: GraphNode) => estimateLabelRadius(node)).iterations(4));
    fg.d3ReheatSimulation();
  }, [data]);

  const handleNodeClick = useCallback((node: NodeObject<GraphNode>) => {
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, reducedMotion ? 0 : 400);
      fgRef.current.zoom(2, reducedMotion ? 0 : 400);
    }
    onNodeClick(node.id);
  }, [onNodeClick, reducedMotion]);

  const paintNode = useCallback((node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = node.id === selectedNodeId;
    const isHovered = node.id === hoverNodeId;
    const isDimmed = hoverNodeId !== null && !neighborsRef.current.get(hoverNodeId)?.has(node.id);
    const size = 15;
    const { x, y } = node;
    if (x === undefined || y === undefined) return;

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.28 : 1;

    // Flagged glow (frozen intensity when reduced motion is requested)
    if (node.isFlagged) {
      const t = reducedMotion ? 0.75 : 0.55 + Math.abs(Math.sin(Date.now() / 650)) * 0.45;
      ctx.shadowColor = COLORS.flagged;
      ctx.shadowBlur = 14 * t;
    }

    ctx.beginPath();
    if (node.type === 'person') {
      ctx.arc(x, y, size, 0, 2 * Math.PI, false);
    } else {
      roundedRectPath(ctx, x - size, y - size, size * 2, size * 2, 4);
    }

    ctx.fillStyle = isHovered || isSelected ? COLORS.surfaceRaised : COLORS.surface;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = isSelected ? 2.25 : isHovered ? 1.75 : 1.25;
    ctx.strokeStyle = isSelected
      ? COLORS.accentGold
      : node.isFlagged
        ? COLORS.flagged
        : isHovered
          ? COLORS.borderStrong
          : COLORS.border;
    ctx.stroke();
    ctx.restore();

    const iconColor = isSelected ? COLORS.accentGold : node.isFlagged ? COLORS.flagged : COLORS.textMuted;
    if (node.type === 'person') {
      drawPersonIcon(ctx, x, y, size, iconColor);
    } else {
      drawBuildingIcon(ctx, x, y, size * 1.6, iconColor);
    }

    // Flagged indicator badge — color is never the only signal
    if (node.isFlagged) {
      const bx = x + size * 0.68;
      const by = y - size * 0.68;
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, 2 * Math.PI);
      ctx.fillStyle = COLORS.flagged;
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bx, by + 0.5);
    }

    // Labels — only render once zoomed in enough to stay legible, with a
    // background pill so they read clearly over the dotted grid and edges.
    if (globalScale > 0.55) {
      ctx.globalAlpha = isDimmed ? 0.35 : 1;
      const fontSize = 12 / globalScale;
      const subFontSize = 9.5 / globalScale;
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      const labelWidth = ctx.measureText(node.label).width;
      ctx.font = `${subFontSize}px "IBM Plex Mono", monospace`;
      const subWidth = ctx.measureText(node.sublabel).width;
      const pillWidth = Math.max(labelWidth, subWidth) + 12 / globalScale;
      const pillX = x - pillWidth / 2;
      const pillY = y + size + 3 / globalScale;
      const pillHeight = (fontSize + subFontSize + 10) / globalScale;

      roundedRectPath(ctx, pillX, pillY, pillWidth, pillHeight, 3 / globalScale);
      ctx.fillStyle = 'rgba(11, 13, 16, 0.72)';
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(node.label, x, pillY + 3 / globalScale);

      ctx.font = `${subFontSize}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(node.sublabel, x, pillY + 3 / globalScale + fontSize + 2 / globalScale);
      ctx.globalAlpha = 1;
    }

    if (isSelected) {
      ctx.beginPath();
      if (node.type === 'person') {
        ctx.arc(x, y, size + 5, 0, 2 * Math.PI, false);
      } else {
        roundedRectPath(ctx, x - size - 5, y - size - 5, size * 2 + 10, size * 2 + 10, 6);
      }
      ctx.strokeStyle = COLORS.accentGold;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [selectedNodeId, hoverNodeId, reducedMotion]);

  const paintLink = useCallback((link: LinkObject<GraphNode, GraphEdge>, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source as GraphNode | undefined;
    const end = link.target as GraphNode | undefined;
    if (!start || !end || start.x === undefined || end.x === undefined || end.y === undefined || start.y === undefined) return;

    const isDimmed = hoverNodeId !== null && start.id !== hoverNodeId && end.id !== hoverNodeId;

    let opacity = isDimmed ? 0.15 : 1;
    let width = 1.1;
    let color: string = COLORS.border;

    if (link.isFlagged) {
      const pulse = reducedMotion ? 0.85 : 0.55 + Math.abs(Math.sin(Date.now() / 500)) * 0.45;
      opacity *= pulse;
      width = 1.75 + (reducedMotion ? 0.5 : Math.abs(Math.sin(Date.now() / 500)));
      color = COLORS.flagged;
    } else {
      color = COLORS.verified;
      opacity *= 0.7;
    }

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity;
    ctx.lineWidth = width;
    ctx.stroke();

    // Directional arrowhead pointing at the target (who transacted with what)
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const nodeRadius = 15;
    const ax = end.x - Math.cos(angle) * (nodeRadius + 2);
    const ay = end.y - Math.sin(angle) * (nodeRadius + 2);
    const arrowSize = 5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - arrowSize * Math.cos(angle - Math.PI / 7), ay - arrowSize * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(ax - arrowSize * Math.cos(angle + Math.PI / 7), ay - arrowSize * Math.sin(angle + Math.PI / 7));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Role label at the link midpoint, only once zoomed in enough to matter
    if (link.label && globalScale > 1.1 && !isDimmed) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const fontSize = 9 / globalScale;
      ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
      const w = ctx.measureText(link.label).width + 8 / globalScale;
      const h = fontSize + 6 / globalScale;
      roundedRectPath(ctx, mx - w / 2, my - h / 2, w, h, 2 / globalScale);
      ctx.fillStyle = 'rgba(11, 13, 16, 0.85)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(link.label, mx, my + 0.5 / globalScale);
    }

    ctx.globalAlpha = 1;
  }, [hoverNodeId, reducedMotion]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="absolute inset-0 z-0" ref={containerRef}>
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data as any}
        nodeId="id"
        nodeCanvasObject={paintNode as any}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          if (node.x === undefined || node.y === undefined) return;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 17, 0, 2 * Math.PI);
          ctx.fill();
        }}
        linkCanvasObject={paintLink as any}
        linkColor={(link: any) => (link.isFlagged ? COLORS.flagged : COLORS.verified)}
        linkDirectionalParticles={reducedMotion ? 0 : (link: any) => (link.isFlagged ? 2 : 0)}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() => COLORS.flagged}
        backgroundColor="rgba(0,0,0,0)"
        onNodeClick={handleNodeClick as any}
        onNodeHover={(node: any) => {
          setHoverNodeId(node ? node.id : null);
          if (containerRef.current) containerRef.current.style.cursor = node ? 'pointer' : 'default';
        }}
        onBackgroundClick={onBackgroundClick}
        onEngineStop={() => fgRef.current?.zoomToFit(reducedMotion ? 0 : 400, 64)}
        cooldownTicks={200}
        d3VelocityDecay={0.35}
        // Labels only render above globalScale 0.55 (see paintNode); without a
        // floor here, zoomToFit happily zooms out past that on larger graphs
        // to fit every node, leaving a graph with no visible labels at all.
        // Below this floor the user pans/scrolls to see the rest instead.
        minZoom={0.6}
      />
    </div>
  );
}
