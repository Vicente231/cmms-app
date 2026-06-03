import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects, useCreateProject, useDeleteProject, PROJECT_TYPES, PROJECT_STATUS_COLORS, PROJECT_TYPE_COLORS } from '@/hooks/useProjects'
import type { ProjectFormData } from '@/hooks/useProjects'
import { useAssets } from '@/hooks/useAssets'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useForm, Controller } from 'react-hook-form'
import { Eye, Trash2, X } from 'lucide-react'
import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import type { Project, Asset } from '@/types'
import { cn } from '@/lib/utils'

export function ProjectsPage() {
  const navigate   = useNavigate()
  const { toast }  = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [filterName,     setFilterName]     = useState('')
  const [filterType,     setFilterType]     = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [dropOpen,       setDropOpen]       = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])

  const { data: projects = [], isLoading } = useProjects()
  const { data: assetsData }               = useAssets('', 1, 9999)
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()

  const { register, handleSubmit, control, reset } = useForm<ProjectFormData>()

  const hasAssetFilter = filterName || filterType || filterLocation
  const assetResults = hasAssetFilter
    ? (assetsData?.data ?? []).filter(a => {
        const n = !filterName     || a.name?.toLowerCase().includes(filterName.toLowerCase())
        const t = !filterType     || a.model?.toLowerCase().includes(filterType.toLowerCase())
        const l = !filterLocation || a.location?.name?.toLowerCase().includes(filterLocation.toLowerCase())
        return n && t && l
      }).slice(0, 10)
    : []

  const openCreate = () => {
    reset({ type: 'Maintenance Shutdown' })
    setSelectedAssets([])
    setFilterName(''); setFilterType(''); setFilterLocation('')
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createProject.mutateAsync({
        ...data,
        assets_scope: selectedAssets.map(a => a.assetTag ?? ''),
      })
      toast({ title: 'Project created' })
      setModalOpen(false)
    } catch {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' })
    }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteProject.mutateAsync(deleteId)
      toast({ title: 'Project deleted' })
      setDeleteId(null)
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'id', header: 'ID',
      cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.id}</span>,
    },
    {
      accessorKey: 'name', header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'type', header: 'Type',
      cell: ({ row }) => (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', PROJECT_TYPE_COLORS[row.original.type])}>
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', PROJECT_STATUS_COLORS[row.original.status])}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'plannedStart', header: 'Start',
      cell: ({ row }) => row.original.plannedStart
        ? format(new Date(row.original.plannedStart), 'MMM d, yyyy') : '—',
    },
    {
      accessorKey: 'plannedEnd', header: 'End',
      cell: ({ row }) => row.original.plannedEnd
        ? format(new Date(row.original.plannedEnd), 'MMM d, yyyy') : '—',
    },
    {
      accessorKey: 'assetsScope', header: 'Assets',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.assetsScope.length > 0 ? `${row.original.assetsScope.length} asset${row.original.assetsScope.length !== 1 ? 's' : ''}` : '—'}
        </span>
      ),
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${row.original.id}`)}><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-muted-foreground">Plan and track shutdowns, installations, and maintenance projects</p>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        onAddNew={openCreate}
        addNewLabel="New Project"
      />

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="New Project"
        onSubmit={onSubmit}
        isLoading={createProject.isPending}
        size="lg"
      >
        <div className="space-y-4">

          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input {...register('name', { required: true })} placeholder="e.g. Kiln 4 Annual Shutdown 2026" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Controller control={control} name="type" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Start</Label>
              <Input type="date" {...register('planned_start')} />
            </div>
            <div className="space-y-2">
              <Label>Planned End</Label>
              <Input type="date" {...register('planned_end')} />
            </div>
          </div>

          {/* Asset scope picker */}
          <div className="space-y-2">
            <Label>Assets in Scope</Label>
            {selectedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedAssets.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    {a.name}
                    <button type="button" onClick={() => setSelectedAssets(prev => prev.filter(x => x.id !== a.id))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div
              className="space-y-2"
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setDropOpen(false), 150) }}
            >
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Filter by name..." value={filterName} onChange={e => { setFilterName(e.target.value); setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
                <Input placeholder="Filter by type..." value={filterType} onChange={e => { setFilterType(e.target.value); setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
                <Input placeholder="Filter by location..." value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setDropOpen(true) }} onFocus={() => setDropOpen(true)} />
              </div>
              {dropOpen && hasAssetFilter && (
                <div className="rounded-lg border bg-popover shadow-md max-h-40 overflow-y-auto">
                  {assetResults.length === 0
                    ? <p className="p-3 text-sm text-muted-foreground">No assets found</p>
                    : assetResults.map(a => (
                      <div
                        key={a.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center justify-between"
                        onMouseDown={() => {
                          if (!selectedAssets.find(x => x.id === a.id))
                            setSelectedAssets(prev => [...prev, a])
                          setDropOpen(false)
                        }}
                      >
                        <span className="font-medium">{a.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{a.assetTag}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Project scope, objectives, special requirements..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteProject.isPending}
        description="This will permanently delete this project. Linked work orders will be unlinked but not deleted."
      />
    </div>
  )
}
