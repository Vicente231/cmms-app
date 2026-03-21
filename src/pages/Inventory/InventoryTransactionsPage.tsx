import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gasGet } from '@/lib/api'
import type { GASInventoryTransaction } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import type { InventoryTransaction, TransactionType } from '@/types'
import { format, parseISO, isValid } from 'date-fns'
import { cn } from '@/lib/utils'

const txTypeColors: Record<string, string> = {
  received: 'bg-green-100 text-green-800',
  issued: 'bg-red-100 text-red-800',
  adjustment: 'bg-blue-100 text-blue-800',
  return: 'bg-yellow-100 text-yellow-800',
  transfer: 'bg-purple-100 text-purple-800',
}

function mapTx(t: GASInventoryTransaction, idx: number): InventoryTransaction {
  return {
    id: idx + 1,
    partId: 0,
    part: t.part_name ? { id: 0, name: t.part_name, partNumber: t.part_number || undefined } : undefined,
    transactionType: (t.transaction_type?.toLowerCase() as TransactionType) || 'adjustment',
    quantity: parseFloat(t.quantity || '0') || 0,
    unitCost: parseFloat(t.unit_cost || '0') || undefined,
    balanceAfter: parseFloat(t.balance_after || '0') || 0,
    performer: t.performed_by ? { id: 0, firstName: t.performed_by, lastName: '' } : undefined,
    referenceNumber: t.reference_number || undefined,
    notes: t.notes || undefined,
    transactionDate: t.transaction_date || new Date().toISOString(),
    createdAt: t.transaction_date || '',
  }
}

function safeFormat(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'MMM d, yyyy HH:mm') : dateStr
  } catch {
    return dateStr
  }
}

export function InventoryTransactionsPage() {
  const [search, setSearch] = useState('')

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: async () => {
      const rows = await gasGet<GASInventoryTransaction[]>('inventoryTransactions')
      return Array.isArray(rows) ? rows.map(mapTx) : []
    },
  })

  const filtered = (transactions || []).filter(t =>
    !search ||
    t.part?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.referenceNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const columns: ColumnDef<InventoryTransaction>[] = [
    { accessorKey: 'transactionDate', header: 'Date', cell: ({ row }) => safeFormat(row.original.transactionDate) },
    { accessorKey: 'part', header: 'Part', cell: ({ row }) => (
      <div>
        <p className="font-medium text-sm">{row.original.part?.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.part?.partNumber}</p>
      </div>
    )},
    { accessorKey: 'transactionType', header: 'Type', cell: ({ row }) => (
      <Badge className={cn('text-xs', txTypeColors[row.original.transactionType] || '')}>{row.original.transactionType}</Badge>
    )},
    { accessorKey: 'quantity', header: 'Qty', cell: ({ row }) => (
      <span className={cn('font-medium', Number(row.original.quantity) > 0 ? 'text-green-600' : 'text-red-600')}>
        {Number(row.original.quantity) > 0 ? '+' : ''}{Number(row.original.quantity)}
      </span>
    )},
    { accessorKey: 'balanceAfter', header: 'Balance', cell: ({ row }) => <span className="font-medium">{Number(row.original.balanceAfter)}</span> },
    { accessorKey: 'performer', header: 'By', cell: ({ row }) => row.original.performer ? `${row.original.performer.firstName} ${row.original.performer.lastName}`.trim() : '-' },
    { accessorKey: 'referenceNumber', header: 'Reference', cell: ({ row }) => row.original.referenceNumber || '-' },
    { accessorKey: 'notes', header: 'Notes', cell: ({ row }) => <span className="text-sm text-muted-foreground max-w-xs truncate block">{row.original.notes || '-'}</span> },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Inventory Transactions</h1><p className="text-muted-foreground">Read-only ledger of all inventory movements</p></div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} searchValue={search} onSearchChange={setSearch} total={filtered.length} />
    </div>
  )
}
