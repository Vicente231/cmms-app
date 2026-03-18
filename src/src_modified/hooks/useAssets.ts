import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Asset, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'assets'

export const useAssets = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Asset>>>('/assets', { params })
      return data.data
    },
  })

export const useAsset = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Asset>>(`/assets/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreateAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Asset>) => {
      const { data } = await api.post<ApiResponse<Asset>>('/assets', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Asset> & { id: number }) => {
      const { data } = await api.put<ApiResponse<Asset>>(`/assets/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/assets/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
