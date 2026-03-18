import { useState } from 'react'
import { usePMSchedules, useCreatePMSchedule, useUpdatePMSchedule, useDeletePMSchedule, useGenerateWO } from '@/hooks/usePMSchedules'
import { useAssets } from '@/hooks/useAssets'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { PmSchedule } from '@/types'
import { Pencil, Trash2, Play, Calendar } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

const freqUnits = ['days', 'weeks', 'months', 'years']

export function PMSchedulesPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editPM, setEditPM] = useState<PmSchedule | null>(null)

  const { data, isLoading } = usePMSchedules({ page, limit: 20 })
  const { data: assets } = useAssets({ limit: 100 })
  const create = useCreatePMSchedule()
  const update = useUpdatePMSchedule()
  const remove = useDeletePMSchedule()
  const generateWO = useGenerateWO()

  const { register, handleSubmit, control, reset } = useForm<Partial<PmSchedule>>()

  const openCreate = () => { setEditPM(null); reset({ frequencyValue: 1, frequencyUnit: 'months', isActive: true }); setModalOpen(true) }
  const openEdit = (pm: PmSchedule) => { setEditPM(pm); reset(pm); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editPM) { await update.mutateAsync({ id: editPM.id, ...data }); toast({ title: 'PM Schedule updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'PM Schedule created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const handleGenerateWO = async (pmId: number) => {
    try { await generateWO.mutateAsync(pmId); toast({ title: 'Work order generated successfully' }) }
    catch { toast({ title: 'Error generating work order', variant: 'destructive' }) }
  }

  const columns: ColumnDef<PmSchedule>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'asset', header: 'Asset', cell: ({ row }) => row.original.asset?.name || '-' },
    { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <span className="text-sm">{row.original.frequencyValue} {row.original.frequencyUnit}</span> },
    { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <StatusBadge type="priority" value={row.original.priority} /> },
    {
      accessorKey: 'nextDueDate', header: 'Next Due', cell: ({ row }) => {
        const due = row.original.nextDueDate
        const overdue = due && isPast(new Date(due))
        return due ? <span className={cn('text-sm font-medium', overdue && 'text-red-600')}><Calendar className="inline h-3 w-3 mr-1" />{format(new Date(due), 'MMM d, yyyy')}</span> : '-'
      }
    },
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => handleGenerateWO(row.original.id)} disabled={generateWO.isPending}><Play className="h-3 w-3 mr-1" />Generate WO</Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">PM Schedules</h1><p className="text-muted-foreground">Preventive maintenance schedules</p></div>

      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="New PM Schedule" searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />

      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editPM ? 'Edit PM Schedule' : 'New PM Schedule'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} placeholder="PM schedule name" /></div>
          <div className="space-y-2">
            <Label>Asset</Label>
            <Controller control={control} name="assetId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(+v)} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>{assets?.data.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Controller control={control} name="priority" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['low', 'medium', 'high', 'critical'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2"><Label>Frequency Value</Label><Input type="number" {...register('frequencyValue', { valueAsNumber: true })} /></div>
          <div className="space-y-2">
            <Label>Frequency Unit</Label>
            <Controller control={control} name="frequencyUnit" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{freqUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2"><Label>Next Due Date</Label><Input type="date" {...register('nextDueDate')} /></div>
          <div className="space-y-2"><Label>Estimated Hours</Label><Input type="number" step="0.5" {...register('estimatedHours', { valueAsNumber: true })} /></div>
          <div className="col-span-2 space-y-2"><Label>Description</Label><Input {...register('description')} placeholder="Description" /></div>
        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
