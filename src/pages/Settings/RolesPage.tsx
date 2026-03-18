import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { Role, ApiResponse } from '@/types'
import { Pencil, Trash2, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'

export function RolesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState<Role | null>(null)

  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: async () => { const { data } = await api.get<ApiResponse<Role[]>>('/roles'); return data.data } })
  const create = useMutation({ mutationFn: async (body: Partial<Role>) => { const { data } = await api.post('/roles', body); return data.data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }) })
  const update = useMutation({ mutationFn: async ({ id, ...body }: Partial<Role> & { id: number }) => { const { data } = await api.put(`/roles/${id}`, body); return data.data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }) })
  const remove = useMutation({ mutationFn: async (id: number) => { await api.delete(`/roles/${id}`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }) })

  const { register, handleSubmit, reset } = useForm<Partial<Role>>()

  const openCreate = () => { setEditRole(null); reset({}); setModalOpen(true) }
  const openEdit = (r: Role) => { setEditRole(r); reset(r); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editRole) { await update.mutateAsync({ id: editRole.id, ...data }); toast({ title: 'Role updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Role created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Cannot delete system roles', variant: 'destructive' }) }
  }

  const columns: ColumnDef<Role>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div className="flex items-center gap-2"><span className="font-medium">{row.original.name}</span>{row.original.isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}</div> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    { accessorKey: 'isSystem', header: 'Type', cell: ({ row }) => <Badge variant={row.original.isSystem ? 'secondary' : 'outline'}>{row.original.isSystem ? 'System' : 'Custom'}</Badge> },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} disabled={row.original.isSystem}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)} disabled={row.original.isSystem}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Roles</h1><p className="text-muted-foreground">Manage user roles and permissions</p></div>
      <DataTable columns={columns} data={roles || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Role" />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editRole ? 'Edit Role' : 'Add Role'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2"><Label>Description</Label><Input {...register('description')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
