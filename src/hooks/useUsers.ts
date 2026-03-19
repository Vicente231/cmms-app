import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASUser } from '@/lib/api'
import type { User, PaginatedResponse } from '@/types'

const KEY = 'users'

function mapUser(u: GASUser): User {
  const parts = u.name?.trim().split(' ') || ['']
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  return {
    id: parseInt(u.id?.replace('U', '') || '0', 10) || 0,
    orgId: 0,
    firstName,
    lastName,
    email: u.email,
    role: { id: 0, name: u.role },
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
      const rows = await gasGet<GASUser[]>('users')
      return toPaged(rows.map(mapUser))
    },
  })

export const useUser = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const rows = await gasGet<GASUser[]>('users')
      const found = rows.find((u) => parseInt(u.id.replace('U', '') || '0', 10) === id)
      return found ? mapUser(found) : null
    },
    enabled: !!id,
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<User> & { password: string }) =>
      gasPost<{ success: boolean }>('createUser', {
        name: `${body.firstName || ''} ${body.lastName || ''}`.trim(),
        email: body.email || '',
        password: body.password,
        role: body.role?.name || 'technician',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<User> & { id: number }) =>
      gasPost<{ success: boolean }>('updateUser', {
        id: 'U' + String(id).padStart(3, '0'),
        updates: {
          name: body.firstName && body.lastName ? `${body.firstName} ${body.lastName}` : undefined,
          email: body.email,
          role: body.role?.name,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deleteUser', { id: 'U' + String(id).padStart(3, '0') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

// Roles don't exist in GAS — return the three built-in roles
export const useRoles = () =>
  useQuery({
    queryKey: ['roles'],
    queryFn: async () => [
      { id: 1, name: 'admin', description: 'Administrator', permissions: {}, isSystem: true, createdAt: '', updatedAt: '' },
      { id: 2, name: 'supervisor', description: 'Supervisor', permissions: {}, isSystem: true, createdAt: '', updatedAt: '' },
      { id: 3, name: 'technician', description: 'Technician', permissions: {}, isSystem: true, createdAt: '', updatedAt: '' },
    ],
  })
