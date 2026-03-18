import { useState } from 'react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useRoles } from '@/hooks/useUsers'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'

export function UsersPage() {
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)

  const { data, isLoading } = useUsers({ page, limit: 20, search })
  const { data: roles } = useRoles()
  const create = useCreateUser()
  const update = useUpdateUser()
  const remove = useDeleteUser()

  const { register, handleSubmit, control, reset } = useForm<Partial<User> & { password?: string }>()

  const openCreate = () => { setEditUser(null); reset({}); setModalOpen(true) }
  const openEdit = (u: User) => { setEditUser(u); reset(u); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editUser) { await update.mutateAsync({ id: editUser.id, ...data }); toast({ title: 'User updated' }) }
      else {
        if (!data.password) { toast({ title: 'Password required', variant: 'destructive' }); return }
        await create.mutateAsync(data as Partial<User> & { password: string }); toast({ title: 'User created' })
      }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<User>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.firstName} {row.original.lastName}</span> },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role?.name || '-' },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || '-' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
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
      <div><h1 className="text-2xl font-bold">Users</h1><p className="text-muted-foreground">Manage system users and permissions</p></div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add User" searchValue={search} onSearchChange={setSearch} page={page} totalPages={data?.pagination.totalPages} onPageChange={setPage} total={data?.pagination.total} />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editUser ? 'Edit User' : 'Add User'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>First Name *</Label><Input {...register('firstName', { required: true })} /></div>
            <div className="space-y-2"><Label>Last Name *</Label><Input {...register('lastName', { required: true })} /></div>
          </div>
          <div className="space-y-2"><Label>Email *</Label><Input type="email" {...register('email', { required: true })} /></div>
          {!editUser && <div className="space-y-2"><Label>Password *</Label><Input type="password" {...register('password')} /></div>}
          <div className="space-y-2">
            <Label>Role</Label>
            <Controller control={control} name="roleId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(+v)} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{(roles as { id: number; name: string }[] | undefined)?.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input {...register('phone')} /></div>
          <div className="space-y-2"><Label>Hourly Rate</Label><Input type="number" step="0.01" {...register('hourlyRate', { valueAsNumber: true })} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
