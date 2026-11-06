import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { COST_CODES } from '@/data/costCodes'
import { openPrintPurchaseRequisition, type PRPrintData } from '@/utils/printPurchaseRequisition'

const KEY = 'purchase-requisitions'

export type SavedPRItem = {
  item_id: number
  pr_id: string
  description: string
  part_number: string
  qty: number
  unit: string
  unit_cost: number
  extended_cost: number
}

export type SavedPR = {
  pr_id: string
  date: string | null
  requested_by: string
  department: string
  required_by: string | null
  vendor_name: string
  vendor_contact: string
  cost_code: string
  tax_rate: number
  justification: string
  status: string
  subtotal: number
  tax_amount: number
  total: number
  created_at: string
  updated_at: string
  purchase_requisition_items: SavedPRItem[]
}

export const PR_STATUSES = ['pending', 'approved', 'rejected', 'ordered'] as const

export const usePurchaseRequisitions = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requisitions')
        .select('*, purchase_requisition_items(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SavedPR[]
    },
  })

export const useCreatePR = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: PRPrintData) => {
      const subtotal = data.lineItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitCost) || 0), 0)
      const taxAmt   = subtotal * (Number(data.taxRate) || 0) / 100
      const total    = subtotal + taxAmt

      const { error } = await supabase.from('purchase_requisitions').insert({
        pr_id:          data.prNumber,
        date:           data.date       || null,
        requested_by:   data.requestedBy   || '',
        department:     data.department    || '',
        required_by:    data.requiredBy    || null,
        vendor_name:    data.vendorName    || '',
        vendor_contact: data.vendorContact || '',
        cost_code:      data.costCode      || '',
        tax_rate:       Number(data.taxRate) || 5,
        justification:  data.justification || '',
        status:         'pending',
        subtotal,
        tax_amount:     taxAmt,
        total,
      })
      if (error) throw error

      const validItems = data.lineItems.filter(it => it.description?.trim())
      if (validItems.length > 0) {
        const { error: itemErr } = await supabase.from('purchase_requisition_items').insert(
          validItems.map(it => ({
            pr_id:         data.prNumber,
            description:   it.description   || '',
            part_number:   it.partNumber    || '',
            qty:           Number(it.qty)   || 1,
            unit:          it.unit          || 'each',
            unit_cost:     Number(it.unitCost) || 0,
            extended_cost: (Number(it.qty) || 0) * (Number(it.unitCost) || 0),
          }))
        )
        if (itemErr) throw itemErr
      }

      return { pr_id: data.prNumber }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePR = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: PRPrintData) => {
      const subtotal = data.lineItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitCost) || 0), 0)
      const taxAmt   = subtotal * (Number(data.taxRate) || 0) / 100
      const total    = subtotal + taxAmt

      const { error } = await supabase.from('purchase_requisitions').update({
        date:           data.date          || null,
        requested_by:   data.requestedBy   || '',
        department:     data.department    || '',
        required_by:    data.requiredBy    || null,
        vendor_name:    data.vendorName    || '',
        vendor_contact: data.vendorContact || '',
        cost_code:      data.costCode      || '',
        tax_rate:       Number(data.taxRate) || 5,
        justification:  data.justification || '',
        subtotal,
        tax_amount:     taxAmt,
        total,
        updated_at:     new Date().toISOString(),
      }).eq('pr_id', data.prNumber)
      if (error) throw error

      const { error: delErr } = await supabase.from('purchase_requisition_items').delete().eq('pr_id', data.prNumber)
      if (delErr) throw delErr

      const validItems = data.lineItems.filter(it => it.description?.trim())
      if (validItems.length > 0) {
        const { error: itemErr } = await supabase.from('purchase_requisition_items').insert(
          validItems.map(it => ({
            pr_id:         data.prNumber,
            description:   it.description   || '',
            part_number:   it.partNumber    || '',
            qty:           Number(it.qty)   || 1,
            unit:          it.unit          || 'each',
            unit_cost:     Number(it.unitCost) || 0,
            extended_cost: (Number(it.qty) || 0) * (Number(it.unitCost) || 0),
          }))
        )
        if (itemErr) throw itemErr
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePRStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ prId, status }: { prId: string; status: string }) => {
      const { error } = await supabase
        .from('purchase_requisitions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('pr_id', prId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePR = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (prId: string) => {
      const { error } = await supabase.from('purchase_requisitions').delete().eq('pr_id', prId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function printSavedPR(pr: SavedPR) {
  const meta = COST_CODES.find(c => c.code === pr.cost_code)
  openPrintPurchaseRequisition({
    prNumber:       pr.pr_id,
    date:           pr.date           || '',
    requestedBy:    pr.requested_by,
    department:     pr.department,
    requiredBy:     pr.required_by    || '',
    vendorName:     pr.vendor_name,
    vendorContact:  pr.vendor_contact,
    costCode:       pr.cost_code,
    costCodeMeta:   meta,
    taxRate:        pr.tax_rate,
    justification:  pr.justification,
    lineItems:      pr.purchase_requisition_items.map(it => ({
      description: it.description,
      partNumber:  it.part_number,
      qty:         it.qty,
      unit:        it.unit,
      unitCost:    it.unit_cost,
    })),
  })
}
