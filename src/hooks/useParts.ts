import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GASPart } from '@/lib/api'
import type { Part, PaginatedResponse } from '@/types'

const KEY = 'parts'

function idNum(part_id: string): number {
  return parseInt(part_id?.replace('PRT-', '') || '0', 10) || 0
}

function toPartId(id: number): string {
  return 'PRT-' + String(id).padStart(6, '0')
}

// Form number inputs arrive as strings; an empty one must not reach a NUMERIC column as ""
function num(v: unknown): number {
  const n = Number(v)
  return v === '' || v == null || isNaN(n) ? 0 : n
}

function toAttrs(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {}
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, x == null ? '' : String(x)]))
}

/** Drop blank spec values so the JSON column only holds what was filled in. */
function cleanAttrs(a?: Record<string, string>) {
  return Object.fromEntries(Object.entries(a ?? {}).filter(([, v]) => String(v ?? '').trim() !== ''))
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
    partId:          p.part_id,
    partType:        p.part_type || '',
    attrs:           toAttrs(p.attrs),
    isActive:        p.is_active === true || String(p.is_active).toUpperCase() !== 'FALSE',
    createdAt:       '',
    updatedAt:       '',
  }
}

const useAllParts = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('parts').select('*')
      if (error) throw error
      return (data ?? []).map(mapPart)
    },
  })

export const useParts = (params?: Record<string, string | number | boolean>) => {
  const query = useAllParts()
  const all   = query.data ?? []
  const search = String(params?.search || '').toLowerCase().trim()
  const lowStockOnly = params?.lowStock === true
  const partType = String(params?.partType || '')

  let filtered = all
  if (partType) filtered = filtered.filter(p => p.partType === partType)
  if (search) {
    // Every word must appear somewhere, including spec values (e.g. "15 575 tefc")
    const words = search.split(/\s+/).filter(Boolean)
    filtered = filtered.filter(p => {
      const text = [
        p.name, p.partNumber, p.description, p.category?.name, p.storageLocation,
        p.preferredVendor?.name, p.partType, ...Object.values(p.attrs ?? {}),
      ].filter(Boolean).join(' ').toLowerCase()
      return words.every(w => text.includes(w))
    })
  }
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
  part_type: string; attrs: Record<string, string>
}

export const useCreatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PartFormData>) => {
      const { error } = await supabase.from('parts').insert({
        part_number: body.part_number || '',
        name:        body.name        || '',
        description: body.description || '',
        category:    body.category    || '',
        unit:        body.unit        || 'each',
        unit_cost:   num(body.unit_cost),
        qty_on_hand: num(body.qty_on_hand),
        min_qty:     num(body.min_qty),
        max_qty:     num(body.max_qty),
        location:    body.location    || '',
        supplier:    body.supplier    || '',
        notes:       body.notes       || '',
        part_type:   body.part_type   || '',
        attrs:       cleanAttrs(body.attrs),
      })
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PartFormData> & { id: number }) => {
      const { error } = await supabase.from('parts').update({
        part_number: body.part_number,
        name:        body.name,
        description: body.description,
        category:    body.category,
        unit:        body.unit,
        unit_cost:   body.unit_cost === undefined ? undefined : num(body.unit_cost),
        qty_on_hand: body.qty_on_hand === undefined ? undefined : num(body.qty_on_hand),
        min_qty:     body.min_qty === undefined ? undefined : num(body.min_qty),
        max_qty:     body.max_qty === undefined ? undefined : num(body.max_qty),
        location:    body.location,
        supplier:    body.supplier,
        notes:       body.notes,
        part_type:   body.part_type,
        attrs:       body.attrs === undefined ? undefined : cleanAttrs(body.attrs),
        updated_at:  new Date().toISOString(),
      }).eq('part_id', toPartId(id))
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePart = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      // Document rows cascade with the part; their stored files must be removed separately
      const { data: docs } = await supabase.from('part_documents')
        .select('storage_path').eq('part_id', toPartId(id)).eq('kind', 'file')
      const paths = (docs ?? []).map(d => d.storage_path as string).filter(Boolean)
      if (paths.length) await supabase.storage.from('part-files').remove(paths)

      const { error } = await supabase.from('parts').delete().eq('part_id', toPartId(id))
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

async function applyStockTransaction(
  partIdStr: string,
  txType: string,
  qty: number,
  opts: { unitCost?: number; reference?: string; notes?: string; woId?: string }
) {
  // Get current qty and part info
  const { data: part, error: partErr } = await supabase
    .from('parts').select('qty_on_hand,name,part_number').eq('part_id', partIdStr).single()
  if (partErr) throw partErr

  const current = Number(part.qty_on_hand) || 0
  let balanceAfter: number
  if (txType === 'ADJUSTED') {
    balanceAfter = qty  // qty is the new absolute value
  } else if (txType === 'ISSUED') {
    balanceAfter = current - qty
  } else {
    balanceAfter = current + qty  // RECEIVED / RETURNED
  }

  const { error: updateErr } = await supabase.from('parts')
    .update({ qty_on_hand: balanceAfter, updated_at: new Date().toISOString() })
    .eq('part_id', partIdStr)
  if (updateErr) throw updateErr

  const { error: txErr } = await supabase.from('inventory_transactions').insert({
    part_id:      partIdStr,
    part_name:    part.name,
    part_number:  part.part_number || '',
    tx_type:      txType,
    qty:          txType === 'ADJUSTED' ? balanceAfter - current : qty,
    unit_cost:    opts.unitCost ?? 0,
    balance_after: balanceAfter,
    wo_id:        opts.woId || '',
    reference:    opts.reference || '',
    notes:        opts.notes || '',
  })
  if (txErr) throw txErr
  return { success: true }
}

export const useReceiveStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ partId, qty, unitCost, reference, notes }: {
      partId: number; qty: number; unitCost?: number; reference?: string; notes?: string
    }) => applyStockTransaction(toPartId(partId), 'RECEIVED', qty, { unitCost, reference, notes }),
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
      applyStockTransaction(toPartId(partId), 'ADJUSTED', newQty, { notes }),
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
    }) => applyStockTransaction(toPartId(partId), 'ISSUED', qty, { woId, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
