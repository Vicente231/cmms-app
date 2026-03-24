import { useState, useRef } from 'react'
import { usePMSchedules, useCreatePMSchedule, useUpdatePMSchedule, useDeletePMSchedule, useGenerateWO, useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { useAssets } from '@/hooks/useAssets'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { PmSchedule } from '@/types'
import { Pencil, Trash2, Play, Calendar } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

const freqUnits = ['days', 'weeks', 'months', 'years']
const priorities = ['low', 'medium', 'high', 'critical']

export function PMSchedulesPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editPM, setEditPM] = useState<PmSchedule | null>(null)

  // Form asset/task picker state
  const [selectedAssetType, setSelectedAssetType] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])   // assetTags
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  const { data, isLoading } = usePMSchedules({ page, limit: 20 })
  const { data: assets }    = useAssets('', 1, 9999)
  const { data: allTasks }  = useMaintenanceTasks()
  const create     = useCreatePMSchedule()
  const update     = useUpdatePMSchedule()
  const remove     = useDeletePMSchedule()
  const generateWO = useGenerateWO()

  const { register, handleSubmit, control, reset } = useForm<Partial<PmSchedule>>()

  const allAssets  = assets?.data ?? []
  const assetTypes = [...new Set(allAssets.map(a => a.model).filter(Boolean))] as string[]
  const locations  = [...new Set(
    allAssets.filter(a => !selectedAssetType || a.model === selectedAssetType)
             .map(a => a.location?.name).filter(Boolean)
  )] as string[]

  // Assets filtered by type + location + search
  const visibleAssets = allAssets.filter(a => {
    if (selectedAssetType && a.model !== selectedAssetType) return false
    if (locationFilter && locationFilter !== 'all' && a.location?.name !== locationFilter) return false
    if (assetSearch && !(a.name ?? '').toLowerCase().includes(assetSearch.toLowerCase())) return false
    return true
  })

  // Tasks for selected asset type
  const tasksForType = (allTasks ?? []).filter(t => !selectedAssetType || t.asset_type === selectedAssetType)

  const resetModal = () => {
    setSelectedAssetType(''); setLocationFilter(''); setAssetSearch('')
    setSelectedAssets([]); setSelectedTaskIds([])
  }

  const openCreate = () => {
    setEditPM(null)
    reset({ frequencyValue: 1, frequencyUnit: 'months', priority: 'medium', isActive: true })
    resetModal()
    setModalOpen(true)
  }

  const openEdit = (pm: PmSchedule) => {
    setEditPM(pm)
    reset(pm)
    // Restore asset type from first selected asset
    const firstTag = (pm.targetId ?? '').split(',')[0]
    const firstAsset = allAssets.find(a => a.assetTag === firstTag)
    setSelectedAssetType(firstAsset?.model ?? '')
    setLocationFilter(''); setAssetSearch('')
    setSelectedAssets((pm.targetId ?? '').split(',').filter(Boolean))
    setSelectedTaskIds(pm.taskIds ?? [])
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        ...data,
        targetType: 'group' as const,
        targetId: selectedAssets.join(','),
        taskIds: selectedTaskIds,
      }
      if (editPM) { await update.mutateAsync({ id: editPM.id, ...payload }); toast({ title: 'PM Schedule updated' }) }
      else { await create.mutateAsync(payload); toast({ title: 'PM Schedule created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error saving PM schedule', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const handleGenerateWO = async (pm: PmSchedule) => {
    try {
      const res = await generateWO.mutateAsync(pm.id)
      toast({ title: `Generated ${res.created} work order${res.created !== 1 ? 's' : ''}`, description: res.wo_ids.join(', ') })
    } catch { toast({ title: 'Error generating work orders', variant: 'destructive' }) }
  }

  const toggleAsset = (tag: string) =>
    setSelectedAssets(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  const toggleTask = (id: string) =>
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const selectAllVisible = () => {
    const tags = visibleAssets.map(a => a.assetTag ?? String(a.id))
    setSelectedAssets(prev => [...new Set([...prev, ...tags])])
  }
  const clearVisible = () => {
    const tags = new Set(visibleAssets.map(a => a.assetTag ?? String(a.id)))
    setSelectedAssets(prev => prev.filter(t => !tags.has(t)))
  }

  const columns: ColumnDef<PmSchedule>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'targetType', header: 'Assets', cell: ({ row }) => {
      const count = (row.original.targetId ?? '').split(',').filter(Boolean).length
      const tasks = (row.original.taskIds ?? []).length
      return (
        <div className="text-sm space-x-1">
          <Badge variant="outline">{count} asset{count !== 1 ? 's' : ''}</Badge>
          {tasks > 0 && <Badge variant="secondary">{tasks} task{tasks !== 1 ? 's' : ''}</Badge>}
        </div>
      )
    }},
    { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => (
      <span className="text-sm">{row.original.frequencyValue} {row.original.frequencyUnit}</span>
    )},
    { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <StatusBadge type="priority" value={row.original.priority} /> },
    { accessorKey: 'nextDueDate', header: 'Next Due', cell: ({ row }) => {
      const due = row.original.nextDueDate
      const overdue = due && isPast(new Date(due))
      return due
        ? <span className={cn('text-sm font-medium', overdue && 'text-red-600')}><Calendar className="inline h-3 w-3 mr-1" />{format(new Date(due), 'MMM d, yyyy')}</span>
        : '-'
    }},
    { accessorKey: 'lastGeneratedAt', header: 'Last Generated', cell: ({ row }) => {
      const d = row.original.lastGeneratedAt
      return d ? <span className="text-sm text-muted-foreground">{format(new Date(d), 'MMM d, yyyy')}</span> : '-'
    }},
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge>
    )},
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => handleGenerateWO(row.original)} disabled={generateWO.isPending}>
          <Play className="h-3 w-3 mr-1" />Generate WO
        </Button>
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PM Schedules</h1>
        <p className="text-muted-foreground">Preventive maintenance schedules</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New PM Schedule"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        page={page}
        totalPages={data?.pagination.totalPages}
        onPageChange={setPage}
        total={data?.pagination.total}
      />

      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editPM ? 'Edit PM Schedule' : 'New PM Schedule'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending} size="lg">
        <div className="grid grid-cols-2 gap-4">

          {/* Name */}
          <div className="col-span-2 space-y-2">
            <Label>Name *</Label>
            <Input {...register('name', { required: true })} placeholder="e.g. Monthly Motor Inspection — Kiln 4" />
          </div>

          {/* ── STEP 1: Asset Type ── */}
          <div className="col-span-2 space-y-2">
            <Label>Asset Type *</Label>
            <Select value={selectedAssetType} onValueChange={(v) => { setSelectedAssetType(v); setSelectedAssets([]); setSelectedTaskIds([]); setLocationFilter('') }}>
              <SelectTrigger><SelectValue placeholder="Select asset type (e.g. MOT, EPL...)" /></SelectTrigger>
              <SelectContent>
                {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ── STEP 2: Asset selection (once type is chosen) ── */}
          {selectedAssetType && (
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Assets <span className="text-muted-foreground text-xs font-normal">({selectedAssets.length} selected)</span></Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={selectAllVisible}>Select visible</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={clearVisible}>Clear visible</Button>
                </div>
              </div>

              {/* Location + name filters */}
              <div className="flex gap-2">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="All locations" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1 h-8 text-sm"
                  placeholder="Search name..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                />
              </div>

              {/* Asset checkbox list */}
              <div className="border rounded-md max-h-44 overflow-y-auto p-2 space-y-1">
                {visibleAssets.length === 0
                  ? <p className="text-sm text-muted-foreground p-2">No {selectedAssetType} assets found</p>
                  : visibleAssets.map(a => {
                    const tag = a.assetTag ?? String(a.id)
                    return (
                      <div key={a.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent">
                        <Checkbox id={`a-${a.id}`} checked={selectedAssets.includes(tag)} onCheckedChange={() => toggleAsset(tag)} />
                        <label htmlFor={`a-${a.id}`} className="text-sm cursor-pointer flex-1 flex justify-between">
                          <span>{a.name}</span>
                          {a.location?.name && <span className="text-xs text-muted-foreground">{a.location.name}</span>}
                        </label>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )}

          {/* ── STEP 3: PM Task checklist (once type is chosen) ── */}
          {selectedAssetType && (
            <div className="col-span-2 space-y-2">
              <Label>PM Tasks for "{selectedAssetType}" <span className="text-muted-foreground text-xs font-normal">({selectedTaskIds.length} selected)</span></Label>
              <div className="border rounded-md max-h-44 overflow-y-auto p-2 space-y-1">
                {tasksForType.length === 0
                  ? <p className="text-sm text-muted-foreground p-2">No tasks defined for this asset type</p>
                  : tasksForType.map(t => (
                    <div key={t.task_id} className="flex items-start gap-2 px-2 py-1 rounded hover:bg-accent">
                      <Checkbox id={`t-${t.task_id}`} checked={selectedTaskIds.includes(t.task_id)} onCheckedChange={() => toggleTask(t.task_id)} className="mt-0.5" />
                      <label htmlFor={`t-${t.task_id}`} className="text-sm cursor-pointer flex-1">
                        <span>{t.description}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{t.frequency}</span>
                        {t.safety && <span className="ml-1 text-xs text-orange-600">{t.safety}</span>}
                      </label>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Controller control={control} name="priority" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <div className="flex gap-2">
              <Input type="number" min={1} className="w-20" {...register('frequencyValue', { valueAsNumber: true })} />
              <Controller control={control} name="frequencyUnit" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{freqUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Next Due Date</Label>
            <Input type="date" {...register('nextDueDate')} />
          </div>

          <div className="space-y-2">
            <Label>Estimated Hours</Label>
            <Input type="number" step="0.5" {...register('estimatedHours', { valueAsNumber: true })} placeholder="0" />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Input {...register('description')} placeholder="Additional notes..." />
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <Controller control={control} name="isActive" render={({ field }) => (
              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
            )} />
            <Label>Active (will generate work orders)</Label>
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
