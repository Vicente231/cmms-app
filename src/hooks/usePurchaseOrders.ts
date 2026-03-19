import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PurchaseOrder, PaginatedResponse } from '@/types'

const empty = (): PaginatedResponse<PurchaseOrder> => ({
  data: [],
  pagination: { total: 0, page: 1, limit: 0, totalPages: 0, hasNext: false, hasPrev: false },
})

export const usePurchaseOrders = (_params?: Record<string, string | number>) =>
  useQuery({ queryKey: ['purchase-orders'], queryFn: async () => empty() })

export const usePurchaseOrder = (_id: number) =>
  useQuery({ queryKey: ['purchase-orders', _id], queryFn: async () => null, enabled: false })

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<PurchaseOrder> & { lines?: unknown[] }) => ({} as PurchaseOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<PurchaseOrder> & { id: number }) => ({} as PurchaseOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}

export const useDeletePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: number) => {},
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}
