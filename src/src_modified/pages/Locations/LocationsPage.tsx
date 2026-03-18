import { useState } from 'react'
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/useLocations'
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
import type { Location } from '@/types'
import { Pencil, Trash2, MapPin } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

export function LocationsPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editLocation, setEditLocation] = useState<Location | null>(null)

  const { data, isLoading } = useLocations({ page, limit: 50, search })
  const create = useCreateLocation()
  const update = useUpdateLocation()
  const remove = useDeleteLocation()

  const { register, handleSubmit, control, reset } = useForm<Partial<Location>>()

  const openCreate = () => { setEditLocation(null); reset({}); setModalOpen(true) }
  const openEdit = (l: Location) => { setEditLocation(l); reset(l); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editLocation) { await update.mutateAsync({ id: editLocation.id, ...data }); toast({ title: 'Location updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Location created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const allLocations = data?.data || []

  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: 'name', header: 'Name', cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      )
    },
    { accessorKey: 'parent', header: 'Parent', cell: ({ row }) => row.original.parent ? <span className="text-muted-foreground text-sm">{row.original.parent.name}</span> : '-' },
    { accessorKey: 'city', header: 'City' },
    { accessorKey: 'country', header: 'Country' },
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
      <div><h1 className="text-2xl font-bold">Locations</h1><p className="text-muted-foreground">Manage facility locations and hierarchy</p></div>
      <DataTable columns={columns} data={allLocations} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Location" searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editLocation ? 'Edit Location' : 'Add Location'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2">
            <Label>Parent Location</Label>
            <Controller control={control} name="parentId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(v === 'none' ? null : +v)} value={field.value?.toString() || 'none'}>
                <SelectTrigger><SelectValue placeholder="No parent (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {allLocations.filter(l => l.id !== editLocation?.id).map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>City</Label><Input {...register('city')} /></div>
            <div className="space-y-2"><Label>Country</Label><Input {...register('country')} /></div>
            <div className="space-y-2"><Label>State</Label><Input {...register('state')} /></div>
            <div className="space-y-2"><Label>ZIP</Label><Input {...register('zip')} /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Input {...register('address')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
