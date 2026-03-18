import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { PmSchedule, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'pm-schedules'

export const usePMSchedules = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<PmSchedule>>>('/pm-schedules', { params })
      return data.data
    },
  })

export const usePMSchedule = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PmSchedule>>(`/pm-schedules/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreatePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PmSchedule>) => {
      const { data } = await api.post<ApiResponse<PmSchedule>>('/pm-schedules', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PmSchedule> & { id: number }) => {
      const { data } = await api.put<ApiResponse<PmSchedule>>(`/pm-schedules/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/pm-schedules/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useGenerateWO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pmId: number) => {
      const { data } = await api.post(`/pm-schedules/${pmId}/generate-wo`)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}
