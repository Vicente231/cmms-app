import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Vendor, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'vendors'

export const useVendors = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Vendor>>>('/vendors', { params })
      return data.data
    },
  })

export const useVendor = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Vendor>>(`/vendors/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Vendor>) => {
      const { data } = await api.post<ApiResponse<Vendor>>('/vendors', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Vendor> & { id: number }) => {
      const { data } = await api.put<ApiResponse<Vendor>>(`/vendors/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/vendors/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
