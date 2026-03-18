import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { PartsCategory, ApiResponse } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

export function PartsCategoriesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editCat, setEditCat] = useState<PartsCategory | null>(null)

  const { data: cats, isLoading } = useQuery({ queryKey: ['parts-categories'], queryFn: async () => { const { data } = await api.get<ApiResponse<PartsCategory[]>>('/parts-categories'); return data.data } })
  const create = useMutation({ mutationFn: async (body: Partial<PartsCategory>) => { const { data } = await api.post('/parts-categories', body); return data.data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['parts-categories'] }) })
  const update = useMutation({ mutationFn: async ({ id, ...body }: Partial<PartsCategory> & { id: number }) => { const { data } = await api.put(`/parts-categories/${id}`, body); return data.data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['parts-categories'] }) })
  const remove = useMutation({ mutationFn: async (id: number) => { await api.delete(`/parts-categories/${id}`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['parts-categories'] }) })

  const { register, handleSubmit, control, reset } = useForm<Partial<PartsCategory>>()

  const openCreate = () => { setEditCat(null); reset({}); setModalOpen(true) }
  const openEdit = (c: PartsCategory) => { setEditCat(c); reset(c); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editCat) { await update.mutateAsync({ id: editCat.id, ...data }); toast({ title: 'Updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<PartsCategory>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'parent', header: 'Parent', cell: ({ row }) => row.original.parent?.name || '-' },
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
      <div><h1 className="text-2xl font-bold">Parts Categories</h1></div>
      <DataTable columns={columns} data={cats || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Category" />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editCat ? 'Edit Category' : 'Add Category'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2">
            <Label>Parent Category</Label>
            <Controller control={control} name="parentId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(v === 'none' ? null : +v)} value={field.value?.toString() || 'none'}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(cats || []).filter(c => c.id !== editCat?.id).map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2"><Label>Description</Label><Input {...register('description')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
