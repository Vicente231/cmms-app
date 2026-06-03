import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASPart } from '@/lib/api'
import type { Part, PaginatedResponse } from '@/types'

const KEY = 'parts'

function idNum(part_id: string): number {
  return parseInt(part_id?.replace('PRT-', '') || '0', 10) || 0
}

function toPartId(id: number): string {
  return 'PRT-' + String(id).padStart(6, '0')
}

function mapPart(p: GASPart): Part {
  return {
    id:              idNum(p.part_id),
    orgId:           0,
    partNumber:      p.part_number || '',
    name:            p.name || '',
    description:     p.description || p.notes || '',
    unitOfMeasure:   p.unit || 'each',
    unitCost:        Number(p.unit_cost) || 0,
    quantityOnHand:  Number(p.qty_on_hand) || 0,
    minimumQuantity: Number(p.min_qty) || 0,
    reorderQuantity: Number(p.max_qty) || 0,
    storageLocation: p.location || '',
    category:        p.category ? { id: 0, name: p.category } : undefined,
    preferredVendor: p.supplier ? { id: 0, name: p.supplier } : undefined,
    isActive:        String(p.is_active).toUpperCase() !== 'FALSE',
    createdAt:       '',
    updatedAt:       '',
  }
}

const useAllParts = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASPart[]>('parts')
      return rows.map(mapPart)
    },
  })

export const useParts = (params?: Record<string, string | number | boolean>) => {
  const query = useAllParts()
  const all   = query.data ?? []
  const search = String(params?.search || '').toLowerCase().trim()
  const lowStockOnly = params?.lowStock === true

  let filtered = all
  if (search) filtered = filtered.filter(p =>
    p.name?.toLowerCase().includes(search) ||
    p.partNumber?.toLowerCase().includes(search) ||
    p.category?.name?.toLowerCase().includes(search) ||
    p.storageLocation?.toLowerCase().includes(search)
  )
  if (lowStockOnly) filtered = filtered.filter(p => p.quantityOnHand < p.minimumQuantity)

  const page  = Number(params?.page  || 1)
  const limit = Number(params?.limit || filtered.length || 20)
  const total = filtered.length
  const data: PaginatedResponse<Part> = {
    data: filtered.slice((page - 1) * limit, page * limit),
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
  }
  return { ...query, data }
}

export const usePart = (id: number) => {
  const query = useAllParts()
  return { ...query, data: (query.data ?? []).find(p => p.id === id) ?? null }
}

export type PartFormData = {
  part_number: string; name: string; description: string; category: string
  unit: string; unit_cost: number; qty_on_hand: number; min_qty: number
  max_qty: number; location: string; supplier: string; notes: string
}

export const useCreatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<PartFormData>) =>
      gasPost<{ success: boolean; part_id: string }>('createPart', {
        part_number: body.part_number || '',
        name:        body.name        || '',
        description: body.description || '',
        category:    body.category    || '',
        unit:        body.unit        || 'each',
        unit_cost:   body.unit_cost   ?? 0,
        qty_on_hand: body.qty_on_hand ?? 0,
        min_qty:     body.min_qty     ?? 0,
        max_qty:     body.max_qty     ?? 0,
        location:    body.location    || '',
        supplier:    body.supplier    || '',
        notes:       body.notes       || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<PartFormData> & { id: number }) =>
      gasPost<{ success: boolean }>('updatePart', {
        part_id: toPartId(id),
        updates: {
          part_number: body.part_number,
          name:        body.name,
          description: body.description,
          category:    body.category,
          unit:        body.unit,
          unit_cost:   body.unit_cost,
          qty_on_hand: body.qty_on_hand,
          min_qty:     body.min_qty,
          max_qty:     body.max_qty,
          location:    body.location,
          supplier:    body.supplier,
          notes:       body.notes,
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

// Stock movement mutations — each creates a transaction AND updates qty_on_hand
export const useReceiveStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partId, qty, unitCost, reference, notes }: {
      partId: number; qty: number; unitCost?: number; reference?: string; notes?: string
    }) =>
      gasPost<{ success: boolean }>('createInventoryTransaction', {
        part_id:   toPartId(partId),
        tx_type:   'RECEIVED',
        qty:       qty,
        unit_cost: unitCost ?? 0,
        reference: reference || '',
        notes:     notes     || '',
        wo_id:     '',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partId, newQty, notes }: { partId: number; newQty: number; notes?: string }) =>
      gasPost<{ success: boolean }>('createInventoryTransaction', {
        part_id:   toPartId(partId),
        tx_type:   'ADJUSTED',
        qty:       newQty,
        unit_cost: 0,
        reference: '',
        notes:     notes || '',
        wo_id:     '',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}

export const useIssueStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partId, qty, woId, notes }: {
      partId: number; qty: number; woId?: string; notes?: string
    }) =>
      gasPost<{ success: boolean }>('createInventoryTransaction', {
        part_id:   toPartId(partId),
        tx_type:   'ISSUED',
        qty:       qty,
        unit_cost: 0,
        reference: woId || '',
        notes:     notes || '',
        wo_id:     woId || '',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
