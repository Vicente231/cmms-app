import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASVendor } from '@/lib/api'
import type { Vendor, PaginatedResponse } from '@/types'

const KEY = 'vendors'

function idNum(vendor_id: string): number {
  return parseInt(vendor_id?.replace('VND-', '') || '0', 10) || 0
}

function toVendorId(id: number): string {
  return 'VND-' + String(id).padStart(4, '0')
}

function mapVendor(v: GASVendor): Vendor {
  return {
    id: idNum(v.vendor_id),
    orgId: 0,
    name: v.name,
    contactName: v.contact_name || undefined,
    email: v.email || undefined,
    phone: v.phone || undefined,
    address: v.address || undefined,
    website: v.website || undefined,
    paymentTerms: parseInt(v.payment_terms || '0', 10) || 0,
    notes: v.notes || undefined,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(items: Vendor[]): PaginatedResponse<Vendor> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const useVendors = (_params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASVendor[]>('vendors')
      return toPaged(rows.map(mapVendor))
    },
  })

export const useVendor = (_id: number) =>
  useQuery({ queryKey: [KEY, _id], queryFn: async () => null, enabled: false })

export const useCreateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Vendor>) =>
      gasPost<{ success: boolean }>('createVendor', {
        name: body.name || '',
        contact_name: body.contactName || '',
        email: body.email || '',
        phone: body.phone || '',
        address: body.address || '',
        website: body.website || '',
        payment_terms: String(body.paymentTerms || 0),
        notes: body.notes || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Vendor> & { id: number }) =>
      gasPost<{ success: boolean }>('updateVendor', {
        vendor_id: toVendorId(id),
        updates: {
          name: body.name,
          contact_name: body.contactName,
          email: body.email,
          phone: body.phone,
          address: body.address,
          website: body.website,
          payment_terms: body.paymentTerms !== undefined ? String(body.paymentTerms) : undefined,
          notes: body.notes,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deleteVendor', { vendor_id: toVendorId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
