import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import type { ColumnDef } from '@tanstack/react-table'
import type { InventoryTransaction, PaginatedResponse, ApiResponse } from '@/types'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const txTypeColors: Record<string, string> = {
  received: 'bg-green-100 text-green-800',
  issued: 'bg-red-100 text-red-800',
  adjustment: 'bg-blue-100 text-blue-800',
  return: 'bg-yellow-100 text-yellow-800',
  transfer: 'bg-purple-100 text-purple-800',
}

export function InventoryTransactionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transactions', page],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResponse<InventoryTransaction>>>('/inventory-transactions', { params: { page, limit: 20 } })
      return data.data
    },
  })

  const columns: ColumnDef<InventoryTransaction>[] = [
    { accessorKey: 'transactionDate', header: 'Date', cell: ({ row }) => format(new Date(row.original.transactionDate), 'MMM d, yyyy HH:mm') },
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
    { accessorKey: 'performer', header: 'By', cell: ({ row }) => row.original.performer ? `${row.original.performer.firstName} ${row.original.performer.lastName}` : '-' },
    { accessorKey: 'referenceNumber', header: 'Reference', cell: ({ row }) => row.original.referenceNumber || '-' },
    { accessorKey: 'notes', header: 'Notes', cell: ({ row }) => <span className="text-sm text-muted-foreground max-w-xs truncate block">{row.original.notes || '-'}</span> },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Inventory Transactions</h1><p className="text-muted-foreground">Read-only ledger of all inventory movements</p></div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />
    </div>
  )
}
