import { useState } from 'react'
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder } from '@/hooks/usePurchaseOrders'
import { useVendors } from '@/hooks/useVendors'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { PurchaseOrder, PoStatus } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'

const poStatuses: PoStatus[] = ['draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'cancelled']

export function PurchaseOrdersPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null)

  const { data, isLoading } = usePurchaseOrders({ page, limit: 20 })
  const { data: vendors } = useVendors({ limit: 100 })
  const create = useCreatePurchaseOrder()
  const update = useUpdatePurchaseOrder()
  const remove = useDeletePurchaseOrder()

  const { register, handleSubmit, control, reset } = useForm<Partial<PurchaseOrder>>()

  const openCreate = () => { setEditPO(null); reset({}); setModalOpen(true) }
  const openEdit = (po: PurchaseOrder) => { setEditPO(po); reset(po); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editPO) { await update.mutateAsync({ id: editPO.id, ...data }); toast({ title: 'PO updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Purchase order created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Cannot delete this purchase order', variant: 'destructive' }) }
  }

  const columns: ColumnDef<PurchaseOrder>[] = [
    { accessorKey: 'poNumber', header: 'PO #', cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.poNumber}</span> },
    { accessorKey: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor?.name || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge type="po" value={row.original.status} /> },
    { accessorKey: 'orderDate', header: 'Order Date', cell: ({ row }) => row.original.orderDate ? format(new Date(row.original.orderDate), 'MMM d, yyyy') : '-' },
    { accessorKey: 'expectedDate', header: 'Expected', cell: ({ row }) => row.original.expectedDate ? format(new Date(row.original.expectedDate), 'MMM d, yyyy') : '-' },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => `$${Number(row.original.total).toFixed(2)}` },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Purchase Orders</h1><p className="text-muted-foreground">Manage purchasing and procurement</p></div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="New PO" searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editPO ? 'Edit Purchase Order' : 'New Purchase Order'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Vendor *</Label>
            <Controller control={control} name="vendorId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(+v)} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>{vendors?.data.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          {editPO && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{poStatuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          )}
          <div className="space-y-2"><Label>Order Date</Label><Input type="date" {...register('orderDate')} /></div>
          <div className="space-y-2"><Label>Expected Date</Label><Input type="date" {...register('expectedDate')} /></div>
          <div className="space-y-2"><Label>Tax</Label><Input type="number" step="0.01" {...register('tax', { valueAsNumber: true })} /></div>
          <div className="col-span-2 space-y-2"><Label>Shipping Address</Label><Input {...register('shippingAddress')} /></div>
          <div className="col-span-2 space-y-2"><Label>Notes</Label><Input {...register('notes')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
