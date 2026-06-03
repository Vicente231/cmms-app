import { useState } from 'react'
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder } from '@/hooks/useWorkOrders'
import { useWorkRequests, useUpdateWorkRequest } from '@/hooks/useWorkRequests'
import { useProjects, DISCIPLINES } from '@/hooks/useProjects'
import { useAssets } from '@/hooks/useAssets'
import { useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkOrder, WoStatus, WoPriority, Asset } from '@/types'
import { Eye, Pencil, Trash2, Zap, Lock, CheckSquare, Square, Clock, Wrench, HardHat } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

const NONE = '__none__'

const statuses: WoStatus[]     = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const priorities: WoPriority[] = ['low', 'medium', 'high', 'critical']

const LOTO_SAFETY      = ['DE-ENERGIZED', 'LOCKOUT TAGOUT', 'HOT WORK', 'CONFINED SPACE']
const ENERGIZED_SAFETY = ['ENERGIZED', 'RUNNING']

type WoType = 'PM' | 'CM'

export function WorkOrdersPage() {
  const navigate   = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast }  = useToast()
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const projectFilter = searchParams.get('project') || ''
  const [modalOpen, setModalOpen]     = useState(false)
  const [deleteId, setDeleteId]       = useState<number | null>(null)
  const [editWO, setEditWO]           = useState<WorkOrder | null>(null)

  // WO type toggle (create only)
  const [woType, setWoType] = useState<WoType>('CM')

  // Asset filters
  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterParent,   setFilterParent]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [assetDropOpen,  setAssetDropOpen]  = useState(false)
  const [selectedAsset,  setSelectedAsset]  = useState<Asset | null>(null)

  // PM-specific
  const [safetyMode,      setSafetyMode]      = useState<'energized' | 'loto' | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  // CM-specific
  const [problemDesc,   setProblemDesc]   = useState('')
  const [diagnosis,     setDiagnosis]     = useState('')
  const [correctiveAct, setCorrectiveAct] = useState('')
  const [linkedWrId,    setLinkedWrId]    = useState(NONE)

  // Shared optional
  const [projectId,  setProjectId]  = useState(NONE)
  const [discipline, setDiscipline] = useState(NONE)

  const params = {
    page, limit: 20, search,
    ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(projectFilter ? { projectId: projectFilter } : {}),
  }
  const { data, isLoading }         = useWorkOrders(params)
  const { data: assets }            = useAssets('', 1, 9999)
  const { data: allMTasks = [] }    = useMaintenanceTasks()
  const { data: workRequests = [] } = useWorkRequests()
  const { data: projects = [] }     = useProjects()
  const createWO = useCreateWorkOrder()
  const updateWO = useUpdateWorkOrder()
  const deleteWO = useDeleteWorkOrder()
  const updateWR = useUpdateWorkRequest()

  const { register, handleSubmit, control, reset } = useForm<Partial<WorkOrder>>()

  const resetExtraState = () => {
    setFilterName(''); setFilterType(''); setFilterParent(''); setFilterLocation('')
    setSelectedAsset(null); setSafetyMode(null); setSelectedTaskIds([])
    setAssetDropOpen(false)
    setProblemDesc(''); setDiagnosis(''); setCorrectiveAct('')
    setLinkedWrId(NONE); setProjectId(NONE); setDiscipline(NONE)
  }

  const openCreate = () => {
    setEditWO(null)
    setWoType('CM')
    reset({ priority: 'medium', status: 'open' })
    resetExtraState()
    setModalOpen(true)
  }

  const openEdit = (wo: WorkOrder) => {
    setEditWO(wo)
    reset(wo)
    resetExtraState()
    setModalOpen(true)
  }

  // Filtered assets
  const hasAnyFilter = filterName || filterType || filterParent || filterLocation
  const filteredAssets = hasAnyFilter
    ? (assets?.data ?? []).filter(a => {
        const n = filterName     ? a.name?.toLowerCase().includes(filterName.toLowerCase())                : true
        const t = filterType     ? a.model?.toLowerCase().includes(filterType.toLowerCase())               : true
        const p = filterParent   ? a.parentAsset?.name?.toLowerCase().includes(filterParent.toLowerCase()) : true
        const l = filterLocation ? a.location?.name?.toLowerCase().includes(filterLocation.toLowerCase())  : true
        return n && t && p && l
      })
    : []

  // PM tasks — case-insensitive asset type match
  const applicableTasks = selectedAsset && safetyMode
    ? allMTasks.filter(t => {
        const matchType   = t.asset_type?.toLowerCase().trim() === selectedAsset.model?.toLowerCase().trim()
        const matchSafety = safetyMode === 'energized'
          ? ENERGIZED_SAFETY.includes(t.safety?.toUpperCase().trim())
          : LOTO_SAFETY.includes(t.safety?.toUpperCase().trim())
        return matchType && matchSafety
      })
    : []

  const toggleTask = (id: string) =>
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const totalMinutes   = selectedTaskIds.reduce((sum, id) => {
    const t = allMTasks.find(m => m.task_id === id)
    return sum + (t?.estimated_duration ? Number(t.estimated_duration) : 0)
  }, 0)
  const estimatedHours = totalMinutes > 0 ? +(totalMinutes / 60).toFixed(2) : undefined

  // Linkable WRs (not yet converted)
  const linkableWRs = workRequests.filter(wr => wr.status !== 'converted')

  const onSubmit = handleSubmit(async (formData) => {
    try {
      if (editWO) {
        await updateWO.mutateAsync({ id: editWO.id, ...formData })
        toast({ title: 'Work order updated' })
      } else {
        const result = await createWO.mutateAsync({
          ...formData,
          woType,
          assetId:            selectedAsset?.id,
          estimatedHours:     woType === 'PM' ? estimatedHours : undefined,
          taskIds:            woType === 'PM' ? selectedTaskIds : [],
          problemDescription: woType === 'CM' ? problemDesc : '',
          diagnosis:          woType === 'CM' ? diagnosis : '',
          correctiveAction:   woType === 'CM' ? correctiveAct : '',
          projectId:          projectId  !== NONE ? projectId  : undefined,
          discipline:         discipline !== NONE ? discipline : undefined,
        })

        // Link WR after creating WO
        if (woType === 'CM' && linkedWrId !== NONE && result?.wo_id) {
          await updateWR.mutateAsync({
            id: linkedWrId,
            updates: { status: 'CONVERTED', converted_to_wo: result.wo_id },
          })
        }

        toast({
          title: 'Work order created',
          description: woType === 'PM' && selectedTaskIds.length
            ? `${selectedTaskIds.length} tasks added`
            : linkedWrId !== NONE ? 'Work request linked and marked as converted' : undefined,
        })
      }
      setModalOpen(false)
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' })
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await deleteWO.mutateAsync(deleteId); toast({ title: 'Work order deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<WorkOrder>[] = [
    { accessorKey: 'woNumber', header: 'WO #', cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.woNumber}</span> },
    { accessorKey: 'title',    header: 'Title', cell: ({ row }) => <span className="max-w-xs truncate block">{row.original.title}</span> },
    { accessorKey: 'asset',    header: 'Asset', cell: ({ row }) => row.original.asset?.name || '-' },
    { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <StatusBadge type="priority" value={row.original.priority} /> },
    { accessorKey: 'status',   header: 'Status',   cell: ({ row }) => <StatusBadge type="wo" value={row.original.status} /> },
    {
      accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => {
        const due = row.original.dueDate
        const overdue = due && isPast(new Date(due)) && !['completed', 'cancelled'].includes(row.original.status)
        return <span className={cn('text-sm', overdue && 'text-red-600 font-medium')}>{due ? format(new Date(due), 'MMM d, yyyy') : '-'}</span>
      }
    },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/work-orders/${row.original.id}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <p className="text-muted-foreground">Manage maintenance work orders</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New Work Order"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search work orders..."
        page={page}
        totalPages={data?.pagination.totalPages}
        onPageChange={setPage}
        total={data?.pagination.total}
        extraActions={
          <div className="flex items-center gap-2">
            {projectFilter && (
              <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <span>Project: {projectFilter}</span>
                <button
                  onClick={() => setSearchParams({})}
                  className="ml-0.5 hover:text-destructive transition-colors"
                  title="Clear project filter"
                >✕</button>
              </div>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editWO ? 'Edit Work Order' : 'New Work Order'}
        onSubmit={onSubmit}
        isLoading={createWO.isPending || updateWO.isPending}
        size="lg"
      >
        <div className="space-y-5">

          {/* ── WO Type Toggle (create only) ── */}
          {!editWO && (
            <div className="space-y-2">
              <Label>Work Order Type</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setWoType('CM'); setSelectedTaskIds([]); setSafetyMode(null) }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    woType === 'CM'
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                      : 'border-muted hover:border-foreground/30'
                  )}
                >
                  <HardHat className="h-4 w-4" /> Corrective (CM)
                </button>
                <button
                  type="button"
                  onClick={() => { setWoType('PM'); setProblemDesc(''); setDiagnosis(''); setCorrectiveAct(''); setLinkedWrId(NONE) }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    woType === 'PM'
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                      : 'border-muted hover:border-foreground/30'
                  )}
                >
                  <Wrench className="h-4 w-4" /> Preventive (PM)
                </button>
              </div>
            </div>
          )}

          {/* ── Basic Info ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Title *</Label>
              <Input {...register('title', { required: true })} placeholder="Describe the work needed" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller control={control} name="priority" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? 'medium'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...register('dueDate')} />
            </div>
            {editWO && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller control={control} name="status" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            )}
          </div>

          {/* ── Asset Search (create only) ── */}
          {!editWO && (
            <div
              className="border-t pt-4 space-y-3"
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setAssetDropOpen(false), 150) }}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asset</p>

              {selectedAsset ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                  <div>
                    <p className="font-medium text-sm">{selectedAsset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedAsset.assetTag, selectedAsset.model, selectedAsset.location?.name].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelectedAsset(null); setSafetyMode(null); setSelectedTaskIds([]) }}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Filter by name..."          value={filterName}     onChange={e => { setFilterName(e.target.value);     setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                    <Input placeholder="Filter by asset type..."    value={filterType}     onChange={e => { setFilterType(e.target.value);     setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                    <Input placeholder="Filter by parent asset..."  value={filterParent}   onChange={e => { setFilterParent(e.target.value);   setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                    <Input placeholder="Filter by location..."      value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                  </div>

                  {assetDropOpen && hasAnyFilter && (
                    <div className="rounded-lg border bg-popover shadow-md max-h-48 overflow-y-auto">
                      {filteredAssets.length === 0
                        ? <p className="p-3 text-sm text-muted-foreground">No assets match the filters</p>
                        : filteredAssets.map(a => (
                          <div
                            key={a.id}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center justify-between"
                            onMouseDown={() => { setSelectedAsset(a); setSafetyMode(null); setSelectedTaskIds([]); setAssetDropOpen(false) }}
                          >
                            <span className="font-medium">{a.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {[a.model, a.location?.name].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── CM Fields ── */}
          {!editWO && woType === 'CM' && (
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrective Maintenance Details</p>

              <div className="space-y-2">
                <Label>Problem Description *</Label>
                <Textarea
                  placeholder="Describe the problem or failure observed..."
                  value={problemDesc}
                  onChange={e => setProblemDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diagnosis <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="Root cause or findings..."
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corrective Action <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="Action taken or planned..."
                    value={correctiveAct}
                    onChange={e => setCorrectiveAct(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Link to Work Request */}
              <div className="space-y-2">
                <Label>Link to Work Request <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Select value={linkedWrId} onValueChange={setLinkedWrId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a work request to convert..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {linkableWRs.map(wr => (
                      <SelectItem key={wr.id} value={wr.id}>
                        {wr.id} · {wr.description}{wr.assetName ? ` (${wr.assetName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {linkedWrId !== NONE && (
                  <p className="text-xs text-muted-foreground">The selected work request will be marked as <strong>converted</strong> after this WO is created.</p>
                )}
              </div>
            </div>
          )}

          {/* ── PM: Safety Condition ── */}
          {!editWO && woType === 'PM' && selectedAsset && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operation Mode</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setSafetyMode('energized'); setSelectedTaskIds([]) }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    safetyMode === 'energized'
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                      : 'border-muted hover:border-foreground/30'
                  )}
                >
                  <Zap className="h-4 w-4" /> Running / Energized
                </button>
                <button
                  type="button"
                  onClick={() => { setSafetyMode('loto'); setSelectedTaskIds([]) }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors',
                    safetyMode === 'loto'
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      : 'border-muted hover:border-foreground/30'
                  )}
                >
                  <Lock className="h-4 w-4" /> LOTO / De-energized
                </button>
              </div>
            </div>
          )}

          {/* ── PM: Task Selection ── */}
          {!editWO && woType === 'PM' && selectedAsset && safetyMode && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tasks — {selectedAsset.model} · {safetyMode === 'energized' ? 'Energized' : 'LOTO'}
                </p>
                {applicableTasks.length > 0 && (
                  <button type="button" className="text-xs text-primary" onClick={() =>
                    setSelectedTaskIds(
                      selectedTaskIds.length === applicableTasks.length ? [] : applicableTasks.map(t => t.task_id)
                    )
                  }>
                    {selectedTaskIds.length === applicableTasks.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {applicableTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No tasks defined for {selectedAsset.model} under this operation mode.</p>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto rounded-lg border p-2">
                  {applicableTasks.map(t => {
                    const checked = selectedTaskIds.includes(t.task_id)
                    return (
                      <div
                        key={t.task_id}
                        className={cn('flex items-center gap-3 rounded px-2 py-1.5 cursor-pointer hover:bg-accent transition-colors', checked && 'bg-accent/60')}
                        onClick={() => toggleTask(t.task_id)}
                      >
                        {checked
                          ? <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                          : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="text-sm flex-1">{t.description}</span>
                        {t.estimated_duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />{t.estimated_duration} min
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs shrink-0">{t.safety}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedTaskIds.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected</span>
                  <span className="font-semibold">
                    Est. {estimatedHours}h
                    <span className="font-normal text-muted-foreground ml-1">({totalMinutes} min)</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Project & Discipline ── */}
          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to a project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {projects
                    .filter(p => p.status !== 'completed' && p.status !== 'cancelled')
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id} · {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discipline <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={discipline} onValueChange={setDiscipline}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discipline..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {DISCIPLINES.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Notes ── */}
          {woType === 'PM' && (
            <div className="space-y-2 border-t pt-4">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea {...register('description')} rows={3} placeholder="Additional notes or observations..." />
            </div>
          )}

        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={deleteWO.isPending} />
    </div>
  )
}
