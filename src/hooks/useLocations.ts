import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Location, PaginatedResponse } from '@/types'

const empty = (): PaginatedResponse<Location> => ({
  data: [],
  pagination: { total: 0, page: 1, limit: 0, totalPages: 0, hasNext: false, hasPrev: false },
})

export const useLocations = (_params?: Record<string, string | number>) =>
  useQuery({ queryKey: ['locations'], queryFn: async () => empty() })

export const useLocation = (_id: number) =>
  useQuery({ queryKey: ['locations', _id], queryFn: async () => null, enabled: false })

export const useCreateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<Location>) => ({} as Location),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  })
}

export const useUpdateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<Location> & { id: number }) => ({} as Location),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  })
}

export const useDeleteLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  })
}
