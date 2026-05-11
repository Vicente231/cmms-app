import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkRequests, useCreateWorkRequest, useDeleteWorkRequest, useUploadImage } from '@/hooks/useWorkRequests'
import { useAssets } from '@/hooks/useAssets'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Eye, Trash2, ImagePlus, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkRequest, WoPriority } from '@/types'
import type { Asset } from '@/types'
import { cn } from '@/lib/utils'

const PRIORITIES: WoPriority[] = ['low', 'medium', 'high', 'critical']

const WR_STAGES = ['all', 'reported', 'planning', 'procuring', 'ready', 'converted'] as const

const STAGE_COLORS: Record<string, string> = {
  reported:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  planning:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  procuring: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  ready:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  converted: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function WorkRequestsPage() {
  const navigate    = useNavigate()
  const { toast }   = useToast()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,      setSearch]        = useState('')
  const [modalOpen,   setModalOpen]     = useState(false)
  const [deleteId,    setDeleteId]      = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading,   setUploading]     = useState(false)

  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterParent,   setFilterParent]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [dropOpen,       setDropOpen]       = useState(false)
  const [selectedAsset,  setSelectedAsset]  = useState<Asset | null>(null)

  const { data: allWRs = [], isLoading } = useWorkRequests()
  const { data: assets }                 = useAssets('', 1, 9999)
  const createWR   = useCreateWorkRequest()
  const deleteWR   = useDeleteWorkRequest()
  const uploadImg  = useUploadImage()

  const { register, handleSubmit, control, reset } = useForm<{ description: string; priority: WoPriority }>()

  const byStatus = statusFilter === 'all' ? allWRs : allWRs.filter(r => r.status === statusFilter)
  const filtered = search
    ? byStatus.filter(r =>
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.assetName.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase())
      )
    : byStatus

  const hasAssetFilter = filterName || filterType || filterParent || filterLocation
  const assetResults = hasAssetFilter
    ? (assets?.data ?? []).filter(a => {
        const n = !filterName     || a.name?.toLowerCase().includes(filterName.toLowerCase())
        const t = !filterType     || a.model?.toLowerCase().includes(filterType.toLowerCase())
        const p = !filterParent   || a.parentAsset?.name?.toLowerCase().includes(filterParent.toLowerCase())
        const l = !filterLocation || a.location?.name?.toLowerCase().includes(filterLocation.toLowerCase())
        return n && t && p && l
      }).slice(0, 10)
    : []

  const openCreate = () => {
    reset({ priority: 'medium' })
    setSelectedAsset(null)
    setFilterName(''); setFilterType(''); setFilterParent(''); setFilterLocation('')
    setPendingFiles([])
    setModalOpen(true)
  }

  const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPendingFiles(prev => [...prev, ...files].slice(0, 3))
    e.target.value = ''
  }

  const onSubmit = handleSubmit(async (data) => {
    if (!selectedAsset) {
      toast({ title: 'Please select an asset', variant: 'destructive' })
      return
    }
    if (!data.description?.trim()) {
      toast({ title: 'Please describe the problem', variant: 'destructive' })
      return
    }
    try {
      setUploading(true)
      const urls: string[] = []
      for (const file of pendingFiles) {
        const res = await uploadImg.mutateAsync(file)
        urls.push(res.url)
      }
      setUploading(false)
      await createWR.mutateAsync({
        asset_id:   selectedAsset.assetTag ?? '',
        asset_name: selectedAsset.name,
        description: data.description,
        priority:   data.priority.toUpperCase(),
        image_urls: urls,
      })
      toast({ title: 'Work request submitted' })
      setModalOpen(false)
    } catch (err) {
      setUploading(false)
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to submit', variant: 'destructive' })
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteWR.mutateAsync(deleteId)
      toast({ title: 'Work request deleted' })
      setDeleteId(null)
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const columns: ColumnDef<WorkRequest>[] = [
    {
      accessorKey: 'id', header: 'WR #',
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.id}</span>,
    },
    {
      accessorKey: 'assetName', header: 'Asset',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.assetName || '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.assetId}</p>
        </div>
      ),
    },
    {
      accessorKey: 'description', header: 'Description',
      cell: ({ row }) => <span className="max-w-xs truncate block text-sm">{row.original.description}</span>,
    },
    {
      accessorKey: 'priority', header: 'Priority',
      cell: ({ row }) => <StatusBadge type="priority" value={row.original.priority} />,
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STAGE_COLORS[row.original.status] ?? '')}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'requestDate', header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.requestDate ? format(new Date(row.original.requestDate), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/work-requests/${row.original.id}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Work Requests</h1>
        <p className="text-muted-foreground">Report issues and plan corrective work before scheduling a work order</p>
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-2">
        {WR_STAGES.map(s => {
          const count = s === 'all' ? allWRs.length : allWRs.filter(r => r.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {s === 'all' ? 'All' : s}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New Request"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by WR#, asset, or description..."
      />

      {/* Create Modal */}
      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="New Work Request"
        onSubmit={onSubmit}
        isLoading={uploading || createWR.isPending}
        submitLabel={uploading ? `Uploading photos…` : 'Submit Request'}
        size="lg"
      >
        <div className="space-y-4">

          {/* Asset picker */}
          <div className="space-y-2">
            <Label>Asset *</Label>
            {selectedAsset ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{selectedAsset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[selectedAsset.assetTag, selectedAsset.location?.name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedAsset(null); setFilterName(''); setFilterType(''); setFilterParent(''); setFilterLocation('') }}>Change</Button>
              </div>
            ) : (
              <div
                className="space-y-2"
                onBlur={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setTimeout(() => setDropOpen(false), 150)
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Filter by name..."
                    value={filterName}
                    onChange={e => { setFilterName(e.target.value); setDropOpen(true) }}
                    onFocus={() => setDropOpen(true)}
                  />
                  <Input
                    placeholder="Filter by type..."
                    value={filterType}
                    onChange={e => { setFilterType(e.target.value); setDropOpen(true) }}
                    onFocus={() => setDropOpen(true)}
                  />
                  <Input
                    placeholder="Filter by parent..."
                    value={filterParent}
                    onChange={e => { setFilterParent(e.target.value); setDropOpen(true) }}
                    onFocus={() => setDropOpen(true)}
                  />
                  <Input
                    placeholder="Filter by location..."
                    value={filterLocation}
                    onChange={e => { setFilterLocation(e.target.value); setDropOpen(true) }}
                    onFocus={() => setDropOpen(true)}
                  />
                </div>
                {dropOpen && hasAssetFilter && (
                  <div className="rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {assetResults.length === 0
                      ? <p className="p-3 text-sm text-muted-foreground">No assets found</p>
                      : assetResults.map(a => (
                        <div
                          key={a.id}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center justify-between"
                          onMouseDown={() => { setSelectedAsset(a); setDropOpen(false) }}
                        >
                          <div>
                            <span className="font-medium">{a.name}</span>
                            {a.location?.name && <span className="text-xs text-muted-foreground ml-2">{a.location.name}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{a.assetTag}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Controller control={control} name="priority" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? 'medium'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Problem Description *</Label>
            <textarea
              {...register('description', { required: true })}
              rows={5}
              placeholder="Describe the issue in detail — what happened, when, symptoms observed, potential impact..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos <span className="text-muted-foreground font-normal">(up to 3)</span></Label>
            <div className="flex flex-wrap gap-3">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-24 w-24 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {pendingFiles.length < 3 && (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 hover:border-foreground/40 transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Add photo</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={addPhoto} />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Images are compressed and stored in Google Drive.</p>
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteWR.isPending}
        description="This will permanently delete this work request and all its materials/services."
      />
    </div>
  )
}
