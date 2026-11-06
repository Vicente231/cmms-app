import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkRequests, useCreateWorkRequest, useDeleteWorkRequest, useUploadImage } from '@/hooks/useWorkRequests'
import { useAssets } from '@/hooks/useAssets'
import { useAuthStore } from '@/store/authStore'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Eye, Trash2, ImagePlus, X, AlertTriangle } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkRequest, WoPriority } from '@/types'
import type { Asset } from '@/types'
import { cn } from '@/lib/utils'

const PRIORITIES: WoPriority[] = ['low', 'medium', 'high', 'critical']

const DEPARTMENTS = [
  { value: 'sawmill',        label: 'Sawmill' },
  { value: 'planer',         label: 'Planer' },
  { value: 'electrical',     label: 'Electrical' },
  { value: 'mechanical',     label: 'Mechanical' },
  { value: 'utilities',      label: 'Utilities' },
  { value: 'shipping',       label: 'Shipping' },
  { value: 'administration', label: 'Administration' },
  { value: 'other',          label: 'Other' },
]

const REQUEST_TYPES = [
  { value: 'corrective',   label: 'Corrective Maintenance' },
  { value: 'emergency',    label: 'Emergency / Breakdown' },
  { value: 'safety',       label: 'Safety Concern' },
  { value: 'improvement',  label: 'Improvement Request' },
  { value: 'other',        label: 'Other' },
]

const FAILURE_MODES = [
  { value: 'mechanical',      label: 'Mechanical' },
  { value: 'electrical',      label: 'Electrical' },
  { value: 'hydraulic',       label: 'Hydraulic / Pneumatic' },
  { value: 'structural',      label: 'Structural' },
  { value: 'instrumentation', label: 'Instrumentation' },
  { value: 'other',           label: 'Other' },
]

const PRODUCTION_IMPACTS = [
  { value: 'none',          label: 'No Impact' },
  { value: 'minor',         label: 'Minor Impact' },
  { value: 'major',         label: 'Major Impact' },
  { value: 'full_stoppage', label: 'Full Production Stoppage' },
]

const WR_STAGES = ['all', 'reported', 'planning', 'procuring', 'ready', 'converted'] as const

