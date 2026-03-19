import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Part, PaginatedResponse } from '@/types'

const empty = (): PaginatedResponse<Part> => ({
  data: [],
  pagination: { total: 0, page: 1, limit: 0, totalPages: 0, hasNext: false, hasPrev: false },
})

export const useParts = (_params?: Record<string, string | number | boolean>) =>
  useQuery({ queryKey: ['parts'], queryFn: async () => empty() })

export const usePart = (_id: number) =>
  useQuery({ queryKey: ['parts', _id], queryFn: async () => null, enabled: false })

export const useCreatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<Part>) => ({} as Part),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}

export const useUpdatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<Part> & { id: number }) => ({} as Part),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}

export const useDeletePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  })
}
