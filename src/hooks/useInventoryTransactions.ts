import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface UITransaction {
  id: string
  partId: string
  partName: string
  partNumber: string
  txType: 'RECEIVED' | 'ISSUED' | 'ADJUSTED' | 'RETURNED'
  qty: number
  unitCost: number
  balanceAfter: number
  woId: string
  reference: string
  notes: string
  createdAt: string
}

function mapTx(t: Record<string, unknown>): UITransaction {
  return {
    id:           String(t.tx_id || ''),
    partId:       String(t.part_id || ''),
    partName:     String(t.part_name || ''),
    partNumber:   String(t.part_number || ''),
    txType:       (String(t.tx_type || '').toUpperCase() as UITransaction['txType']) || 'ADJUSTED',
    qty:          Number(t.qty) || 0,
    unitCost:     Number(t.unit_cost) || 0,
    balanceAfter: Number(t.balance_after) || 0,
    woId:         String(t.wo_id || ''),
    reference:    String(t.reference || ''),
    notes:        String(t.notes || ''),
    createdAt:    String(t.created_at || ''),
  }
}

const useAllTransactions = () =>
  useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapTx)
    },
  })

export const useInventoryTransactions = (partId?: string) => {
  const query = useAllTransactions()
  const all   = query.data ?? []
  return {
    ...query,
    data: partId ? all.filter(t => t.partId === partId) : all,
  }
}

export const useWOTransactions = (woId: string) => {
  const query = useAllTransactions()
  const all   = query.data ?? []
  return {
    ...query,
    data: woId ? all.filter(t => t.woId === woId || t.reference === woId) : [],
  }
}
