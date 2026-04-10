import { useState } from 'react'
import { useAssets } from '@/hooks/useAssets'
import { useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useForm, Controller } from 'react-hook-form'
import { Printer, Pencil, Trash2, Plus, FileText } from 'lucide-react'
import { loadConfigs, saveConfigs, openPrintChecklist } from '@/utils/printChecklist'
import type { ChecklistConfig, OperationMode } from '@/utils/printChecklist'
import { format } from 'date-fns'

export function ChecklistsPage() {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<ChecklistConfig[]>(loadConfigs)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editConfig, setEditConfig] = useState<ChecklistConfig | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const { data: assetsData } = useAssets('', 1, 9999)
  const { data: allTasks = [] } = useMaintenanceTasks()
  const allAssets = assetsData?.data ?? []

  // Unique locations and asset types from assets
  const locations  = [...new Set(
    allAssets.map(a => typeof a.location === 'string' ? a.location : (a.location as { name?: string })?.name ?? '').filter(Boolean)
  )].sort() as string[]

  const assetTypes = [...new Set(allAssets.map(a => a.model).filter(Boolean))].sort() as string[]

  const { register, handleSubmit, control, reset, watch } = useForm<Omit<ChecklistConfig, 'id' | 'createdAt'>>()
  const watchedType = watch('assetType')
  const watchedMode = watch('operationMode') as OperationMode | undefined

  const filteredTaskCount = allTasks.filter(t => {
    if (t.asset_type !== watchedType) return false
    if (!watchedMode || watchedMode === 'ALL') return true
    const s = (t.safety ?? '').toUpperCase()
    if (watchedMode === 'RUNNING') return s.includes('RUNNING')
    if (watchedMode === 'LOCKOUT') return s.includes('LOCKOUT') || s.includes('LOTO')
    return true
  }).length

  const persist = (updated: ChecklistConfig[]) => { setConfigs(updated); saveConfigs(updated) }

  const openCreate = () => {
    setEditConfig(null)
    reset({ name: '', location: '', assetType: '', operationMode: 'ALL', description: '' })
    setModalOpen(true)
  }

  const openEdit = (c: ChecklistConfig) => {
    setEditConfig(c)
    reset({ name: c.name, location: c.location, assetType: c.assetType, operationMode: c.operationMode ?? 'ALL', description: c.description })
    setModalOpen(true)
  }

  const onSubmit = handleSubmit((data) => {
    if (editConfig) {
      persist(configs.map(c => c.id === editConfig.id ? { ...c, ...data } : c))
      toast({ title: 'Checklist updated' })
    } else {
      const newConfig: ChecklistConfig = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() }
      persist([...configs, newConfig])
      toast({ title: 'Checklist created' })
    }
    setModalOpen(false)
  })

  const handleDelete = () => {
    if (!deleteId) return
    persist(configs.filter(c => c.id !== deleteId))
    setDeleteId(null)
    toast({ title: 'Deleted' })
  }

  const handleGenerate = async (config: ChecklistConfig) => {
    setGenerating(config.id)
    try {
      await openPrintChecklist(config, allAssets, allTasks)
    } catch {
      toast({ title: 'Error generating checklist', variant: 'destructive' })
    } finally {
      setGenerating(null)
    }
  }

  const assetCountFor = (c: ChecklistConfig) =>
    allAssets.filter(a => {
      const loc = typeof a.location === 'string' ? a.location : (a.location as { name?: string })?.name ?? ''
      return loc.trim().toLowerCase() === c.location.trim().toLowerCase() && a.model === c.assetType
    }).length

  const taskCountFor = (c: ChecklistConfig) => allTasks.filter(t => {
    if (t.asset_type !== c.assetType) return false
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
          <p className="text-muted-foreground">Printable preventive maintenance checklists — tasks come from Maintenance Tasks sheet</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Checklist</Button>
      </div>

      {configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">No checklists yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create your first checklist template to get started</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Checklist</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map(c => (
            <div key={c.id} className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">{c.location}</Badge>
                <Badge variant="secondary" className="text-xs">{c.assetType}</Badge>
                {(c.operationMode ?? 'ALL') === 'RUNNING' && <Badge className="text-xs bg-green-700 text-white">Running</Badge>}
                {(c.operationMode ?? 'ALL') === 'LOCKOUT' && <Badge className="text-xs bg-orange-600 text-white">LOTO</Badge>}
                {(c.operationMode ?? 'ALL') === 'ALL' && <Badge variant="outline" className="text-xs">All Tasks</Badge>}
                <Badge variant="outline" className="text-xs text-green-700 border-green-300">{assetCountFor(c)} assets</Badge>
                <Badge variant="outline" className="text-xs text-blue-700 border-blue-300">{taskCountFor(c)} tasks</Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Created {format(new Date(c.createdAt), 'MMM d, yyyy')}
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => handleGenerate(c)}
                disabled={generating === c.id}
              >
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
        onSubmit={onSubmit}
        isLoading={false}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Checklist Name *</Label>
            <Input {...register('name', { required: true })} placeholder="e.g. MCC 1 — Motor PM" />
          </div>

          <div className="space-y-2">
            <Label>Operation Mode *</Label>
            <Controller control={control} name="operationMode" rules={{ required: true }} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? 'ALL'}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RUNNING">Machine Running — tasks done while energized</SelectItem>
                  <SelectItem value="LOCKOUT">Lockout / Tagout — tasks requiring de-energization</SelectItem>
                  <SelectItem value="ALL">All Tasks — include every task regardless of safety mode</SelectItem>
                </SelectContent>
              </Select>
            )} />
            {watchedMode && watchedMode !== 'ALL' && (
              <p className="text-xs text-muted-foreground">
                {watchedMode === 'RUNNING'
                  ? 'Only tasks tagged RUNNING safety will appear on this checklist.'
                  : 'Only tasks tagged LOCKOUT / LOTO safety will appear on this checklist.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location *</Label>
              <Controller control={control} name="location" rules={{ required: true }} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Controller control={control} name="assetType" rules={{ required: true }} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          {watchedType && (
            <p className="text-sm text-muted-foreground bg-muted rounded p-2">
              <strong>{filteredTaskCount}</strong> task{filteredTaskCount !== 1 ? 's' : ''} found for <strong>{watchedType}</strong>
              {watchedMode && watchedMode !== 'ALL' ? ` (${watchedMode === 'RUNNING' ? 'Running' : 'LOTO'} mode)` : ''} — these will become the checklist columns.
            </p>
          )}

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input {...register('description')} placeholder="e.g. Debarker Area — Monthly inspection" />
          </div>
        </div>
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
