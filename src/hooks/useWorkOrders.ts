import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { WorkOrder, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'work-orders'

export const useWorkOrders = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<WorkOrder>>>('/work-orders', { params })
      return data.data
    },
  })

export const useWorkOrder = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<WorkOrder>>(`/work-orders/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<WorkOrder>) => {
      const { data } = await api.post<ApiResponse<WorkOrder>>('/work-orders', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<WorkOrder> & { id: number }) => {
      const { data } = await api.put<ApiResponse<WorkOrder>>(`/work-orders/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/work-orders/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/work-orders/dashboard')
      return data.data
    },
  })
