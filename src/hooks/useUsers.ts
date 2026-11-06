import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { User, PaginatedResponse } from '@/types'

const KEY = 'users'

interface ProfileRow {
  id: string
  name: string
  role: string
  email: string
  avatar: string
}

function mapProfile(p: ProfileRow): User {
  const parts = p.name?.trim().split(' ') || ['']
  return {
    id: 0,  // profiles don't have int ids; avatarUrl not used
    orgId: 0,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    email: p.email || '',
    avatarUrl: p.avatar || undefined,
    role: { id: 0, name: p.role || 'technician' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(items: User[]): PaginatedResponse<User> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const useUsers = (_params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return toPaged((data ?? []).map(mapProfile))
    },
  })

export const useUser = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async (): Promise<User | null> => null,
    enabled: false,
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<User> & { password: string }) => {
      const { error } = await supabase.auth.admin.createUser({
        email: body.email || '',
        password: body.password,
        user_metadata: {
          name: `${body.firstName || ''} ${body.lastName || ''}`.trim(),
        },
      })
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_body: Partial<User> & { id: number }) => {
      // Profile updates require knowing the UUID; skip for now
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: number) => ({ success: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useRoles = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: async () => [
      { id: 1, name: 'admin',       description: 'Administrator', permissions: {}, isSystem: true, createdAt: '', updatedAt: '' },
      { id: 2, name: 'supervisor',  description: 'Supervisor',    permissions: {}, isSystem: true, createdAt: '', updatedAt: '' },
      { id: 3, name: 'technician',  description: 'Technician',    permissions: {}, isSystem: true, createdAt: '', updatedAt: '' },
    ],
  })
