import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSearchGraph(query: string) {
  return useQuery({
    queryKey: ['searchGraph', query],
    queryFn: () => api.search(query),
    enabled: !!query,
    retry: false,
  });
}

export function useEntityDetails(id: string | null) {
  return useQuery({
    queryKey: ['entityDetails', id],
    queryFn: () => (id ? api.getEntityDetails(id) : Promise.reject('No ID')),
    enabled: !!id,
    retry: false,
  });
}

export function useAllEntities(enabled: boolean) {
  return useQuery({
    queryKey: ['allEntities'],
    queryFn: () => api.listEntities(),
    enabled,
    retry: false,
  });
}
