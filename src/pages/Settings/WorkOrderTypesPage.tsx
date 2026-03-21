import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASWorkOrderType } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkOrderType } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

const KEY = 'work-order-types'

function idNum(type_id: string): number {
  return parseInt(type_id?.replace('WOT-', '') || '0', 10) || 0
}

function toTypeId(id: number): string {
  return 'WOT-' + String(id).padStart(3, '0')
}

function mapType(t: GASWorkOrderType): WorkOrderType {
  return {
    id: idNum(t.type_id),
    orgId: 0,
    name: t.name,
    color: t.color || '#3B82F6',
    description: t.description || undefined,
    createdAt: '',
    updatedAt: '',
  }
}

export function WorkOrderTypesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editType, setEditType] = useState<WorkOrderType | null>(null)

  const { data: types, isLoading } = useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASWorkOrderType[]>('workOrderTypes')
      return rows.map(mapType)
    },
  })

  const create = useMutation({
    mutationFn: async (body: Partial<WorkOrderType>) =>
      gasPost<{ success: boolean }>('createWorkOrderType', {
        name: body.name || '',
        color: body.color || '#3B82F6',
        description: body.description || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...body }: Partial<WorkOrderType> & { id: number }) =>
      gasPost<{ success: boolean }>('updateWorkOrderType', {
        type_id: toTypeId(id),
        updates: { name: body.name, color: body.color, description: body.description },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => gasPost<{ success: boolean }>('deleteWorkOrderType', { type_id: toTypeId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })

  const { register, handleSubmit, reset } = useForm<Partial<WorkOrderType>>()

  const openCreate = () => { setEditType(null); reset({ color: '#3B82F6' }); setModalOpen(true) }
  const openEdit = (t: WorkOrderType) => { setEditType(t); reset(t); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editType) { await update.mutateAsync({ id: editType.id, ...data }); toast({ title: 'Updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<WorkOrderType>[] = [
    { accessorKey: 'color', header: 'Color', cell: ({ row }) => <div className="flex items-center gap-2"><div className="h-4 w-4 rounded" style={{ backgroundColor: row.original.color }} /><span>{row.original.color}</span></div> },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Work Order Types</h1></div>
      <DataTable columns={columns} data={types || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Type" />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editType ? 'Edit Type' : 'Add Type'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2"><Label>Color</Label><Input type="color" {...register('color')} className="h-10 w-full" /></div>
          <div className="space-y-2"><Label>Description</Label><Input {...register('description')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
