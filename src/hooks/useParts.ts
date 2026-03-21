import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASPart } from '@/lib/api'
import type { Part, PaginatedResponse } from '@/types'

const KEY = 'parts'

function idNum(part_id: string): number {
  return parseInt(part_id?.replace('PRT-', '') || '0', 10) || 0
}

function toPartId(id: number): string {
  return 'PRT-' + String(id).padStart(4, '0')
}

function mapPart(p: GASPart): Part {
  return {
    id: idNum(p.part_id),
    orgId: 0,
    name: p.name,
    partNumber: p.part_number || undefined,
    category: p.category ? { id: 0, name: p.category } : undefined,
    preferredVendor: p.preferred_vendor ? { id: 0, name: p.preferred_vendor } : undefined,
    unitOfMeasure: p.unit_of_measure || 'EA',
    unitCost: parseFloat(p.unit_cost || '0') || 0,
    quantityOnHand: parseFloat(p.quantity_on_hand || '0') || 0,
    minimumQuantity: parseFloat(p.minimum_quantity || '0') || 0,
    reorderQuantity: parseFloat(p.reorder_quantity || '0') || 0,
    storageLocation: p.storage_location || undefined,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(items: Part[]): PaginatedResponse<Part> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const useParts = (_params?: Record<string, string | number | boolean>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASPart[]>('parts')
      return toPaged(rows.map(mapPart))
    },
  })

export const usePart = (_id: number) =>
  useQuery({ queryKey: [KEY, _id], queryFn: async () => null, enabled: false })

export const useCreatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Part>) =>
      gasPost<{ success: boolean }>('createPart', {
        name: body.name || '',
        part_number: body.partNumber || '',
        category: (body.category as { name?: string } | undefined)?.name || '',
        unit_of_measure: body.unitOfMeasure || 'EA',
        unit_cost: String(body.unitCost || 0),
        quantity_on_hand: String(body.quantityOnHand || 0),
        minimum_quantity: String(body.minimumQuantity || 0),
        reorder_quantity: String(body.reorderQuantity || 0),
        storage_location: body.storageLocation || '',
        preferred_vendor: (body.preferredVendor as { name?: string } | undefined)?.name || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Part> & { id: number }) =>
      gasPost<{ success: boolean }>('updatePart', {
        part_id: toPartId(id),
        updates: {
          name: body.name,
          part_number: body.partNumber,
          unit_of_measure: body.unitOfMeasure,
          unit_cost: body.unitCost !== undefined ? String(body.unitCost) : undefined,
          quantity_on_hand: body.quantityOnHand !== undefined ? String(body.quantityOnHand) : undefined,
          minimum_quantity: body.minimumQuantity !== undefined ? String(body.minimumQuantity) : undefined,
          reorder_quantity: body.reorderQuantity !== undefined ? String(body.reorderQuantity) : undefined,
          storage_location: body.storageLocation,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deletePart', { part_id: toPartId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
