import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Location, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'locations'

export const useLocations = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Location>>>('/locations', { params })
      return data.data
    },
  })

export const useLocation = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Location>>(`/locations/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Location>) => {
      const { data } = await api.post<ApiResponse<Location>>('/locations', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Location> & { id: number }) => {
      const { data } = await api.put<ApiResponse<Location>>(`/locations/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/locations/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
