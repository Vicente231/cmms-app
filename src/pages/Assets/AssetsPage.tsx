import { useState } from 'react'
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets'
import { useLocations } from '@/hooks/useLocations'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import type { Asset, AssetStatus } from '@/types'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

const statuses: AssetStatus[] = ['active', 'inactive', 'decommissioned', 'under_maintenance']

export function AssetsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState<'name' | 'id' | 'type' | 'parent' | 'location' | 'criticality' | 'status'>('name')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)

  const { data, isLoading } = useAssets(search, page, 20, searchField)
  const { data: locations } = useLocations({ limit: 100 })
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const deleteAsset = useDeleteAsset()

  const { register, handleSubmit, control, reset, setValue } = useForm<Partial<Asset>>()

  const openCreate = () => {
    setEditAsset(null)
    reset({})
    setModalOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditAsset(asset)
    reset(asset)
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editAsset) {
        await updateAsset.mutateAsync({ id: editAsset.id, ...data })
        toast({ title: 'Asset updated' })
      } else {
        await createAsset.mutateAsync(data)
        toast({ title: 'Asset created' })
      }
      setModalOpen(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to save asset', variant: 'destructive' })
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteAsset.mutateAsync(deleteId)
      toast({ title: 'Asset deleted' })
      setDeleteId(null)
    } catch {
      toast({ title: 'Error', description: 'Failed to delete asset', variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: 'assetTag', header: 'Tag', cell: ({ row }) => <span className="font-mono text-sm">{row.original.assetTag || '-'}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'manufacturer', header: 'Manufacturer' },
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'location', header: 'Location', cell: ({ row }) => row.original.location?.name || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge type="asset" value={row.original.status} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/assets/${row.original.id}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Assets</h1>
        <p className="text-muted-foreground">Manage your equipment and assets</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="Add Asset"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder={`Search by ${searchField}...`}
        page={page}
        totalPages={data?.pagination.totalPages}
        onPageChange={setPage}
        total={data?.pagination.total}
        extraActions={
          <Select value={searchField} onValueChange={(v) => { setSearchField(v as typeof searchField); setSearch(''); setPage(1) }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="id">ID</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="criticality">Criticality</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editAsset ? 'Edit Asset' : 'Create Asset'}
        onSubmit={onSubmit}
        isLoading={createAsset.isPending || updateAsset.isPending}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Name *</Label>
            <Input {...register('name', { required: true })} placeholder="Asset name" />
          </div>
          <div className="space-y-2">
            <Label>Asset Tag</Label>
            <Input {...register('assetTag')} placeholder="ASSET-001" />
          </div>
          <div className="space-y-2">
            <Label>Serial Number</Label>
            <Input {...register('serialNumber')} placeholder="SN-..." />
          </div>
          <div className="space-y-2">
            <Label>Manufacturer</Label>
            <Input {...register('manufacturer')} placeholder="Manufacturer" />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input {...register('model')} placeholder="Model number" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Controller
              control={control}
              name="locationId"
              render={({ field }) => (
                <Select onValueChange={(v) => field.onChange(+v)} value={field.value?.toString()}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations?.data.map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Input type="date" {...register('purchaseDate')} />
          </div>
          <div className="space-y-2">
            <Label>Purchase Cost</Label>
            <Input type="number" step="0.01" {...register('purchaseCost', { valueAsNumber: true })} placeholder="0.00" />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Description</Label>
            <Input {...register('description')} placeholder="Asset description" />
          </div>
        </div>
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteAsset.isPending}
        description="This will permanently delete this asset and all associated data."
      />
    </div>
  )
}