const STAGE_COLORS: Record<string, string> = {
  reported:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  planning:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  procuring: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  ready:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  converted: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

type WRFormData = {
  description: string
  priority: WoPriority
  department: string
  requestType: string
  contactPhone: string
  failureMode: string
  productionImpact: string
  safetyDetail: string
  preferredDate: string
}

export function WorkRequestsPage() {
  const navigate   = useNavigate()
  const { toast }  = useToast()
  const user       = useAuthStore(s => s.user)

  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [deleteId,     setDeleteId]     = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading,    setUploading]    = useState(false)
  const [machineDown,  setMachineDown]  = useState(false)
  const [safetyConcern, setSafetyConcern] = useState(false)

  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterParent,   setFilterParent]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [dropOpen,       setDropOpen]       = useState(false)
  const [selectedAsset,  setSelectedAsset]  = useState<Asset | null>(null)

  const { data: allWRs = [], isLoading } = useWorkRequests()
  const { data: assets }                 = useAssets('', 1, 9999)
  const createWR  = useCreateWorkRequest()
  const deleteWR  = useDeleteWorkRequest()
  const uploadImg = useUploadImage()

  // user is used for future role-based gating; suppress lint warning
  void user

  const { register, handleSubmit, control, watch, reset } = useForm<WRFormData>({
    defaultValues: { priority: 'medium', productionImpact: 'none' }
  })

  const watchedType = watch('requestType')
  const showFailure = watchedType === 'corrective' || watchedType === 'emergency'

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
    reset({ priority: 'medium', productionImpact: 'none' })
    setSelectedAsset(null)
    setFilterName(''); setFilterType(''); setFilterParent(''); setFilterLocation('')
    setPendingFiles([])
    setMachineDown(false)
    setSafetyConcern(false)
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
        asset_id:         selectedAsset.assetTag ?? '',
        asset_name:       selectedAsset.name,
        asset_location:   selectedAsset.location?.name ?? '',
        description:      data.description,
        priority:         data.priority.toUpperCase(),
        image_urls:       urls,
        department:       data.department      || '',
        contact_phone:    data.contactPhone    || '',
        request_type:     data.requestType     || '',
        failure_mode:     data.failureMode     || '',
        machine_down:     machineDown,
        production_impact: data.productionImpact || '',
        safety_concern:   safetyConcern,
        safety_detail:    data.safetyDetail    || '',
        preferred_date:   data.preferredDate   || '',
      })
      toast({ title: 'Work request submitted' })
      setModalOpen(false)
    } catch (err) {
      setUploading(false)
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Failed to submit'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
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
      accessorKey: 'requestType', header: 'Type',
      cell: ({ row }) => {
        const t = row.original.requestType
        const label = t === 'corrective' ? 'Corrective' : t === 'emergency' ? 'Emergency' : t === 'safety' ? 'Safety' : t === 'improvement' ? 'Improvement' : t || '—'
        const cls = t === 'emergency' ? 'bg-red-100 text-red-700' : t === 'safety' ? 'bg-orange-100 text-orange-700' : t === 'corrective' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
        return t ? <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', cls)}>{label}</span> : <span className="text-muted-foreground text-sm">—</span>
      },
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

      <div className="flex flex-wrap gap-2">
        {WR_STAGES.map(s => {
          const count = s === 'all' ? allWRs.length : allWRs.filter(r => r.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
        mobileCard={(wr) => {
          const typeLabel = wr.requestType === 'corrective' ? 'Corrective' : wr.requestType === 'emergency' ? 'Emergency' : wr.requestType === 'safety' ? 'Safety' : wr.requestType === 'improvement' ? 'Improvement' : wr.requestType || null
          const typeCls = wr.requestType === 'emergency' ? 'bg-red-100 text-red-700' : wr.requestType === 'safety' ? 'bg-orange-100 text-orange-700' : wr.requestType === 'corrective' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
          return (
            <button
              onClick={() => navigate(`/work-requests/${wr.id}`)}
              className="w-full text-left rounded-lg border bg-background p-4 space-y-2 hover:bg-accent/40 active:bg-accent/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">{wr.id}</span>
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0', STAGE_COLORS[wr.status] ?? '')}>
                  {wr.status}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">{wr.assetName || '—'}</p>
                <p className="text-xs text-muted-foreground">{wr.assetId}</p>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{wr.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge type="priority" value={wr.priority} />
                {typeLabel && <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', typeCls)}>{typeLabel}</span>}
                {wr.machineDown && <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">Machine Down</span>}
                <span className="ml-auto text-xs text-muted-foreground">
                  {wr.requestDate ? format(new Date(wr.requestDate), 'MMM d, yyyy') : '—'}
                </span>
              </div>
            </button>
          )
        }}
      />

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="New Work Request"
        onSubmit={onSubmit}
        isLoading={uploading || createWR.isPending}
        submitLabel={uploading ? 'Uploading photos…' : 'Submit Request'}
        size="lg"
      >
        <div className="space-y-5">

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
              <div className="space-y-2" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setDropOpen(false), 150) }}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Filter by name..."     value={filterName}     onChange={e => { setFilterName(e.target.value);     setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
                  <Input placeholder="Filter by type..."     value={filterType}     onChange={e => { setFilterType(e.target.value);     setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
                  <Input placeholder="Filter by parent..."   value={filterParent}   onChange={e => { setFilterParent(e.target.value);   setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
                  <Input placeholder="Filter by location..." value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
                </div>
                {dropOpen && hasAssetFilter && (
                  <div className="rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                    {assetResults.length === 0
                      ? <p className="p-3 text-sm text-muted-foreground">No assets found</p>
                      : assetResults.map(a => (
                        <div key={a.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center justify-between" onMouseDown={() => { setSelectedAsset(a); setDropOpen(false) }}>
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

          {/* Row: Department | Request Type | Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Controller control={control} name="department" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Request Type</Label>
              <Controller control={control} name="requestType" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Controller control={control} name="priority" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? 'medium'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </div>

          {/* Failure details — shown for corrective / emergency */}
          {showFailure && (
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3 border">
              <div className="space-y-1.5">
                <Label className="text-xs">Failure Mode</Label>
                <Controller control={control} name="failureMode" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{FAILURE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Machine / Equipment Down?</Label>
                <div className="flex rounded-md overflow-hidden border h-9">
                  <button type="button" onClick={() => setMachineDown(true)}  className={cn('flex-1 text-xs font-medium transition-colors', machineDown  ? 'bg-red-500 text-white' : 'bg-background hover:bg-muted')}>YES</button>
                  <button type="button" onClick={() => setMachineDown(false)} className={cn('flex-1 text-xs font-medium transition-colors border-l', !machineDown ? 'bg-green-600 text-white' : 'bg-background hover:bg-muted')}>NO</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Production Impact</Label>
                <Controller control={control} name="productionImpact" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value ?? 'none'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRODUCTION_IMPACTS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>
          )}

          {/* Safety concern toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-orange-500" />Safety Concern?</Label>
              <div className="flex rounded-md overflow-hidden border">
                <button type="button" onClick={() => setSafetyConcern(true)}  className={cn('px-3 py-1 text-xs font-medium transition-colors', safetyConcern  ? 'bg-orange-500 text-white' : 'bg-background hover:bg-muted')}>YES</button>
                <button type="button" onClick={() => setSafetyConcern(false)} className={cn('px-3 py-1 text-xs font-medium transition-colors border-l', !safetyConcern ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>NO</button>
              </div>
            </div>
            {safetyConcern && (
              <Input
                {...register('safetyDetail')}
                placeholder="Describe the safety concern (e.g. exposed wiring, slip hazard, chemical leak)..."
                className="text-sm"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Problem Description *</Label>
            <textarea
              {...register('description', { required: true })}
              rows={4}
              placeholder="Describe the issue — what happened, when it started, symptoms observed, potential impact..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Row: Preferred Date | Contact Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Preferred Completion Date</Label>
              <Input type="date" {...register('preferredDate')} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact / Radio #</Label>
              <Input {...register('contactPhone')} placeholder="e.g. Ext. 1234 or Radio Ch. 3" className="text-sm" />
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>Photos <span className="text-muted-foreground font-normal text-xs">(up to 3)</span></Label>
            <div className="flex flex-wrap gap-3">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="relative group">
                  <img src={URL.createObjectURL(file)} alt="" className="h-24 w-24 rounded-lg object-cover border" />
                  <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
