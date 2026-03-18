import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { PurchaseOrder, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'purchase-orders'

export const usePurchaseOrders = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<PurchaseOrder>>>('/purchase-orders', { params })
      return data.data
    },
  })

export const usePurchaseOrder = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PurchaseOrder> & { lines?: unknown[] }) => {
      const { data } = await api.post<ApiResponse<PurchaseOrder>>('/purchase-orders', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PurchaseOrder> & { id: number }) => {
      const { data } = await api.put<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/purchase-orders/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
