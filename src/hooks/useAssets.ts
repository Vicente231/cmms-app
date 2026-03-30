import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASAsset } from '@/lib/api'
import type { Asset, AssetStatus, PaginatedResponse } from '@/types'

const KEY = 'assets'

function idNum(asset_id: string): number {
  return parseInt(asset_id?.replace('AST-', '') || '0', 10) || 0
}

function toAssetId(id: number): string {
  return 'AST-' + String(id).padStart(6, '0')
}

function mapAsset(a: GASAsset): Asset {
  return {
    id: idNum(a.asset_id),
    orgId: 0,
    name: a.asset_name,
    assetTag: a.asset_id,
    serialNumber: a.serial_number,
    manufacturer: a.manufacturer,
    model: a.asset_type,
    criticality: a.criticality,
    status: (a.status?.toLowerCase().replace(/ /g, '_') as AssetStatus) || 'active',
    warrantyExpiry: a.warranty_expiry || undefined,
    description: a.notes,
    location: a.location ? { id: 0, name: a.location } : undefined,
    parentAsset: a.parent_asset ? { id: 0, name: a.parent_asset, assetTag: a.parent_asset } : undefined,
    createdAt: a.install_date || '',
    updatedAt: '',
  }
}

function toPaged(all: Asset[], params?: Record<string, string | number>): PaginatedResponse<Asset> {
  const search = String(params?.search || '').toLowerCase().trim()
  const page   = Number(params?.page  || 1)
  const limit  = Number(params?.limit || all.length || 20)

  const filtered = search
    ? all.filter((a) =>
        a.name?.toLowerCase().includes(search) ||
        a.assetTag?.toLowerCase().includes(search) ||
        a.manufacturer?.toLowerCase().includes(search) ||
        a.serialNumber?.toLowerCase().includes(search) ||
        a.model?.toLowerCase().includes(search) ||
        a.location?.name?.toLowerCase().includes(search)
      )
    : all

  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start      = (page - 1) * limit
  const data       = filtered.slice(start, start + limit)

  return {
    data,
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  }
}

type AssetSearchField = 'name' | 'id' | 'type' | 'parent' | 'location' | 'criticality' | 'status'

export const useAssets = (search = '', page = 1, limit = 20, searchField: AssetSearchField = 'name') => {
  const query = useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASAsset[]>('assets')
      return rows.map(mapAsset)
    },
  })

  const all = query.data ?? []
  const term = search.toLowerCase().trim()

  const getFieldValue = (a: Asset): string => {
    switch (searchField) {
      case 'id':          return a.assetTag ?? ''
      case 'name':        return a.name ?? ''
      case 'type':        return a.model ?? ''
      case 'parent':      return a.parentAsset?.name ?? ''
      case 'location':    return a.location?.name ?? ''
      case 'criticality': return a.criticality ?? ''
      case 'status':      return a.status ?? ''
    }
  }

  const filtered = term
    ? all.filter((a) => getFieldValue(a).toLowerCase().includes(term))
    : all

  const totalPages = Math.max(1, Math.ceil(filtered.length / limit))
  const start = (page - 1) * limit
  const data: PaginatedResponse<Asset> = {
    data: filtered.slice(start, start + limit),
    pagination: { total: filtered.length, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  }

  return { data, isLoading: query.isLoading }
}

export const useAsset = (id: number) => {
  const query = useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASAsset[]>('assets')
      return rows.map(mapAsset)
    },
    enabled: !!id,
  })
  return { data: (query.data ?? []).find((a) => a.id === id) ?? null, isLoading: query.isLoading }
}

export const useCreateAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Asset>) =>
      gasPost<{ success: boolean; asset_id: string }>('createAsset', {
        asset_name: body.name || '',
        asset_type: body.model || '',
        location: (body.location as { name?: string } | undefined)?.name || '',
        status: body.status?.toUpperCase() || 'ACTIVE',
        serial_number: body.serialNumber || '',
        manufacturer: body.manufacturer || '',
        notes: body.description || '',
        warranty_expiry: body.warrantyExpiry || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Asset> & { id: number }) =>
      gasPost<{ success: boolean }>('updateAsset', {
        asset_id: toAssetId(id),
        updates: {
          asset_name: body.name,
          asset_type: body.model,
          status: body.status?.toUpperCase(),
          serial_number: body.serialNumber,
          manufacturer: body.manufacturer,
          notes: body.description,
          warranty_expiry: body.warrantyExpiry,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deleteAsset', { asset_id: toAssetId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
