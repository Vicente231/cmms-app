import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASLocation } from '@/lib/api'
import type { Location, PaginatedResponse } from '@/types'

const KEY = 'locations'

function idNum(location_id: string): number {
  return parseInt(location_id?.replace('LOC-', '') || '0', 10) || 0
}

function toLocId(id: number): string {
  return 'LOC-' + String(id).padStart(4, '0')
}

function mapLocation(l: GASLocation): Location {
  return {
    id: idNum(l.location_id),
    orgId: 0,
    name: l.name,
    address: l.address || undefined,
    city: l.city || undefined,
    state: l.state || undefined,
    country: l.country || undefined,
    parent: l.parent ? { id: 0, name: l.parent } : undefined,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(items: Location[]): PaginatedResponse<Location> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const useLocations = (_params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASLocation[]>('locations')
      return toPaged(Array.isArray(rows) ? rows.map(mapLocation) : [])
    },
  })

export const useLocation = (_id: number) =>
  useQuery({ queryKey: [KEY, _id], queryFn: async () => null, enabled: false })

export const useCreateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Location>) =>
      gasPost<{ success: boolean }>('createLocation', {
        name: body.name || '',
        address: body.address || '',
        city: body.city || '',
        state: body.state || '',
        country: body.country || '',
        parent: (body.parent as { name?: string } | undefined)?.name || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Location> & { id: number }) =>
      gasPost<{ success: boolean }>('updateLocation', {
        location_id: toLocId(id),
        updates: {
          name: body.name,
          address: body.address,
          city: body.city,
          state: body.state,
          country: body.country,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deleteLocation', { location_id: toLocId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
