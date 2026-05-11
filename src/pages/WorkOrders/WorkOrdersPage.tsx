import { useState } from 'react'
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder } from '@/hooks/useWorkOrders'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkOrder, WoStatus, WoPriority, Asset } from '@/types'
import { Eye, Pencil, Trash2, Zap, Lock, CheckSquare, Square, Clock } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

const statuses: WoStatus[]   = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const priorities: WoPriority[] = ['low', 'medium', 'high', 'critical']

const LOTO_SAFETY   = ['DE-ENERGIZED', 'LOCKOUT TAGOUT', 'HOT WORK', 'CONFINED SPACE']
const ENERGIZED_SAFETY = ['ENERGIZED']

export function WorkOrdersPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editWO, setEditWO] = useState<WorkOrder | null>(null)

  // Asset filters
  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterParent,   setFilterParent]   = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [assetDropOpen,  setAssetDropOpen]  = useState(false)
  const [selectedAsset,  setSelectedAsset]  = useState<Asset | null>(null)

  // Task selection
  const [safetyMode,      setSafetyMode]      = useState<'energized' | 'loto' | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  const params = { page, limit: 20, search, ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}) }
  const { data, isLoading }          = useWorkOrders(params)
  const { data: assets }             = useAssets('', 1, 9999)
  const { data: allMTasks = [] }     = useMaintenanceTasks()
  const createWO = useCreateWorkOrder()
  const updateWO = useUpdateWorkOrder()
  const deleteWO = useDeleteWorkOrder()

  const { register, handleSubmit, control, reset } = useForm<Partial<WorkOrder>>()

  const resetForm = () => {
    setFilterName(''); setFilterType(''); setFilterParent(''); setFilterLocation('')
    setSelectedAsset(null); setSafetyMode(null); setSelectedTaskIds([])
    setAssetDropOpen(false)
  }

  const openCreate = () => {
    setEditWO(null)
    reset({ priority: 'medium', status: 'open' })
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (wo: WorkOrder) => {
    setEditWO(wo)
    reset(wo)
    resetForm()
    setModalOpen(true)
  }

  // Filtered asset list (AND across all active filters)
  const hasAnyFilter = filterName || filterType || filterParent || filterLocation
  const filteredAssets = hasAnyFilter
    ? (assets?.data ?? []).filter(a => {
        const n = filterName     ? a.name?.toLowerCase().includes(filterName.toLowerCase())           : true
        const t = filterType     ? a.model?.toLowerCase().includes(filterType.toLowerCase())          : true
        const p = filterParent   ? a.parentAsset?.name?.toLowerCase().includes(filterParent.toLowerCase()) : true
        const l = filterLocation ? a.location?.name?.toLowerCase().includes(filterLocation.toLowerCase())  : true
        return n && t && p && l
      })
    : []

  // Tasks filtered by asset type + safety mode
  const applicableTasks = selectedAsset && safetyMode
    ? allMTasks.filter(t => {
        const matchType   = t.asset_type === selectedAsset.model
        const matchSafety = safetyMode === 'energized'
          ? ENERGIZED_SAFETY.includes(t.safety)
          : LOTO_SAFETY.includes(t.safety)
        return matchType && matchSafety
      })
    : []

  const toggleTask = (id: string) =>
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // Auto-calculate estimated hours from selected tasks
  const totalMinutes = selectedTaskIds.reduce((sum, id) => {
    const t = allMTasks.find(m => m.task_id === id)
    return sum + (t?.estimated_duration ? Number(t.estimated_duration) : 0)
  }, 0)
  const estimatedHours = totalMinutes > 0 ? +(totalMinutes / 60).toFixed(2) : undefined

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editWO) {
        await updateWO.mutateAsync({ id: editWO.id, ...data })
        toast({ title: 'Work order updated' })
      } else {
        await createWO.mutateAsync({
          ...data,
          assetId: selectedAsset?.id,
          estimatedHours,
          taskIds: selectedTaskIds,
        })
        toast({ title: 'Work order created', description: selectedTaskIds.length ? `${selectedTaskIds.length} tasks added` : undefined })
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
    { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="max-w-xs truncate block">{row.original.title}</span> },
    { accessorKey: 'asset', header: 'Asset', cell: ({ row }) => row.original.asset?.name || '-' },
    { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <StatusBadge type="priority" value={row.original.priority} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge type="wo" value={row.original.status} /> },
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
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
            <div className="border-t pt-4 space-y-3">
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
                    <Input placeholder="Filter by name..."        value={filterName}     onChange={e => { setFilterName(e.target.value);     setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                    <Input placeholder="Filter by asset type..."  value={filterType}     onChange={e => { setFilterType(e.target.value);     setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                    <Input placeholder="Filter by parent asset..." value={filterParent}  onChange={e => { setFilterParent(e.target.value);   setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
                    <Input placeholder="Filter by location..."    value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setAssetDropOpen(true) }} onFocus={() => setAssetDropOpen(true)} />
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

          {/* ── Safety Condition (only after asset selected) ── */}
          {!editWO && selectedAsset && (
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

          {/* ── Task Selection ── */}
          {!editWO && selectedAsset && safetyMode && (
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

              {/* Estimated hours summary */}
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

          {/* ── Description ── */}
          <div className="space-y-2 border-t pt-4">
            <Label>Description</Label>
            <Input {...register('description')} placeholder="Additional details..." />
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={deleteWO.isPending} />
    </div>
  )
}
