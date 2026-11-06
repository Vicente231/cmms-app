import { useState } from 'react'
import { useEquipmentTypes } from '@/hooks/useEquipmentTypes'
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets'
import type { AssetFormData } from '@/hooks/useAssets'
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
import { Eye, Pencil, Trash2, LayoutList, Network, Map as MapIcon } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { AssetTreeView } from './AssetTreeView'
import { AssetDetailSheet } from './AssetDetailSheet'
import { PlatViewPanel } from './PlatViewPanel'

const STATUSES      = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DECOMMISSIONED']
const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function AssetsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [page,           setPage]           = useState(1)
  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterParent,   setFilterParent]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [modalOpen,      setModalOpen]      = useState(false)
  const [deleteId,       setDeleteId]       = useState<string | null>(null)
  const [editAsset,      setEditAsset]      = useState<Asset | null>(null)
  const [viewAssetId, setViewAssetId] = useState<number | null>(null)
  const [viewMode,    setViewMode]    = useState<'table' | 'tree' | 'plat'>(
    () => (localStorage.getItem('assets_view') as 'table' | 'tree' | 'plat') ?? 'table'
  )

  const switchView = (mode: 'table' | 'tree' | 'plat') => {
    localStorage.setItem('assets_view', mode)
    setViewMode(mode)
  }

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
  const { types: assetTypes, fieldsFor } = useEquipmentTypes('asset')
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const deleteAsset = useDeleteAsset()

  const { register, handleSubmit, control, reset, watch } = useForm<Partial<AssetFormData>>()
  const [attrs,            setAttrs]            = useState<Record<string, string>>({})
  const [selectedParent,   setSelectedParent]   = useState<Asset | null>(null)
  const [selectedFeedFrom, setSelectedFeedFrom] = useState<Asset | null>(null)
  const [parentSearch,     setParentSearch]     = useState('')
  const [feedSearch,       setFeedSearch]       = useState('')

  const selectedType = watch('asset_type')
  const typeSchemas  = fieldsFor(selectedType || '')

  const pickerResults = (search: string, excludeId?: number) =>
    search.length < 1 ? [] : allAssets
      .filter(a =>
        a.id !== excludeId &&
        (a.name?.toLowerCase().includes(search.toLowerCase()) ||
         a.assetTag?.toLowerCase().includes(search.toLowerCase()) ||
         a.location?.name?.toLowerCase().includes(search.toLowerCase()))
      )
      .slice(0, 8)

  const openCreate = (prefill?: Partial<AssetFormData>) => {
    setEditAsset(null)
    reset({ status: 'ACTIVE', criticality: 'MEDIUM', ...prefill })
    setAttrs({})
    const preParent = prefill?.parent_asset ? allAssets.find(a => a.assetTag === prefill.parent_asset) ?? null : null
    const preFeed   = prefill?.feed_from    ? allAssets.find(a => a.assetTag === prefill.feed_from)    ?? null : null
    setSelectedParent(preParent)
    setSelectedFeedFrom(preFeed)
    setParentSearch(''); setFeedSearch('')
    setModalOpen(true)
  }

  const handleAddChild = (asset: Asset, mode: 'parent' | 'feedFrom') => {
    openCreate(
      mode === 'parent'
        ? { parent_asset: asset.assetTag ?? '' }
        : { feed_from:    asset.assetTag ?? '' }
    )
  }

  const openEdit = (asset: Asset) => {
    setEditAsset(asset)
    const existingAttrs: Record<string, string> = {}
    if (asset.attrs) {
      Object.entries(asset.attrs).forEach(([k, v]) => { existingAttrs[k] = String(v ?? '') })
    }
    setAttrs(existingAttrs)
    const parentRef = asset.parentAsset?.assetTag || asset.parentAsset?.name || ''
    const feedRef   = asset.feedFrom?.assetTag    || asset.feedFrom?.name    || ''
    setSelectedParent(allAssets.find(a => a.assetTag === parentRef || a.name === parentRef) ?? null)
    setSelectedFeedFrom(allAssets.find(a => a.assetTag === feedRef  || a.name === feedRef)  ?? null)
    setParentSearch(''); setFeedSearch('')
    reset({
      asset_name:      asset.name,
      asset_type:      asset.model             || '',
      parent_asset:    parentRef,
      feed_from:       feedRef,
      location:        asset.location?.name    || '',
      criticality:     asset.criticality?.toUpperCase()               || 'MEDIUM',
      status:          asset.status?.toUpperCase().replace(/ /g, '_') || 'ACTIVE',
      manufacturer:    asset.manufacturer      || '',
      vendor:          asset.vendor            || '',
      part_number:     asset.partNumber        || '',
      serial_number:   asset.serialNumber      || '',
      install_date:    asset.purchaseDate      || '',
      warranty_expiry: asset.warrantyExpiry    || '',
      notes:           asset.description       || '',
    })
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Use selected picker assets (authoritative) over raw text
      const payload = {
        ...data,
        attrs,
        parent_asset: selectedParent?.assetTag  || '',
        feed_from:    selectedFeedFrom?.assetTag || '',
      }
      if (editAsset) {
        await updateAsset.mutateAsync({ assetTag: editAsset.assetTag ?? '', ...payload })
        toast({ title: 'Asset updated' })
      } else {
        await createAsset.mutateAsync(payload)
        toast({ title: 'Asset created' })
      }
      setModalOpen(false)
    } catch (e) {
      console.error('Save asset error:', e)
      toast({ title: 'Error', description: 'Failed to save asset', variant: 'destructive' })
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteAsset.mutateAsync(deleteId)
      toast({ title: 'Asset deleted' })
      setDeleteId(null)
    } catch (e) {
      console.error('Delete asset error:', e)
      toast({ title: 'Error', description: 'Failed to delete asset', variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Asset>[] = [
    { accessorKey: 'assetTag', header: 'Tag', cell: ({ row }) => <span className="font-mono text-sm">{row.original.assetTag || '-'}</span> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'manufacturer', header: 'Manufacturer' },
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'feedFrom', header: 'Feed From', cell: ({ row }) => row.original.feedFrom?.assetTag || '-' },
    { accessorKey: 'location', header: 'Location', cell: ({ row }) => row.original.location?.name || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge type="asset" value={row.original.status} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => setViewAssetId(row.original.id)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.assetTag ?? '')}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-muted-foreground">Manage your equipment and assets</p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-md overflow-hidden border text-xs font-medium shrink-0">
          <button
            onClick={() => switchView('table')}
            className={cn('flex items-center gap-1.5 px-3 py-2 transition-colors',
              viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
          >
            <LayoutList className="h-3.5 w-3.5" /> Table
          </button>
          <button
            onClick={() => switchView('tree')}
            className={cn('flex items-center gap-1.5 px-3 py-2 transition-colors border-l',
              viewMode === 'tree' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
          >
            <Network className="h-3.5 w-3.5" /> Tree
          </button>
          <button
            onClick={() => switchView('plat')}
            className={cn('flex items-center gap-1.5 px-3 py-2 transition-colors border-l',
              viewMode === 'plat' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
          >
            <MapIcon className="h-3.5 w-3.5" /> Plat
          </button>
        </div>
      </div>

      {viewMode === 'plat' ? (
        <PlatViewPanel
          assets={allAssets}
          onViewAsset={setViewAssetId}
        />
      ) : viewMode === 'tree' ? (
        <AssetTreeView
          assets={allAssets}
          onEdit={openEdit}
          onAddChild={handleAddChild}
          onViewAsset={setViewAssetId}
        />
      ) : (
        <>
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
            mobileCard={(asset) => (
              <button
                onClick={() => setViewAssetId(asset.id)}
                className="w-full text-left rounded-lg border bg-background p-4 space-y-2 hover:bg-accent/40 active:bg-accent/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{asset.assetTag || '—'}</span>
                  <StatusBadge type="asset" value={asset.status} />
                </div>
                <p className="font-semibold text-sm">{asset.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {asset.model && <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{asset.model}</span>}
                  {asset.location?.name && <span>{asset.location.name}</span>}
                  {asset.manufacturer && <span>{asset.manufacturer}</span>}
                </div>
              </button>
            )}
          />
        </>
      )}

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
            {/* Parent Asset picker */}
            <div className="space-y-2">
              <Label>Parent Asset <span className="text-muted-foreground font-normal text-xs">(physical container)</span></Label>
              {selectedParent ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-1.5 bg-muted/30">
                  <div>
                    <span className="text-sm font-medium">{selectedParent.name}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{selectedParent.assetTag}</span>
                  </div>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground ml-2" onClick={() => { setSelectedParent(null); setParentSearch('') }}>✕</button>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="Search by name, tag or location…"
                    value={parentSearch}
                    onChange={e => setParentSearch(e.target.value)}
                  />
                  {parentSearch && (
                    <div className="mt-1 rounded-md border bg-muted/20 max-h-36 overflow-y-auto">
                      {pickerResults(parentSearch, editAsset?.id).length === 0
                        ? <p className="p-2 text-sm text-muted-foreground">No assets found</p>
                        : pickerResults(parentSearch, editAsset?.id).map(a => (
                          <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                            onMouseDown={() => { setSelectedParent(a); setParentSearch('') }}>
                            <span className="font-medium">{a.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{a.assetTag}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Feed From picker */}
            <div className="space-y-2">
              <Label>Feed From <span className="text-muted-foreground font-normal text-xs">(power source / MCC)</span></Label>
              {selectedFeedFrom ? (
                <div className="flex items-center justify-between rounded-md border px-3 py-1.5 bg-muted/30">
                  <div>
                    <span className="text-sm font-medium">{selectedFeedFrom.name}</span>
                    <span className="text-xs text-muted-foreground font-mono ml-2">{selectedFeedFrom.assetTag}</span>
                  </div>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground ml-2" onClick={() => { setSelectedFeedFrom(null); setFeedSearch('') }}>✕</button>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="Search by name, tag or location…"
                    value={feedSearch}
                    onChange={e => setFeedSearch(e.target.value)}
                  />
                  {feedSearch && (
                    <div className="mt-1 rounded-md border bg-muted/20 max-h-36 overflow-y-auto">
                      {pickerResults(feedSearch, editAsset?.id).length === 0
                        ? <p className="p-2 text-sm text-muted-foreground">No assets found</p>
                        : pickerResults(feedSearch, editAsset?.id).map(a => (
                          <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                            onMouseDown={() => { setSelectedFeedFrom(a); setFeedSearch('') }}>
                            <span className="font-medium">{a.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{a.assetTag}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )}
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
                    {schema.data_type === 'select' && (schema.options ?? []).length > 0 ? (
                      <Select
                        value={attrs[schema.field_key] ?? ''}
                        onValueChange={v => setAttrs(prev => ({ ...prev, [schema.field_key]: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {(schema.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
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
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteAsset.isPending}
        description="This will permanently delete this asset and all associated data."
      />

      <AssetDetailSheet
        assetId={viewAssetId}
        onClose={() => setViewAssetId(null)}
        onEdit={asset => { setViewAssetId(null); openEdit(asset) }}
        onViewChild={setViewAssetId}
      />
    </div>
  )
}
