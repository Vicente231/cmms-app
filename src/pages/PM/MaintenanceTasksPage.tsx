import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
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
import { Pencil, Trash2, Ruler } from 'lucide-react'

const KEY = 'maintenance-tasks'
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual']
const SAFETY_LEVELS = ['DE-ENERGIZED', 'LOCKOUT TAGOUT', 'ENERGIZED', 'HOT WORK', 'CONFINED SPACE']

export function MaintenanceTasksPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<GASMaintenanceTask | null>(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [KEY],
    queryFn: () => gasGet<GASMaintenanceTask[]>('maintenanceTasks'),
  })

  const create = useMutation({
    mutationFn: (body: Partial<GASMaintenanceTask>) =>
      gasPost<{ success: boolean }>('createMaintenanceTask', body as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }) },
  })

  const update = useMutation({
    mutationFn: ({ task_id, updates }: { task_id: string; updates: Partial<GASMaintenanceTask> }) =>
      gasPost<{ success: boolean }>('updateMaintenanceTask', { task_id, updates }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }) },
  })

  const remove = useMutation({
    mutationFn: (task_id: string) =>
      gasPost<{ success: boolean }>('deleteMaintenanceTask', { task_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ['maintenance-tasks'] }) },
  })

  const { register, handleSubmit, control, reset } = useForm<Partial<GASMaintenanceTask>>()

  const filtered = tasks.filter(t =>
    !search ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.asset_type?.toLowerCase().includes(search.toLowerCase()) ||
    t.task_id?.toLowerCase().includes(search.toLowerCase())
  )

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
        ? <span className="flex items-center gap-1 text-sm"><Ruler className="h-3 w-3" />{row.original.measurement_unit}{row.original.pass_condition && <span className="text-xs text-muted-foreground ml-1">({row.original.pass_condition})</span>}</span>
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

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New Task"
        searchValue={search}
        onSearchChange={setSearch}
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
            <p className="text-xs text-muted-foreground mt-2">Leave blank if this task only requires a checkbox (no measurement needed)</p>
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
