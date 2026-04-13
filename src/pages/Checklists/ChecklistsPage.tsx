import { useState, type FormEvent } from 'react'
import { useAssets } from '@/hooks/useAssets'
import { usePMSchedules, useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Printer, Pencil, Trash2, Plus, FileText, Calendar } from 'lucide-react'
import { loadConfigs, saveConfigs, openPrintChecklist } from '@/utils/printChecklist'
import type { ChecklistConfig, OperationMode } from '@/utils/printChecklist'
import type { PmSchedule } from '@/types'
import type { GASMaintenanceTask } from '@/lib/api'
import { format } from 'date-fns'

type FormValues = {
  name: string
  pmId: string
  location: string
  operationMode: OperationMode
  description?: string
}

// ── Isolated form component — uses local state, no RHF for selects ─────────
function ChecklistForm({
  allPMs,
  allTasks,
  locations,
  defaultValues,
  onSave,
}: {
  allPMs: PmSchedule[]
  allTasks: GASMaintenanceTask[]
  locations: string[]
  defaultValues: FormValues
  onSave: (data: FormValues, pm: PmSchedule) => void
}) {
  const [name, setName] = useState(defaultValues.name)
  const [pmIdx, setPmIdx] = useState<string>('')           // index in allPMs array as string
  const [location, setLocation] = useState(defaultValues.location)
  const [mode, setMode] = useState<OperationMode>(defaultValues.operationMode)
  const [description, setDescription] = useState(defaultValues.description ?? '')

  // If editing, find the index of the pre-selected PM by pmId
  useState(() => {
    if (defaultValues.pmId) {
      const idx = allPMs.findIndex(p => String(p.id) === defaultValues.pmId)
      if (idx >= 0) setPmIdx(String(idx))
    }
  })

  const selectedPM = pmIdx !== '' ? allPMs[Number(pmIdx)] ?? null : null
  const pmTaskIds: string[] = selectedPM?.taskIds ?? []
  const pmTasks = allTasks.filter(t => pmTaskIds.includes(t.task_id))
  const filteredTasks = pmTasks.filter(t => {
    if (mode === 'ALL') return true
    const s = (t.safety ?? '').toUpperCase()
    if (mode === 'RUNNING') return s.includes('RUNNING')
    if (mode === 'LOCKOUT') return s.includes('LOCKOUT') || s.includes('LOTO')
    return true
  })

  const modeLabel = (m: OperationMode) =>
    m === 'RUNNING' ? 'Running' : m === 'LOCKOUT' ? 'LOTO' : 'All Tasks'

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!selectedPM || !name || !location) return
    onSave({ name, pmId: String(selectedPM.id), location, operationMode: mode, description }, selectedPM)
  }

  return (
    <form id="checklist-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Checklist Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MCC 1 — Motor Running PM" required />
      </div>

      <div className="space-y-2">
        <Label>PM Schedule *</Label>
        <Select
          value={pmIdx || undefined}
          onValueChange={(v) => {
            setPmIdx(v)
            if (!name) setName(allPMs[Number(v)]?.name ?? '')
          }}
        >
          <SelectTrigger><SelectValue placeholder="Select PM Schedule" /></SelectTrigger>
          <SelectContent>
            {allPMs.map((p, i) => (
              <SelectItem key={i} value={String(i)}>
                {p.name} — {p.frequencyValue} {p.frequencyUnit} · {(p.taskIds ?? []).length} tasks
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPM && (
        <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
          <div className="font-medium text-sm">{selectedPM.name}</div>
          <div className="text-muted-foreground">
            Every {selectedPM.frequencyValue} {selectedPM.frequencyUnit} &nbsp;·&nbsp;
            {selectedPM.targetId?.split(',').length ?? 0} assets &nbsp;·&nbsp;
            {pmTaskIds.length} tasks linked
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Operation Mode *</Label>
        <Select value={mode} onValueChange={(v) => setMode(v as OperationMode)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RUNNING">Machine Running — tasks done while energized</SelectItem>
            <SelectItem value="LOCKOUT">Lockout / Tagout — tasks requiring de-energization</SelectItem>
            <SelectItem value="ALL">All Tasks — every task in this schedule</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPM && (
        <div className={`rounded-md p-2 text-xs font-medium ${
          mode === 'RUNNING' ? 'bg-green-50 text-green-800 border border-green-200' :
          mode === 'LOCKOUT' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
          'bg-muted text-muted-foreground'
        }`}>
          {filteredTasks.length} of {pmTaskIds.length} tasks will appear ({modeLabel(mode)} filter)
          {filteredTasks.length > 0 && (
            <ul className="mt-1 space-y-0.5 font-normal">
              {filteredTasks.map(t => <li key={t.task_id}>· {t.description}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Location (which assets to list) *</Label>
        <Select value={location || undefined} onValueChange={setLocation}>
          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
          <SelectContent>
            {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Lists all assets at this location that belong to the PM's group</p>
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Monthly — energized tasks only" />
      </div>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export function ChecklistsPage() {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<ChecklistConfig[]>(loadConfigs)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editConfig, setEditConfig] = useState<ChecklistConfig | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [formDefaults, setFormDefaults] = useState<FormValues>({ name: '', pmId: '', location: '', operationMode: 'ALL', description: '' })

  const { data: assetsData } = useAssets('', 1, 9999)
  const { data: pmData } = usePMSchedules()
  const { data: allTasks = [] } = useMaintenanceTasks()

  const allAssets = assetsData?.data ?? []
  const allPMs = pmData?.data ?? []

  const locations = [...new Set(
    allAssets.map(a => (a.location as { name?: string })?.name ?? '').filter(Boolean)
  )].sort()

  const persist = (updated: ChecklistConfig[]) => { setConfigs(updated); saveConfigs(updated) }

  const openCreate = () => {
    setEditConfig(null)
    setFormDefaults({ name: '', pmId: '', location: '', operationMode: 'ALL', description: '' })
    setFormKey(k => k + 1)
    setModalOpen(true)
  }

  const openEdit = (c: ChecklistConfig) => {
    setEditConfig(c)
    setFormDefaults({ name: c.name, pmId: c.pmId, location: c.location, operationMode: c.operationMode ?? 'ALL', description: c.description ?? '' })
    setFormKey(k => k + 1)
    setModalOpen(true)
  }

  const handleSave = (data: FormValues, pm: PmSchedule) => {
    const config: Omit<ChecklistConfig, 'id' | 'createdAt'> = {
      name: data.name,
      pmId: data.pmId,
      pmName: pm.name,
      assetType: pm.targetType === 'asset_type' ? (pm.targetId ?? '') : '',
      pmTargetType: pm.targetType ?? 'group',
      pmTargetId: pm.targetId ?? '',
      location: data.location,
      taskIds: pm.taskIds ?? [],
      operationMode: data.operationMode,
      description: data.description,
    }
    if (editConfig) {
      persist(configs.map(c => c.id === editConfig.id ? { ...c, ...config } : c))
      toast({ title: 'Checklist updated' })
    } else {
      persist([...configs, { ...config, id: Date.now().toString(), createdAt: new Date().toISOString() }])
      toast({ title: 'Checklist created' })
    }
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (!deleteId) return
    persist(configs.filter(c => c.id !== deleteId))
    setDeleteId(null)
    toast({ title: 'Deleted' })
  }

  const handleGenerate = async (config: ChecklistConfig) => {
    setGenerating(config.id)
    try {
      const groupIds = config.pmTargetType === 'group'
        ? String(config.pmTargetId).split(',').map(s => s.trim()).filter(Boolean)
        : []

      const filteredAssets = allAssets.filter(a => {
        const loc = (a.location as { name?: string })?.name ?? ''
        const locMatch = !config.location || loc.trim().toLowerCase() === config.location.trim().toLowerCase()
        if (!locMatch) return false
        if (config.pmTargetType === 'asset_type') return (a.model ?? '') === config.assetType
        if (config.pmTargetType === 'group') return groupIds.includes(a.assetTag ?? '')
        if (config.pmTargetType === 'asset') return a.assetTag === config.pmTargetId
        return true
      })

      await openPrintChecklist(config, filteredAssets, allTasks)
    } catch {
      toast({ title: 'Error generating checklist', variant: 'destructive' })
    } finally {
      setGenerating(null)
    }
  }

  const assetCountFor = (c: ChecklistConfig) => {
    const groupIds = c.pmTargetType === 'group'
      ? String(c.pmTargetId).split(',').map(s => s.trim()).filter(Boolean)
      : []
    return allAssets.filter(a => {
      const loc = (a.location as { name?: string })?.name ?? ''
      const locMatch = loc.trim().toLowerCase() === c.location.trim().toLowerCase()
      if (!locMatch) return false
      if (c.pmTargetType === 'asset_type') return (a.model ?? '') === c.assetType
      if (c.pmTargetType === 'group') return groupIds.includes(a.assetTag ?? '')
      if (c.pmTargetType === 'asset') return a.assetTag === c.pmTargetId
      return true
    }).length
  }

  const taskCountFor = (c: ChecklistConfig) =>
    allTasks.filter(t => {
      if (!(c.taskIds ?? []).includes(t.task_id)) return false
      const mode = c.operationMode ?? 'ALL'
      if (mode === 'ALL') return true
      const s = (t.safety ?? '').toUpperCase()
      if (mode === 'RUNNING') return s.includes('RUNNING')
      if (mode === 'LOCKOUT') return s.includes('LOCKOUT') || s.includes('LOTO')
      return true
    }).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">PM Checklists</h1>
          <p className="text-muted-foreground">Printable checklists linked to PM Schedules</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Checklist</Button>
      </div>

      {configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">No checklists yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create a checklist linked to a PM Schedule to get started</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Checklist</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map(c => (
            <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />{c.pmName}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">{c.location}</Badge>
                {c.assetType && <Badge variant="secondary" className="text-xs">{c.assetType}</Badge>}
                {(c.operationMode ?? 'ALL') === 'RUNNING' && <Badge className="text-xs bg-green-700 text-white">Running</Badge>}
                {(c.operationMode ?? 'ALL') === 'LOCKOUT' && <Badge className="text-xs bg-orange-600 text-white">LOTO</Badge>}
                {(c.operationMode ?? 'ALL') === 'ALL' && <Badge variant="outline" className="text-xs">All Tasks</Badge>}
                <Badge variant="outline" className="text-xs text-green-700 border-green-300">{assetCountFor(c)} assets</Badge>
                <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">{taskCountFor(c)} tasks</Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Created {format(new Date(c.createdAt), 'MMM d, yyyy')}
              </div>

              <Button className="w-full gap-2" onClick={() => handleGenerate(c)} disabled={generating === c.id}>
                <Printer className="h-4 w-4" />
                {generating === c.id ? 'Generating...' : 'Generate & Print'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editConfig ? 'Edit Checklist' : 'New Checklist Template'}
        onSubmit={() => document.getElementById('checklist-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))}
        isLoading={false}
      >
        {modalOpen && (
          <ChecklistForm
            key={formKey}
            allPMs={allPMs}
            allTasks={allTasks}
            locations={locations}
            defaultValues={formDefaults}
            onSave={handleSave}
          />
        )}
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={false}
      />
    </div>
  )
}
