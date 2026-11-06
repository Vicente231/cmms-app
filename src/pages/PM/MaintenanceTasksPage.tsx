import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GASMaintenanceTask } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useForm, Controller } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Ruler, X } from 'lucide-react'

const KEY = 'maintenance-tasks'
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual']
const SAFETY_LEVELS = ['DE-ENERGIZED', 'LOCKOUT TAGOUT', 'ENERGIZED', 'HOT WORK', 'CONFINED SPACE']

export function MaintenanceTasksPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [filterId,   setFilterId]   = useState('')
  const [filterType, setFilterType] = useState('__all__')
  const [filterDesc, setFilterDesc] = useState('')
  const [filterFreq, setFilterFreq] = useState('__all__')
  const [filterSafe, setFilterSafe] = useState('__all__')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<GASMaintenanceTask | null>(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('maintenance_tasks').select('*')
      if (error) throw error
      return (data ?? []) as GASMaintenanceTask[]
    },
  })

  const create = useMutation({
    mutationFn: async (body: Partial<GASMaintenanceTask>) => {
      const { error } = await supabase.from('maintenance_tasks').insert(body as Record<string, unknown>)
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }) },
  })

  const update = useMutation({
    mutationFn: async ({ task_id, updates }: { task_id: string; updates: Partial<GASMaintenanceTask> }) => {
      const { error } = await supabase.from('maintenance_tasks').update(updates as Record<string, unknown>).eq('task_id', task_id)
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }) },
  })

  const remove = useMutation({
    mutationFn: async (task_id: string) => {
      const { error } = await supabase.from('maintenance_tasks').delete().eq('task_id', task_id)
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }) },
  })

  const { register, handleSubmit, control, reset } = useForm<Partial<GASMaintenanceTask>>()

  const hasFilters = filterId || filterType !== '__all__' || filterDesc || filterFreq !== '__all__' || filterSafe !== '__all__'

  const filtered = tasks.filter(t => {
    if (filterId   && !t.task_id?.toLowerCase().includes(filterId.toLowerCase()))       return false
    if (filterType !== '__all__' && t.asset_type !== filterType)                        return false
    if (filterDesc && !t.description?.toLowerCase().includes(filterDesc.toLowerCase())) return false
    if (filterFreq !== '__all__' && t.frequency !== filterFreq)                         return false
    if (filterSafe !== '__all__' && t.safety !== filterSafe)                            return false
    return true
  })

  const clearFilters = () => {
    setFilterId(''); setFilterType('__all__'); setFilterDesc(''); setFilterFreq('__all__'); setFilterSafe('__all__')
  }

  const openCreate = () => {
    setEditTask(null)
    reset({ frequency: 'Monthly', safety: 'DE-ENERGIZED', measurement_unit: '', pass_condition: '' })
    setModalOpen(true)
  }

  const openEdit = (t: GASMaintenanceTask) => {
    setEditTask(t)
    reset(t)
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editTask) {
        const { task_id, ...rest } = data
        await update.mutateAsync({ task_id: editTask.task_id, updates: rest })
        toast({ title: 'Task updated' })
      } else {
        await create.mutateAsync(data)
        toast({ title: 'Task created' })
      }
      setModalOpen(false)
    } catch { toast({ title: 'Error saving task', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<GASMaintenanceTask>[] = [
    { accessorKey: 'task_id', header: 'ID', cell: ({ row }) => <span className="text-xs text-muted-foreground font-mono">{row.original.task_id}</span> },
    { accessorKey: 'asset_type', header: 'Type', cell: ({ row }) => <Badge variant="outline">{row.original.asset_type}</Badge> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => <span className="text-sm">{row.original.description}</span> },
    { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className="text-sm">{row.original.frequency}</span> },
    { accessorKey: 'safety', header: 'Safety', cell: ({ row }) => (
      <Badge variant={row.original.safety?.includes('LOCKOUT') ? 'destructive' : 'secondary'} className="text-xs">{row.original.safety}</Badge>
    )},
    { accessorKey: 'measurement_unit', header: 'Measurement', cell: ({ row }) => (
      row.original.measurement_unit
        ? <div className="text-sm">
            <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{row.original.measurement_unit}{row.original.pass_condition && <span className="text-xs text-muted-foreground ml-1">({row.original.pass_condition})</span>}</span>
            {row.original.measurement_fields && <span className="text-xs text-muted-foreground">{row.original.measurement_fields}</span>}
          </div>
        : <span className="text-xs text-muted-foreground">—</span>
    )},
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.task_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Maintenance Tasks</h1>
        <p className="text-muted-foreground">PM task templates by asset type</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">ID</span>
          <Input
            placeholder="Search ID..."
            value={filterId}
            onChange={e => setFilterId(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Type</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {[...new Set(tasks.map(t => t.asset_type).filter(Boolean))].sort().map(t => (
                <SelectItem key={t} value={t!}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Description</span>
          <Input
            placeholder="Search description..."
            value={filterDesc}
            onChange={e => setFilterDesc(e.target.value)}
            className="h-8 w-52 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Frequency</span>
          <Select value={filterFreq} onValueChange={setFilterFreq}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Safety</span>
          <Select value={filterSafe} onValueChange={setFilterSafe}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {SAFETY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs self-end">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground self-end ml-auto pb-1">
          {filtered.length} of {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New Task"
        mobileCard={(t) => (
          <div className="rounded-lg border bg-background p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{t.task_id}</span>
                <Badge variant="outline" className="text-xs">{t.asset_type}</Badge>
              </div>
              <Badge variant={t.safety?.includes('LOCKOUT') ? 'destructive' : 'secondary'} className="text-xs shrink-0">{t.safety}</Badge>
            </div>
            <p className="text-sm font-medium">{t.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t.frequency}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(t.task_id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          </div>
        )}
      />

      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editTask ? 'Edit Task' : 'New Maintenance Task'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="grid grid-cols-2 gap-4">

          <div className="col-span-2 space-y-2">
            <Label>Description *</Label>
            <Input {...register('description', { required: true })} placeholder="e.g. Check insulation resistance" />
          </div>

          <div className="space-y-2">
            <Label>Asset Type *</Label>
            <Input {...register('asset_type', { required: true })} placeholder="e.g. MOT" />
          </div>

          <div className="space-y-2">
            <Label>Estimated Duration (min)</Label>
            <Input type="number" {...register('estimated_duration')} placeholder="30" />
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Controller control={control} name="frequency" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>

          <div className="space-y-2">
            <Label>Safety Level</Label>
            <Controller control={control} name="safety" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SAFETY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>

          <div className="col-span-2 border-t pt-4">
            <p className="text-sm font-medium mb-3">Measurement (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input {...register('measurement_unit')} placeholder="e.g. GΩ, °C, V, A" />
              </div>
              <div className="space-y-2">
                <Label>Pass Condition</Label>
                <Input {...register('pass_condition')} placeholder="e.g. >1.0, <80, =600" />
              </div>
            </div>
            <div className="space-y-2 mt-3">
              <Label>Measurement Fields (optional)</Label>
              <Input {...register('measurement_fields')} placeholder="e.g. L1-GND,L2-GND,L3-GND  or  Drive Side,Operator Side" />
              <p className="text-xs text-muted-foreground">Comma-separated labels for multi-point measurements. Leave blank for a single value.</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Leave Unit blank if this task only requires a checkbox (no measurement needed)</p>
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
