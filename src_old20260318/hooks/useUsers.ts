import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { User, Role, PaginatedResponse, ApiResponse } from '@/types'

const KEY = 'users'

export const useUsers = (params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<User>>>('/users', { params })
      return data.data
    },
  })

export const useUser = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User>>(`/users/${id}`)
      return data.data
    },
    enabled: !!id,
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<User> & { password: string }) => {
      const { data } = await api.post<ApiResponse<User>>('/users', body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<User> & { id: number }) => {
      const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, body)
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useRoles = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Role[]>>('/roles')
      return data.data
    },
  })
