import { useState } from 'react'
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '@/hooks/useVendors'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { Vendor } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

export function VendorsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)

  const { data, isLoading } = useVendors({ page, limit: 20, search })
  const create = useCreateVendor()
  const update = useUpdateVendor()
  const remove = useDeleteVendor()

  const { register, handleSubmit, reset } = useForm<Partial<Vendor>>()

  const openCreate = () => { setEditVendor(null); reset({ paymentTerms: 30 }); setModalOpen(true) }
  const openEdit = (v: Vendor) => { setEditVendor(v); reset(v); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editVendor) { await update.mutateAsync({ id: editVendor.id, ...data }); toast({ title: 'Vendor updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Vendor created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<Vendor>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'contactName', header: 'Contact' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'paymentTerms', header: 'Payment Terms', cell: ({ row }) => `${row.original.paymentTerms} days` },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
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
      <div><h1 className="text-2xl font-bold">Vendors</h1><p className="text-muted-foreground">Manage suppliers and vendors</p></div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Vendor" searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editVendor ? 'Edit Vendor' : 'Add Vendor'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2"><Label>Contact Name</Label><Input {...register('contactName')} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} /></div>
          <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
          <div className="space-y-2"><Label>Website</Label><Input {...register('website')} /></div>
          <div className="space-y-2"><Label>Payment Terms (days)</Label><Input type="number" {...register('paymentTerms', { valueAsNumber: true })} /></div>
          <div className="space-y-2"><Label>Tax ID</Label><Input {...register('taxId')} /></div>
          <div className="col-span-2 space-y-2"><Label>Address</Label><Input {...register('address')} /></div>
          <div className="col-span-2 space-y-2"><Label>Notes</Label><Input {...register('notes')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
