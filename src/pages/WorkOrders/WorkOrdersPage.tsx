import { useState, useRef } from 'react'
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import type { WorkOrder, WoStatus, WoPriority } from '@/types'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

const statuses: WoStatus[] = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const priorities: WoPriority[] = ['low', 'medium', 'high', 'critical']

export function WorkOrdersPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [editWO, setEditWO] = useState<WorkOrder | null>(null)
  const [assetSearch, setAssetSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  const params = { page, limit: 20, search, ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}) }
  const { data, isLoading } = useWorkOrders(params)
  const { data: assets } = useAssets('', 1, 9999)
  const createWO = useCreateWorkOrder()
  const updateWO = useUpdateWorkOrder()
  const deleteWO = useDeleteWorkOrder()

  const { register, handleSubmit, control, reset } = useForm<Partial<WorkOrder>>()

  const openCreate = () => { setEditWO(null); reset({ priority: 'medium', status: 'open' }); setAssetSearch(''); setLocationFilter(''); setModalOpen(true) }
  const openEdit = (wo: WorkOrder) => { setEditWO(wo); reset(wo); setAssetSearch(''); setLocationFilter(''); setModalOpen(true) }

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (editWO) {
        await updateWO.mutateAsync({ id: editWO.id, ...data })
        toast({ title: 'Work order updated' })
      } else {
        await createWO.mutateAsync(data)
        toast({ title: 'Work order created' })
      }
      setModalOpen(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to save work order', variant: 'destructive' })
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await deleteWO.mutateAsync(deleteId); toast({ title: 'Work order deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const columns: ColumnDef<WorkOrder>[] = [
    { accessorKey: 'woNumber', header: 'WO #', cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.woNumber}</span> },
    { accessorKey: 'title', header: 'Title', cell: ({ row }) => <span className="max-w-xs truncate block">{row.original.title}</span> },
    { accessorKey: 'asset', header: 'Asset', cell: ({ row }) => row.original.asset?.name || '-' },
    { accessorKey: 'priority', header: 'Priority', cell: ({ row }) => <StatusBadge type="priority" value={row.original.priority} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge type="wo" value={row.original.status} /> },
    {
      accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => {
        const due = row.original.dueDate
        const overdue = due && isPast(new Date(due)) && !['completed', 'cancelled'].includes(row.original.status)
        return <span className={cn('text-sm', overdue && 'text-red-600 font-medium')}>{due ? format(new Date(due), 'MMM d, yyyy') : '-'}</span>
      }
    },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/work-orders/${row.original.id}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Work Orders</h1>
        <p className="text-muted-foreground">Manage maintenance work orders</p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New Work Order"
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search work orders..."
        page={page}
        totalPages={data?.pagination.totalPages}
        onPageChange={setPage}
        total={data?.pagination.total}
        extraActions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <CRUDModal open={modalOpen} onOpenChange={setModalOpen} title={editWO ? 'Edit Work Order' : 'New Work Order'} onSubmit={onSubmit} isLoading={createWO.isPending || updateWO.isPending} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Title *</Label>
            <Input {...register('title', { required: true })} placeholder="Describe the work needed" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Asset</Label>
            {/* Location filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by location (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {[...new Set((assets?.data ?? []).map(a => a.location?.name).filter(Boolean))].map(loc => (
                  <SelectItem key={loc} value={loc!}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Name search + combobox */}
            <Controller control={control} name="assetId" render={({ field }) => {
              const allAssets = (assets?.data ?? []).filter(a =>
                !locationFilter || locationFilter === 'all' || a.location?.name === locationFilter
              )
              const selectedAsset = (assets?.data ?? []).find(a => a.id === field.value)
              const filtered = assetSearch
                ? allAssets.filter(a => (a.name ?? '').toLowerCase().includes(assetSearch.toLowerCase()))
                : allAssets
              const [open, setOpen] = useState(false)
              const ref = useRef<HTMLDivElement>(null)
              return (
                <div className="relative" ref={ref}>
                  <Input
                    placeholder={selectedAsset && !assetSearch ? selectedAsset.name : 'Search asset name...'}
                    value={assetSearch}
                    onChange={(e) => { setAssetSearch(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                  />
                  {open && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-56 overflow-y-auto">
                      {filtered.length === 0
                        ? <div className="p-2 text-sm text-muted-foreground">No assets found</div>
                        : filtered.map(a => (
                          <div
                            key={a.id}
                            className={cn('px-3 py-2 text-sm cursor-pointer hover:bg-accent', field.value === a.id && 'bg-accent font-medium')}
                            onMouseDown={() => { field.onChange(a.id); setAssetSearch(''); setOpen(false) }}
                          >
                            <span>{a.name}</span>
                            {a.location?.name && <span className="ml-2 text-xs text-muted-foreground">{a.location.name}</span>}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              )
            }} />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Controller control={control} name="priority" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          {editWO && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller control={control} name="status" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="datetime-local" {...register('dueDate')} />
          </div>
          <div className="space-y-2">
            <Label>Estimated Hours</Label>
            <Input type="number" step="0.5" {...register('estimatedHours', { valueAsNumber: true })} placeholder="0" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Input {...register('description')} placeholder="Additional details..." />
          </div>
        </div>
      </CRUDModal>

      <ConfirmDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={handleDelete} isLoading={deleteWO.isPending} />
    </div>
  )
}
