import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Part, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'parts'

export const useParts = (params?: Record<string, string | number | boolean>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<Part>>>('/parts', { params })
      return data.data
    },
  })

export const usePart = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Part>>(`/parts/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Part>) => {
      const { data } = await api.post<ApiResponse<Part>>('/parts', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Part> & { id: number }) => {
      const { data } = await api.put<ApiResponse<Part>>(`/parts/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/parts/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
