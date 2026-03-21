import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASPurchaseOrder } from '@/lib/api'
import type { PurchaseOrder, PoStatus, PaginatedResponse } from '@/types'

const KEY = 'purchase-orders'

function idNum(po_id: string): number {
  return parseInt(po_id?.replace('PO-', '') || '0', 10) || 0
}

function toPoId(id: number): string {
  return 'PO-' + String(id).padStart(4, '0')
}

function mapPO(p: GASPurchaseOrder): PurchaseOrder {
  return {
    id: idNum(p.po_id),
    orgId: 0,
    vendorId: 0,
    vendor: p.vendor ? { id: 0, name: p.vendor } : undefined,
    poNumber: p.po_id,
    status: (p.status?.toLowerCase() as PoStatus) || 'draft',
    orderDate: p.order_date || undefined,
    expectedDate: p.expected_date || undefined,
    subtotal: parseFloat(p.total || '0') || 0,
    tax: 0,
    total: parseFloat(p.total || '0') || 0,
    notes: p.notes || undefined,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(items: PurchaseOrder[]): PaginatedResponse<PurchaseOrder> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const usePurchaseOrders = (_params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASPurchaseOrder[]>('purchaseOrders')
      return toPaged(Array.isArray(rows) ? rows.map(mapPO) : [])
    },
  })

export const usePurchaseOrder = (_id: number) =>
  useQuery({ queryKey: [KEY, _id], queryFn: async () => null, enabled: false })

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PurchaseOrder> & { lines?: unknown[] }) =>
      gasPost<{ success: boolean }>('createPurchaseOrder', {
        vendor: (body.vendor as { name?: string } | undefined)?.name || '',
        status: body.status || 'draft',
        order_date: body.orderDate || '',
        expected_date: body.expectedDate || '',
        notes: body.notes || '',
        total: String(body.total || 0),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PurchaseOrder> & { id: number }) =>
      gasPost<{ success: boolean }>('updatePurchaseOrder', {
        po_id: toPoId(id),
        updates: {
          status: body.status,
          order_date: body.orderDate,
          expected_date: body.expectedDate,
          notes: body.notes,
          total: body.total !== undefined ? String(body.total) : undefined,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deletePurchaseOrder', { po_id: toPoId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
