import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASFailureCode } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import type { FailureCode } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

const KEY = 'failure-codes'

function idNum(code_id: string): number {
  return parseInt(code_id?.replace('FC-', '') || '0', 10) || 0
}

function toCodeId(id: number): string {
  return 'FC-' + String(id).padStart(4, '0')
}

function mapCode(c: GASFailureCode): FailureCode {
  return {
    id: idNum(c.code_id),
    orgId: 0,
    code: c.code,
    description: c.description || undefined,
    category: c.category || undefined,
    createdAt: '',
    updatedAt: '',
  }
}

export function FailureCodesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editFC, setEditFC] = useState<FailureCode | null>(null)
  const [search, setSearch] = useState('')

  const { data: codes, isLoading } = useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASFailureCode[]>('failureCodes')
      return rows.map(mapCode)
    },
  })

  const create = useMutation({
    mutationFn: async (body: Partial<FailureCode>) =>
      gasPost<{ success: boolean }>('createFailureCode', {
        code: body.code || '',
        description: body.description || '',
        category: body.category || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...body }: Partial<FailureCode> & { id: number }) =>
      gasPost<{ success: boolean }>('updateFailureCode', {
        code_id: toCodeId(id),
        updates: { code: body.code, description: body.description, category: body.category },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => gasPost<{ success: boolean }>('deleteFailureCode', { code_id: toCodeId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })

  const { register, handleSubmit, reset } = useForm<Partial<FailureCode>>()

  const openCreate = () => { setEditFC(null); reset({}); setModalOpen(true) }
  const openEdit = (fc: FailureCode) => { setEditFC(fc); reset(fc); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editFC) { await update.mutateAsync({ id: editFC.id, ...data }); toast({ title: 'Updated' }) }
      else { await create.mutateAsync(data); toast({ title: 'Created' }) }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const filtered = (codes || []).filter(c => !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()))

  const columns: ColumnDef<FailureCode>[] = [
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-mono font-medium">{row.original.code}</span> },
    { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description || '-' },
    { accessorKey: 'category', header: 'Category', cell: ({ row }) => row.original.category || '-' },
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
      <div><h1 className="text-2xl font-bold">Failure Codes</h1></div>
      <DataTable columns={columns} data={filtered} isLoading={isLoading} onAddNew={openCreate} addNewLabel="Add Code" searchValue={search} onSearchChange={setSearch} />
      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editFC ? 'Edit Failure Code' : 'Add Failure Code'} onSubmit={onSubmit} isLoading={create.isPending || update.isPending}>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Code *</Label><Input {...register('code', { required: true })} placeholder="MECH-001" /></div>
          <div className="space-y-2"><Label>Category</Label><Input {...register('category')} placeholder="Mechanical, Electrical..." /></div>
          <div className="space-y-2"><Label>Description</Label><Input {...register('description')} /></div>
        </div>
      </CRUDModal>
      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={remove.isPending} />
    </div>
  )
}
