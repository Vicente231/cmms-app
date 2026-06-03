import { useQuery } from '@tanstack/react-query'
import { gasGet } from '@/lib/api'
import type { GASInventoryTransaction } from '@/lib/api'

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

function mapTx(t: GASInventoryTransaction): UITransaction {
  return {
    id:          t.tx_id,
    partId:      t.part_id,
    partName:    t.part_name,
    partNumber:  t.part_number,
    txType:      (t.tx_type?.toUpperCase() as UITransaction['txType']) || 'ADJUSTED',
    qty:         Number(t.qty) || 0,
    unitCost:    Number(t.unit_cost) || 0,
    balanceAfter: Number(t.balance_after) || 0,
    woId:        t.wo_id || '',
    reference:   t.reference || '',
    notes:       t.notes || '',
    createdAt:   t.created_at || '',
  }
}

const useAllTransactions = () =>
  useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const rows = await gasGet<GASInventoryTransaction[]>('inventoryTransactions')
      return rows.map(mapTx).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
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
