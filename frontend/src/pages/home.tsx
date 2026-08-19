import React, { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphLegend } from '@/components/graph/GraphLegend';
import { GraphSkeleton } from '@/components/graph/GraphSkeleton';
import { DossierPanel } from '@/components/dossier/DossierPanel';
import { DossierContent } from '@/components/dossier/DossierContent';
import { DossierSkeleton } from '@/components/dossier/DossierSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { RiskFilter } from '@/components/search/FilterPanel';
import { filterGraph } from '@/lib/filterGraph';
import { useSearchGraph, useEntityDetails } from '@/hooks/useGraphData';

const EXAMPLE_SEARCHES = ['Marcus Whitfield', 'Harbor View Blvd', 'Ray Delgado'];
const MAX_RECENT_SEARCHES = 6;

export default function Home() {
  const [query, setQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Mobile drawer states
  const [isSidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  const {
    data: graphData,
    isLoading: isGraphLoading,
    isError: isGraphError,
    error: graphError,
    refetch: refetchGraph,
  } = useSearchGraph(query);

  const { data: entityData, isLoading: isEntityLoading } = useEntityDetails(selectedNodeId);

  const filteredGraph = useMemo(
    () => (graphData ? filterGraph(graphData, riskFilter) : undefined),
    [graphData, riskFilter],
  );

  const handleSearch = (newQuery: string) => {
    const trimmed = newQuery.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSelectedNodeId(null);
    setRiskFilter('all');
    setSidebarOpenMobile(false);
    setRecentSearches((prev) => [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT_SEARCHES));
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const handleDossierClose = () => {
    setSelectedNodeId(null);
  };

  let canvasContent = null;
  if (!query) {
    canvasContent = (
      <EmptyState
        message="Search a property address or a person's name to map its ownership network and surface hidden connections."
        examples={EXAMPLE_SEARCHES}
        onExampleClick={handleSearch}
      />
    );
  } else if (isGraphLoading) {
    canvasContent = <GraphSkeleton />;
  } else if (isGraphError) {
    canvasContent = (
      <ErrorState message={(graphError as Error)?.message || 'An unknown error occurred.'} onRetry={() => refetchGraph()} />
    );
  } else if (filteredGraph) {
    canvasContent = filteredGraph.nodes.length === 0 ? (
      <EmptyState message={`No entities found for "${query}". Try a different name or address.`} />
    ) : (
      <>
        <GraphCanvas
          data={filteredGraph}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleDossierClose}
          selectedNodeId={selectedNodeId}
        />
        <GraphLegend />
      </>
    );
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          onSearch={handleSearch}
          riskFilter={riskFilter}
          onRiskFilterChange={setRiskFilter}
          filterDisabled={!graphData || graphData.nodes.length === 0}
          recentSearches={recentSearches}
        />
      }
      canvas={canvasContent}
      dossier={
        <DossierPanel
          entity={entityData || null}
          isOpen={!!selectedNodeId}
          isLoading={isEntityLoading}
          onClose={handleDossierClose}
        />
      }
      isSidebarOpenMobile={isSidebarOpenMobile}
      setSidebarOpenMobile={setSidebarOpenMobile}
      isDossierOpenMobile={!!selectedNodeId}
      setDossierOpenMobile={(open) => {
        if (!open) setSelectedNodeId(null);
      }}
      mobileDossierContent={
        entityData ? (
          <DossierContent entity={entityData} hideHeaderClose />
        ) : isEntityLoading ? (
          <DossierSkeleton />
        ) : null
      }
    />
  );
}
