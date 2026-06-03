import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useProject, useUpdateProject, useDeleteProject, PROJECT_STATUSES, PROJECT_TYPE_COLORS, PROJECT_TYPES, DISCIPLINES } from '@/hooks/useProjects'
import { useWorkOrders, useCreateWorkOrder } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import type { WorkOrder, ProjectStatus, Discipline, WoPriority, Asset } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ArrowLeft, Trash2, ExternalLink, CalendarDays, Tag, CheckCircle2, Circle, Pencil, Plus, X, LayoutList, GanttChart } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useNavigate as useNav } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

const NONE = '__none__'
const STAGE_ORDER: ProjectStatus[] = ['planning', 'active', 'completed', 'cancelled']
const PRIORITIES: WoPriority[] = ['low', 'medium', 'high', 'critical']

export function ProjectDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { toast } = useToast()
  const user      = useAuthStore(s => s.user)
  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor'

  const { data: project, isLoading } = useProject(id ?? '')
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const createWO      = useCreateWorkOrder()
  const { data: assetsData } = useAssets('', 1, 9999)

  // Modals
  const [deleteOpen,  setDeleteOpen]  = useState(false)
  const [editOpen,    setEditOpen]    = useState(false)
  const [newWOOpen,   setNewWOOpen]   = useState(false)
  const [ganttView,   setGanttView]   = useState(false)

  // Edit project state
  const { register: regEdit, handleSubmit: hsEdit, control: ctlEdit, reset: rstEdit } = useForm<{
    name: string; type: string; planned_start: string; planned_end: string; description: string
  }>()
  const [editAssets, setEditAssets] = useState<Asset[]>([])
  const [editFilterName, setEditFilterName] = useState('')
  const [editDropOpen,   setEditDropOpen]   = useState(false)

  // New WO state
  const { register: regWO, handleSubmit: hsWO, control: ctlWO, reset: rstWO } = useForm<{
    title: string; priority: WoPriority; dueDate: string; discipline: string
  }>()

  // WOs for this project
  const { data: woPage } = useWorkOrders({ limit: 9999 })
  const allWOs = woPage?.data ?? []
  const projectWOs = allWOs.filter(wo => wo.projectId === id)

  const grouped = DISCIPLINES.reduce((acc, disc) => {
    const wos = projectWOs.filter(wo => wo.discipline === disc)
    if (wos.length > 0) acc[disc] = wos
    return acc
  }, {} as Record<Discipline, WorkOrder[]>)

  const ungrouped = projectWOs.filter(wo => !wo.discipline || !DISCIPLINES.includes(wo.discipline as Discipline))

  const totalWOs     = projectWOs.length
  const completedWOs = projectWOs.filter(wo => wo.status === 'completed').length
  const progress     = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0

  // Asset picker for edit modal
  const editAssetResults = editFilterName
    ? (assetsData?.data ?? [])
        .filter(a => a.name?.toLowerCase().includes(editFilterName.toLowerCase()))
        .slice(0, 8)
    : []

  const openEdit = () => {
    if (!project) return
    rstEdit({
      name:          project.name,
      type:          project.type,
      planned_start: project.plannedStart,
      planned_end:   project.plannedEnd,
      description:   project.description,
    })
    setEditAssets(
      (assetsData?.data ?? []).filter(a => project.assetsScope.includes(a.assetTag ?? ''))
    )
    setEditFilterName('')
    setEditOpen(true)
  }

  const onEditSubmit = hsEdit(async (data) => {
    if (!project) return
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: {
          ...data,
          assets_scope: editAssets.map(a => a.assetTag ?? '').join(','),
        } as never,
      })
      toast({ title: 'Project updated' })
      setEditOpen(false)
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  })

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return
    try {
      const updates: Record<string, string> = { status }
      if (status === 'active'    && !project.actualStart) updates.actual_start = new Date().toISOString().slice(0, 10)
      if (status === 'completed' && !project.actualEnd)   updates.actual_end   = new Date().toISOString().slice(0, 10)
      await updateProject.mutateAsync({ id: project.id, updates })
      toast({ title: `Project moved to ${status}` })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!project) return
    try {
      await deleteProject.mutateAsync(project.id)
      toast({ title: 'Project deleted' })
      navigate('/projects')
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const openNewWO = () => {
    rstWO({ priority: 'medium', discipline: NONE })
    setNewWOOpen(true)
  }

  const onNewWOSubmit = async (data: { title: string; priority: WoPriority; dueDate: string; discipline: string }) => {
    try {
      await createWO.mutateAsync({
        title:      data.title,
        priority:   data.priority,
        dueDate:    data.dueDate || undefined,
        woType:     'CM',
        projectId:  id,
        discipline: data.discipline !== NONE ? data.discipline : undefined,
      })
      toast({ title: 'Work order created' })
      setNewWOOpen(false)
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>
  if (!project)  return <div className="p-8 text-center text-muted-foreground">Project not found.</div>

  const stageIdx = STAGE_ORDER.indexOf(project.status)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{project.name}</h1>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', PROJECT_TYPE_COLORS[project.type])}>
              {project.type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {project.plannedStart && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(new Date(project.plannedStart), 'MMM d')} — {project.plannedEnd ? format(new Date(project.plannedEnd), 'MMM d, yyyy') : '?'}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              {project.assetsScope.length} asset{project.assetsScope.length !== 1 ? 's' : ''} in scope
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isSupervisor && (
            <Button variant="ghost" size="icon" onClick={openEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {isSupervisor && (
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stage stepper + status control */}
      <Card>
        <CardContent className="pt-5 pb-4 space-y-4">
          <div className="flex items-start">
            {STAGE_ORDER.map((stage, i) => (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1 min-w-0">
                  {i < stageIdx
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    : <Circle className={cn('h-5 w-5 shrink-0', i === stageIdx ? 'text-primary' : 'text-muted-foreground/30')} />}
                  <span className={cn('text-xs font-medium text-center capitalize',
                    i === stageIdx ? 'text-primary' : i < stageIdx ? 'text-green-600' : 'text-muted-foreground/50'
                  )}>{stage}</span>
                </div>
                {i < STAGE_ORDER.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-1.5 rounded mt-[-10px]', i < stageIdx ? 'bg-green-600' : 'bg-muted')} />
                )}
              </div>
            ))}
          </div>

          {isSupervisor && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Change status:</span>
              <Select value={project.status} onValueChange={v => handleStatusChange(v as ProjectStatus)}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress + summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total WOs',  value: totalWOs },
          { label: 'Completed',  value: completedWOs },
          { label: 'Remaining',  value: totalWOs - completedWOs },
          { label: 'Progress',   value: `${progress}%` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {totalWOs > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall completion</span>
            <span>{completedWOs}/{totalWOs} work orders</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Work Orders by Discipline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Work Orders</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
              <Button
                size="sm"
                variant={!ganttView ? 'default' : 'ghost'}
                className="h-7 px-2 gap-1"
                onClick={() => setGanttView(false)}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">List</span>
              </Button>
              <Button
                size="sm"
                variant={ganttView ? 'default' : 'ghost'}
                className="h-7 px-2 gap-1"
                onClick={() => setGanttView(true)}
              >
                <GanttChart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-xs">Gantt</span>
              </Button>
            </div>
            <Button size="sm" variant="default" onClick={openNewWO}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New WO
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/work-orders?project=${id}`)}>
              View All
            </Button>
          </div>
        </div>

        {ganttView ? (
          <Card>
            <CardContent className="pt-5">
              <GanttView wos={projectWOs} project={project} />
            </CardContent>
          </Card>
        ) : (
          <>
            {totalWOs === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No work orders linked to this project yet.<br />
                  Click <strong>New WO</strong> to create one directly here.
                </CardContent>
              </Card>
            )}

            {Object.entries(grouped).map(([disc, wos]) => (
              <Card key={disc}>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{disc}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <WOList wos={wos as WorkOrder[]} navigate={navigate} />
                </CardContent>
              </Card>
            ))}

            {ungrouped.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Unassigned Discipline</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <WOList wos={ungrouped} navigate={navigate} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Assets in scope */}
      {project.assetsScope.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assets in Scope</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {project.assetsScope.map(tag => (
                <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono">{tag}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {project.description && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm whitespace-pre-wrap">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Edit Project Modal ── */}
      <CRUDModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Project"
        onSubmit={onEditSubmit}
        isLoading={updateProject.isPending}
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input {...regEdit('name', { required: true })} placeholder="e.g. Kiln 4 Annual Shutdown 2026" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller control={ctlEdit} name="type" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Start</Label>
              <Input type="date" {...regEdit('planned_start')} />
            </div>
            <div className="space-y-2">
              <Label>Planned End</Label>
              <Input type="date" {...regEdit('planned_end')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assets in Scope</Label>
            {editAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {editAssets.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    {a.name}
                    <button type="button" onClick={() => setEditAssets(prev => prev.filter(x => x.id !== a.id))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTimeout(() => setEditDropOpen(false), 150) }}
            >
              <Input
                placeholder="Search assets to add..."
                value={editFilterName}
                onChange={e => { setEditFilterName(e.target.value); setEditDropOpen(true) }}
                onFocus={() => setEditDropOpen(true)}
              />
              {editDropOpen && editFilterName && (
                <div className="rounded-lg border bg-popover shadow-md max-h-40 overflow-y-auto mt-1">
                  {editAssetResults.length === 0
                    ? <p className="p-3 text-sm text-muted-foreground">No assets found</p>
                    : editAssetResults.map(a => (
                      <div
                        key={a.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent flex items-center justify-between"
                        onMouseDown={() => {
                          if (!editAssets.find(x => x.id === a.id))
                            setEditAssets(prev => [...prev, a])
                          setEditFilterName('')
                          setEditDropOpen(false)
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
              {...regEdit('description')}
              rows={3}
              placeholder="Project scope, objectives..."
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>
      </CRUDModal>

      {/* ── New WO Modal ── */}
      <CRUDModal
        open={newWOOpen}
        onOpenChange={setNewWOOpen}
        title={`New Work Order — ${id}`}
        onSubmit={hsWO(onNewWOSubmit)}
        isLoading={createWO.isPending}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input {...regWO('title', { required: true })} placeholder="Describe the work needed" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller control={ctlWO} name="priority" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value ?? 'medium'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...regWO('dueDate')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Discipline <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Controller control={ctlWO} name="discipline" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? NONE}>
                <SelectTrigger><SelectValue placeholder="Select discipline..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— None —</SelectItem>
                  {DISCIPLINES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <p className="text-xs text-muted-foreground">
            This WO will be automatically linked to project <span className="font-mono">{id}</span>.
          </p>
        </div>
      </CRUDModal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={deleteProject.isPending}
        description="This will permanently delete this project. Linked work orders will be unlinked but not deleted."
      />
    </div>
  )
}

const GANTT_COLORS: Record<string, string> = {
  open:        'bg-slate-400',
  in_progress: 'bg-blue-500',
  on_hold:     'bg-orange-400',
  completed:   'bg-green-500',
  cancelled:   'bg-gray-300',
}

function GanttView({ wos, project }: { wos: WorkOrder[]; project: import('@/types').Project }) {
  const tlStart = project.plannedStart ? new Date(project.plannedStart).getTime() : null
  const tlEnd   = project.plannedEnd   ? new Date(project.plannedEnd).getTime()   : null

  if (!tlStart || !tlEnd || tlEnd <= tlStart) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Set planned start and end dates on the project to view the Gantt chart.
      </div>
    )
  }

  if (wos.length === 0) {
    return <div className="py-10 text-center text-sm text-muted-foreground">No work orders to display.</div>
  }

  const span = tlEnd - tlStart
  const now  = new Date().getTime()
  const todayPct = Math.min(100, Math.max(0, ((now - tlStart) / span) * 100))

  const ticks: { label: string; pct: number }[] = []
  const d = new Date(tlStart)
  d.setDate(1)
  if (d.getTime() < tlStart) d.setMonth(d.getMonth() + 1)
  while (d.getTime() <= tlEnd) {
    const pct = ((d.getTime() - tlStart) / span) * 100
    ticks.push({ label: format(d, 'MMM yy'), pct })
    d.setMonth(d.getMonth() + 1)
  }

  const grouped: Record<string, WorkOrder[]> = {}
  wos.forEach(wo => {
    const key = wo.discipline || 'General'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(wo)
  })

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 640 }}>
        {/* Header row */}
        <div className="flex items-end mb-1">
          <div className="w-36 shrink-0" />
          <div className="flex-1 relative h-6 border-b border-border">
            {ticks.map((t, i) => (
              <div
                key={i}
                className="absolute flex flex-col items-start"
                style={{ left: `${t.pct}%` }}
              >
                <span className="text-[10px] text-muted-foreground whitespace-nowrap pl-1">{t.label}</span>
                <div className="w-px h-1.5 bg-border mt-0.5" />
              </div>
            ))}
            {todayPct > 0 && todayPct < 100 && (
              <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${todayPct}%` }} />
            )}
          </div>
        </div>

        {/* Rows grouped by discipline */}
        {Object.entries(grouped).map(([disc, discWOs]) => (
          <div key={disc} className="mb-3">
            <div className="flex items-center mb-0.5">
              <div className="w-36 shrink-0 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{disc}</span>
              </div>
            </div>
            {discWOs.map(wo => {
              const dueMs  = wo.dueDate ? new Date(wo.dueDate).getTime() : tlEnd
              const barPct = Math.min(100, Math.max(1, ((dueMs - tlStart) / span) * 100))
              const overdue = wo.dueDate && new Date(wo.dueDate) < new Date() && !['completed', 'cancelled'].includes(wo.status)
              const color   = overdue ? 'bg-red-500' : (GANTT_COLORS[wo.status] || 'bg-slate-400')

              return (
                <div key={wo.id} className="flex items-center mb-0.5" style={{ height: 28 }}>
                  <div className="w-36 shrink-0 pr-2 text-right">
                    <span className="font-mono text-[10px] text-muted-foreground">{wo.woNumber}</span>
                  </div>
                  <div className="flex-1 relative bg-muted/20 rounded" style={{ height: 20 }}>
                    {/* Grid lines */}
                    {ticks.map((t, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: `${t.pct}%` }} />
                    ))}
                    {/* Today */}
                    {todayPct > 0 && todayPct < 100 && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-400/50" style={{ left: `${todayPct}%` }} />
                    )}
                    {/* Bar */}
                    <div
                      className={cn('absolute top-1 bottom-1 rounded', color)}
                      style={{ left: 0, width: `${barPct}%` }}
                      title={`${wo.title} · Due ${wo.dueDate ? format(new Date(wo.dueDate), 'MMM d, yyyy') : 'N/A'}`}
                    />
                    {barPct > 15 && (
                      <span
                        className="absolute top-0 bottom-0 flex items-center text-[10px] text-white pl-1 truncate pointer-events-none"
                        style={{ left: 0, width: `${barPct}%` }}
                      >
                        {wo.title}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t ml-36">
          {[
            { color: 'bg-slate-400',  label: 'Open' },
            { color: 'bg-blue-500',   label: 'In Progress' },
            { color: 'bg-orange-400', label: 'On Hold' },
            { color: 'bg-green-500',  label: 'Completed' },
            { color: 'bg-red-500',    label: 'Overdue' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-2.5 rounded', color)} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-px h-3 bg-red-400" />
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WOList({ wos, navigate }: { wos: WorkOrder[]; navigate: ReturnType<typeof useNav> }) {
  return (
    <div className="divide-y">
      {wos.map(wo => {
        const done = wo.status === 'completed'
        return (
          <div key={wo.id} className="flex items-center gap-3 py-2">
            {done
              ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
            <div className="flex-1 min-w-0">
              <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
              <p className="text-sm truncate">{wo.title || '—'}</p>
            </div>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full capitalize',
              done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
            )}>{wo.status?.replace(/_/g, ' ')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/work-orders/${wo.id}`)}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
