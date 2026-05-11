import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets'
import type { AssetFormData } from '@/hooks/useAssets'
import { gasGet } from '@/lib/api'
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
import type { Asset } from '@/types'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

const STATUSES      = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']
const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

interface AssetTypeSchema {
  type_code: string
  field_key: string
  label: string
  data_type: string
  unit: string
  required: boolean
  options: string[]
}

export function AssetsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [page,           setPage]           = useState(1)
  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterParent,   setFilterParent]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [modalOpen,      setModalOpen]      = useState(false)
  const [deleteId,       setDeleteId]       = useState<number | null>(null)
  const [editAsset,      setEditAsset]      = useState<Asset | null>(null)

  const { data: allAssetsData, isLoading } = useAssets('', 1, 9999)

  const allAssets = allAssetsData?.data ?? []
  const filtered  = allAssets.filter(a => {
    const n = !filterName     || a.name?.toLowerCase().includes(filterName.toLowerCase())
    const t = !filterType     || a.model?.toLowerCase().includes(filterType.toLowerCase())
    const p = !filterParent   || a.parentAsset?.name?.toLowerCase().includes(filterParent.toLowerCase())
    const l = !filterLocation || a.location?.name?.toLowerCase().includes(filterLocation.toLowerCase())
    return n && t && p && l
  })
  const PAGE_SIZE  = 20
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = () => { setFilterName(''); setFilterType(''); setFilterParent(''); setFilterLocation(''); setPage(1) }
  const hasFilters   = filterName || filterType || filterParent || filterLocation
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['assetTypes'],
    queryFn: () => gasGet<{ type_code: string; label: string }[]>('assetTypes'),
  })
  const { data: schemas = [] } = useQuery({
    queryKey: ['assetTypeSchemas'],
    queryFn: () => gasGet<AssetTypeSchema[]>('assetTypeSchemas'),
  })
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const deleteAsset = useDeleteAsset()

  const { register, handleSubmit, control, reset, watch } = useForm<Partial<AssetFormData>>()
  const [attrs, setAttrs] = useState<Record<string, string>>({})
  const selectedType = watch('asset_type')
  const typeSchemas = schemas.filter(s => s.type_code === selectedType)

  const openCreate = () => {
    setEditAsset(null)
    reset({ status: 'ACTIVE', criticality: 'MEDIUM' })
    setAttrs({})
    setModalOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditAsset(asset)
    const existingAttrs: Record<string, string> = {}
    if (asset.attrs) {
      Object.entries(asset.attrs).forEach(([k, v]) => { existingAttrs[k] = String(v ?? '') })
    }
    setAttrs(existingAttrs)
    reset({
      asset_name:      asset.name,
      asset_type:      asset.model || '',
      parent_asset:    asset.parentAsset?.assetTag || '',
      location:        asset.location?.name || '',
      criticality:     asset.criticality?.toUpperCase() || 'MEDIUM',
      status:          asset.status?.toUpperCase().replace(/ /g, '_') || 'ACTIVE',
      manufacturer:    asset.manufacturer || '',
      vendor:          asset.vendor || '',
      part_number:     asset.partNumber || '',
      serial_number:   asset.serialNumber || '',
      install_date:    asset.purchaseDate || '',
      warranty_expiry: asset.warrantyExpiry || '',
      notes:           asset.description || '',
    })
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = { ...data, attrs }
      if (editAsset) {
        await updateAsset.mutateAsync({ id: editAsset.id, ...payload })
        toast({ title: 'Asset updated' })
      } else {
        await createAsset.mutateAsync(payload)
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

      {/* Multi-field filter bar */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Input
          placeholder="Filter by name..."
          value={filterName}
          onChange={e => { setFilterName(e.target.value); setPage(1) }}
        />
        <Input
          placeholder="Filter by asset type..."
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1) }}
        />
        <Input
          placeholder="Filter by parent asset..."
          value={filterParent}
          onChange={e => { setFilterParent(e.target.value); setPage(1) }}
        />
        <Input
          placeholder="Filter by location..."
          value={filterLocation}
          onChange={e => { setFilterLocation(e.target.value); setPage(1) }}
        />
      </div>
      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={resetFilters} className="text-primary hover:underline text-xs">Clear filters</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={pageData}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="Add Asset"
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={filtered.length}
      />

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editAsset ? 'Edit Asset' : 'Create Asset'}
        onSubmit={onSubmit}
        isLoading={createAsset.isPending || updateAsset.isPending}
        size="lg"
      >
        <div className="space-y-5">

          {/* ── Identity ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Name *</Label>
              <Input {...register('asset_name', { required: true })} placeholder="e.g. Transformer Hewsaw" />
            </div>
            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Controller control={control} name="asset_type" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {assetTypes.map(t => (
                      <SelectItem key={t.type_code} value={t.type_code}>{t.type_code} — {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Parent Asset</Label>
              <Input {...register('parent_asset')} placeholder="AST-000001 (optional)" />
            </div>
          </div>

          {/* ── Status & Classification ── */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? 'ACTIVE'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Criticality</Label>
              <Controller control={control} name="criticality" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? 'MEDIUM'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CRITICALITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input {...register('location')} placeholder="e.g. Building A - Room 3" />
            </div>
          </div>

          {/* ── Technical Details ── */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Technical</p>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input {...register('serial_number')} placeholder="SN-..." />
            </div>
            <div className="space-y-2">
              <Label>Part Number</Label>
              <Input {...register('part_number')} placeholder="PN-..." />
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input {...register('manufacturer')} placeholder="e.g. Hammond Manufacturing" />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input {...register('vendor')} placeholder="e.g. Grainger" />
            </div>
          </div>

          {/* ── Dates ── */}
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dates</p>
            <div className="space-y-2">
              <Label>Install Date</Label>
              <Input type="date" {...register('install_date')} />
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Input type="date" {...register('warranty_expiry')} />
            </div>
          </div>

          {/* ── Dynamic Attrs (from Asset Type Schema) ── */}
          {typeSchemas.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {selectedType} Attributes
              </p>
              <div className="grid grid-cols-2 gap-4">
                {typeSchemas.map(schema => (
                  <div key={schema.field_key} className="space-y-2">
                    <Label>
                      {schema.label}
                      {schema.unit && <span className="text-muted-foreground ml-1 font-normal">({schema.unit})</span>}
                      {schema.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {schema.data_type === 'select' && schema.options.length > 0 ? (
                      <Select
                        value={attrs[schema.field_key] ?? ''}
                        onValueChange={v => setAttrs(prev => ({ ...prev, [schema.field_key]: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {schema.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : schema.data_type === 'boolean' ? (
                      <Select
                        value={attrs[schema.field_key] ?? ''}
                        onValueChange={v => setAttrs(prev => ({ ...prev, [schema.field_key]: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={schema.data_type === 'number' ? 'number' : schema.data_type === 'date' ? 'date' : 'text'}
                        step={schema.data_type === 'number' ? 'any' : undefined}
                        value={attrs[schema.field_key] ?? ''}
                        onChange={e => setAttrs(prev => ({ ...prev, [schema.field_key]: e.target.value }))}
                        placeholder={schema.unit ? `e.g. 100 ${schema.unit}` : ''}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          <div className="space-y-2 border-t pt-4">
            <Label>Notes</Label>
            <textarea
              {...register('notes')}
              placeholder="Additional notes..."
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
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
