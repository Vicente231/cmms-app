import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Vendor, PaginatedResponse } from '@/types'

const empty = (): PaginatedResponse<Vendor> => ({
  data: [],
  pagination: { total: 0, page: 1, limit: 0, totalPages: 0, hasNext: false, hasPrev: false },
})

export const useVendors = (_params?: Record<string, string | number>) =>
  useQuery({ queryKey: ['vendors'], queryFn: async () => empty() })

export const useVendor = (_id: number) =>
  useQuery({ queryKey: ['vendors', _id], queryFn: async () => null, enabled: false })

export const useCreateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<Vendor>) => ({} as Vendor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
}

export const useUpdateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<Vendor> & { id: number }) => ({} as Vendor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
}

export const useDeleteVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })
}
