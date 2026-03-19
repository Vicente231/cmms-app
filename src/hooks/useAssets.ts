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
    status: (a.status?.toLowerCase().replace(/ /g, '_') as AssetStatus) || 'active',
    warrantyExpiry: a.warranty_expiry || undefined,
    description: a.notes,
    location: a.location ? { id: 0, name: a.location } : undefined,
    createdAt: a.install_date || '',
    updatedAt: '',
  }
}

function toPaged(items: Asset[]): PaginatedResponse<Asset> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const useAssets = (_params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASAsset[]>('assets')
      return toPaged(rows.map(mapAsset))
    },
  })

export const useAsset = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const rows = await gasGet<GASAsset[]>('assets')
      const found = rows.find((a) => idNum(a.asset_id) === id)
      return found ? mapAsset(found) : null
    },
    enabled: !!id,
  })

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
