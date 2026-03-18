import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { Team, ApiResponse } from '@/types'
import { Pencil, Trash2, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'

export function TeamsPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editTeam, setEditTeam] = useState<Team | null>(null)

  const { data: teams, isLoading } = useQuery({ queryKey: ['teams'], queryFn: async () => { const { data } = await api.get<ApiResponse<Team[]>>('/teams'); return data.data } })
  const create = useMutation({ mutationFn: async (body: Partial<Team>) => { const { data } = await api.post('/teams', body); return data.data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }) })
  const update = useMutation({ mutationFn: async ({ id, ...body }: Partial<Team> & { id: number }) => { const { data } = await api.put(`/teams/${id}`, body); return data.data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }) })
  const remove = useMutation({ mutationFn: async (id: number) => { await api.delete(`/teams/${id}`) }, onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }) })

  const { register, handleSubmit, reset } = useForm<Partial<Team>>()

  const openCreate = () => { setEditTeam(null); reset({}); setModalOpen(true) }
  const openEdit = (t: Team) => { setEditTeam(t); reset(t); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editTeam) { await update.mutateAsync({ id: editTeam.id, ...data }); toast({ title: 'Team updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Team created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<Team>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    { accessorKey: 'members', header: 'Members', cell: ({ row }) => <div className="flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground" /><span>{row.original.members?.length || 0}</span></div> },
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
      <div><h1 className="text-2xl font-bold">Teams</h1><p className="text-muted-foreground">Manage maintenance teams</p></div>
      <DataTable columns={columns} data={teams || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Team" />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editTeam ? 'Edit Team' : 'Add Team'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input {...register('name', { required: true })} /></div>
          <div className="space-y-2"><Label>Description</Label><Input {...register('description')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
