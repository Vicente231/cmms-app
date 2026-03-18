import { useState } from 'react'
import { useParts, useCreatePart, useUpdatePart, useDeletePart } from '@/hooks/useParts'
import { useVendors } from '@/hooks/useVendors'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { Part } from '@/types'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import api from '@/lib/axios'

export function PartsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editPart, setEditPart] = useState<Part | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])

  const { data, isLoading } = useParts({ page, limit: 20, search })
  const { data: vendors } = useVendors({ limit: 100 })
  const create = useCreatePart()
  const update = useUpdatePart()
  const remove = useDeletePart()

  const { register, handleSubmit, control, reset } = useForm<Partial<Part>>()

  const fetchCategories = async () => {
    const res = await api.get('/parts-categories')
    setCategories(res.data.data)
  }

  const openCreate = () => { setEditPart(null); reset({ unitOfMeasure: 'each' }); fetchCategories(); setModalOpen(true) }
  const openEdit = (p: Part) => { setEditPart(p); reset(p); fetchCategories(); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editPart) { await update.mutateAsync({ id: editPart.id, ...data }); toast({ title: 'Part updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Part created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<Part>[] = [
    { accessorKey: 'partNumber', header: 'Part #', cell: ({ row }) => <span className="font-mono text-sm">{row.original.partNumber || '-'}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'category', header: 'Category', cell: ({ row }) => row.original.category?.name || '-' },
    { accessorKey: 'unitCost', header: 'Unit Cost', cell: ({ row }) => `$${Number(row.original.unitCost).toFixed(2)}` },
    {
      accessorKey: 'quantityOnHand', header: 'Stock', cell: ({ row }) => {
        const qty = Number(row.original.quantityOnHand)
        const min = Number(row.original.minimumQuantity)
        const low = qty < min
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${low ? 'text-red-600' : ''}`}>{qty} {row.original.unitOfMeasure}</span>
            {low && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </div>
        )
      }
    },
    { accessorKey: 'minimumQuantity', header: 'Min Stock', cell: ({ row }) => `${Number(row.original.minimumQuantity)} ${row.original.unitOfMeasure}` },
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
      <div><h1 className="text-2xl font-bold">Parts & Inventory</h1><p className="text-muted-foreground">Manage spare parts and stock levels</p></div>

      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Part" searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />

      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editPart ? 'Edit Part' : 'Add Part'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2"><Label>Part Number</Label><Input {...register('partNumber')} /></div>
          <div className="space-y-2"><Label>Unit of Measure</Label><Input {...register('unitOfMeasure')} defaultValue="each" /></div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Controller control={control} name="categoryId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(+v)} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2">
            <Label>Preferred Vendor</Label>
            <Controller control={control} name="preferredVendorId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(+v)} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>{vendors?.data.map((v) => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2"><Label>Unit Cost</Label><Input type="number" step="0.0001" {...register('unitCost', { valueAsNumber: true })} /></div>
          <div className="space-y-2"><Label>Quantity On Hand</Label><Input type="number" step="0.0001" {...register('quantityOnHand', { valueAsNumber: true })} /></div>
          <div className="space-y-2"><Label>Minimum Quantity</Label><Input type="number" step="0.0001" {...register('minimumQuantity', { valueAsNumber: true })} /></div>
          <div className="space-y-2"><Label>Reorder Quantity</Label><Input type="number" step="0.0001" {...register('reorderQuantity', { valueAsNumber: true })} /></div>
          <div className="col-span-2 space-y-2"><Label>Storage Location</Label><Input {...register('storageLocation')} placeholder="Shelf A3, Bin 12" /></div>
          <div className="col-span-2 space-y-2"><Label>Description</Label><Input {...register('description')} /></div>
        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
