/**
 * api.ts — single interface for all backend calls.
 *
 * Always calls the real CognoDB-backed Express server, configured via
 * VITE_API_URL. If unset, requests fall back to same-origin relative paths
 * (e.g. `/api/search`) rather than any hardcoded host — in a dev setup with
 * no backend co-located on that origin this fails loudly with a real network
 * error, which is the correct behavior: silently substituting mock data here
 * would hide a real misconfiguration. mockApi.ts still exists as a reference/
 * fallback but nothing in the active code path imports it anymore — import
 * it directly in a dev script if you need to work on UI without a backend
 * running.
 *
 * To point at a different backend, set VITE_API_URL in frontend/.env:
 *   VITE_API_URL=http://localhost:5000
 */
import type { GraphData, GraphNode, EntityDetails } from './types';
import type { ImportPreview, ImportSummary, ManualEntryRow, TargetField } from './importTypes';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function handleResponse<T>(fetchCall: () => Promise<Response>): Promise<T> {
  let res: Response;
  try {
    res = await fetchCall();
  } catch {
    // fetch() itself throws (not an HTTP error response) when the server is
    // completely unreachable — e.g. TypeError: "fetch failed" / "Failed to
    // fetch". That raw message means nothing to a non-technical user, so
    // it's normalized here into the same kind of plain-language message the
    // backend already returns for its own connection failures.
    throw new Error('Could not reach the server. Check that the backend is running and try again.');
  }
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

function apiGet<T>(path: string): Promise<T> {
  return handleResponse<T>(() => fetch(`${API_BASE}${path}`));
}

function apiPost<T>(path: string, body: unknown): Promise<T> {
  return handleResponse<T>(() =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

export const api = {
  async search(query: string): Promise<GraphData> {
    return apiGet<GraphData>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  async getEntityDetails(id: string): Promise<EntityDetails> {
    return apiGet<EntityDetails>(`/api/entity/${encodeURIComponent(id)}`);
  },

  async listEntities(): Promise<GraphNode[]> {
    const { nodes } = await apiGet<{ nodes: GraphNode[] }>('/api/entities');
    return nodes;
  },

  async importPreview(csvContent: string): Promise<ImportPreview> {
    return apiPost<ImportPreview>('/api/import/preview', { csvContent });
  },

  async importCommit(csvContent: string, mapping: Record<string, TargetField | null>): Promise<ImportSummary> {
    return apiPost<ImportSummary>('/api/import/commit', { csvContent, mapping });
  },

  async importManual(row: ManualEntryRow): Promise<ImportSummary> {
    return apiPost<ImportSummary>('/api/import/manual', row);
  },
};
