import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useWorkOrder, useWorkOrderTasks, useUpdateWorkOrderTask, useUpdateWorkOrder, useInitializeWOTasks } from '@/hooks/useWorkOrders'
import { useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { useAsset } from '@/hooks/useAssets'
import { useWOTransactions } from '@/hooks/useInventoryTransactions'
import { useParts, useIssueStock } from '@/hooks/useParts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, CheckSquare, Square, Clock, Package, MapPin, Tag, Wrench, FolderKanban, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  'MOhm': { 'Ohm': 1e6,   'GOhm': 1e-3 },
  'GOhm': { 'Ohm': 1e9,   'MOhm': 1e3  },
  'Ohm':  { 'MOhm': 1e-6, 'GOhm': 1e-9 },
}

function convertUnit(value: string, from: string, to: string): string {
  if (!value || from === to) return value
  const factor = UNIT_CONVERSIONS[from]?.[to]
  if (factor === undefined) return value
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return String(parseFloat((num * factor).toPrecision(10)))
}

function evalPassCondition(value: string, condition: string): boolean | null {
  if (!condition || !value) return null
  const num = parseFloat(String(value))
  if (isNaN(num)) return null
  const m = String(condition).match(/^([><=!]+)\s*([\d.]+)$/)
  if (!m) return null
  const thresh = parseFloat(m[2])
  switch (m[1]) {
    case '>':  return num > thresh
    case '>=': return num >= thresh
    case '<':  return num < thresh
    case '<=': return num <= thresh
    case '=':
    case '==': return num === thresh
    case '!=': return num !== thresh
    default:   return null
  }
}

const WO_STATUSES = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: wo, isLoading } = useWorkOrder(+id!)
  const { data: woTasks = [] } = useWorkOrderTasks(+id!)
  const { data: allMTasks = [] } = useMaintenanceTasks()
  const { data: asset } = useAsset(wo?.assetId ?? 0)
  const updateTask     = useUpdateWorkOrderTask(+id!)
  const initTasksMut   = useInitializeWOTasks(+id!)
  const updateWO       = useUpdateWorkOrder()
  const [measureValues,   setMeasureValues]   = useState<Record<string, string>>({})
  const [measureUnits,    setMeasureUnits]     = useState<Record<string, string>>({})
  const [noteValues,      setNoteValues]       = useState<Record<string, string>>({})
  const [timeValues,      setTimeValues]       = useState<Record<string, string>>({})
  const [savingStatus,    setSavingStatus]     = useState(false)
  const [woNotes,         setWoNotes]         = useState<string | null>(null)
  const [partsModalOpen,  setPartsModalOpen]  = useState(false)
  const [issuePartId,     setIssuePartId]     = useState('')
  const [issueQty,        setIssueQty]        = useState('1')
  const [issueNotes,      setIssueNotes]      = useState('')

  const { data: woTxs = [] }   = useWOTransactions(wo?.woNumber ?? '')
  const { data: partsPage }    = useParts({ limit: 9999 })
  const issueStock             = useIssueStock()
  const allParts               = partsPage?.data ?? []

  // Primary lookup by task_id, fallback by description (handles template_task_id mismatches)
  const mtByDesc = Object.fromEntries(
    allMTasks.map(t => [t.description?.toLowerCase().trim(), t])
  )
  const mtById = Object.fromEntries(allMTasks.map(t => [t.task_id, t]))

  const getMT = (task: typeof woTasks[0]) => {
    const byId   = mtById[task.templateTaskId]
    // If found by ID and description matches, trust it; otherwise fall back to description match
    if (byId && byId.description?.toLowerCase().trim() === task.description?.toLowerCase().trim()) {
      return byId
    }
    return mtByDesc[task.description?.toLowerCase().trim()] ?? byId ?? null
  }

  const toMtFields = (t: ReturnType<typeof getMT>) => t ? {
    measurementUnit:   t.measurement_unit ?? '',
    passCondition:     t.pass_condition   ?? '',
    measurementFields: t.measurement_fields
      ? t.measurement_fields.split(',').map((s: string) => s.trim()).filter(Boolean)
      : null,
  } : { measurementUnit: '', passCondition: '', measurementFields: null }

  // Keep backward-compat alias used in render
  const mtMap = Object.fromEntries(
    allMTasks.map(t => [t.task_id, toMtFields(t)])
  )

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await updateTask.mutateAsync({ taskId, updates: { is_completed: isCompleted } })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const saveMeasurement = async (taskId: string, value: string) => {
    try {
      await updateTask.mutateAsync({ taskId, updates: { measurement_value: value } })
    } catch {
      toast({ title: 'Error saving measurement', variant: 'destructive' })
    }
  }

  const initializeTasks = async () => {
    if (!wo?.checklistTaskIds?.length) return
    try {
      const result = await initTasksMut.mutateAsync(wo.checklistTaskIds)
      toast({ title: `${result.created} task records created` })
    } catch (err) {
      toast({ title: 'Error creating tasks', description: err instanceof Error ? err.message : String(err), variant: 'destructive' })
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!wo) return
    setSavingStatus(true)
    try {
      await updateWO.mutateAsync({ id: wo.id, status: status as never })
      toast({ title: 'Status updated' })
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' })
    } finally {
      setSavingStatus(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!wo) return <div className="text-center">Work order not found</div>

  const assetName     = asset?.name     ?? wo.asset?.name ?? wo.asset?.assetTag ?? '—'
  const assetTag      = asset?.assetTag ?? wo.asset?.assetTag ?? '—'
  const locationName  = asset?.location?.name ?? '—'
  const assetType     = asset?.model ?? '—'
  const completedTasks = woTasks.filter(t => t.isCompleted).length

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{wo.woNumber}</h1>
            <StatusBadge type="wo"       value={wo.status} />
            <StatusBadge type="priority" value={wo.priority} />
            {wo.status !== 'completed' && wo.status !== 'cancelled' && (
              <Select value={wo.status} onValueChange={handleStatusChange} disabled={savingStatus}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WO_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{wo.title}</p>
          {/* Discipline + project */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {wo.discipline && (
              <Badge variant="outline" className="text-xs font-normal">{wo.discipline}</Badge>
            )}
            {wo.projectId && (
              <button
                onClick={() => navigate(`/projects/${wo.projectId}`)}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <FolderKanban className="h-3 w-3" />
                {wo.projectId}
              </button>
            )}
          </div>
          {/* Asset quick-view strip */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <span className="flex items-center gap-1 text-foreground font-medium">
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              {assetName}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />{assetTag}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />{locationName}
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {woTasks.length > 0
              ? ` (${completedTasks}/${woTasks.length})`
              : ' (0)'}
          </TabsTrigger>
          <TabsTrigger value="labor">Labor ({wo.labor?.length || 0})</TabsTrigger>
          <TabsTrigger value="parts">Parts ({wo.partsUsed?.length || 0})</TabsTrigger>
        </TabsList>

        {/* ── Details Tab ── */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Asset Info */}
            <Card>
              <CardHeader><CardTitle>Asset</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Name',     assetName],
                    ['Asset ID', assetTag],
                    ['Location', locationName],
                    ['Type',     assetType],
                    ['Status',   asset?.status ?? '—'],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd className="text-right max-w-[60%] truncate">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {/* WO Info */}
            <Card>
              <CardHeader><CardTitle>Work Order Info</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Status',     wo.status?.replace(/_/g, ' ')],
                    ['Priority',   wo.priority],
                    ['Discipline', wo.discipline || null],
                  ].map(([label, value]) => value ? (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd className="text-right capitalize">{value}</dd>
                    </div>
                  ) : null)}
                  {wo.projectId && (
                    <div className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">Project</dt>
                      <dd>
                        <button
                          onClick={() => navigate(`/projects/${wo.projectId}`)}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <FolderKanban className="h-3.5 w-3.5" />
                          {wo.projectId}
                        </button>
                      </dd>
                    </div>
                  )}
                  {[
                    ['Est. Hours',   wo.estimatedHours ? `${wo.estimatedHours}h` : null],
                    ['Actual Hours', wo.actualHours    ? `${wo.actualHours}h`    : null],
                  ].map(([label, value]) => value ? (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd className="text-right">{value}</dd>
                    </div>
                  ) : null)}
                </dl>
              </CardContent>
            </Card>

            {/* Notes / Resolution */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Notes &amp; Resolution</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  rows={4}
                  placeholder="Document what was found, what was done, parts replaced, observations… (auto-saves on blur)"
                  value={woNotes ?? (wo.description || '')}
                  onChange={e => setWoNotes(e.target.value)}
                  onBlur={async e => {
                    const val = e.target.value
                    if (val !== (wo.description || '')) {
                      try {
                        await updateWO.mutateAsync({ id: wo.id, description: val as never })
                        toast({ title: 'Notes saved' })
                      } catch {
                        toast({ title: 'Error saving notes', variant: 'destructive' })
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Saves automatically when you click away.</p>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {[
                    ['Due Date',  wo.dueDate     ? format(new Date(wo.dueDate),     'MMM d, yyyy') : null],
                    ['Started',   wo.startedAt   ? format(new Date(wo.startedAt),   'MMM d, yyyy') : null],
                    ['Completed', wo.completedAt ? format(new Date(wo.completedAt), 'MMM d, yyyy') : null],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="font-medium text-muted-foreground text-xs mb-1">{label}</p>
                      <p>{value || '—'}</p>
                    </div>
                  ))}
                </div>
                {wo.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Problem Description</p>
                    <p className="text-sm whitespace-pre-wrap">{wo.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── Tasks Tab ── */}
        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-6">
              {woTasks.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">{completedTasks} of {woTasks.length} tasks completed</p>
                  <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${woTasks.length ? (completedTasks / woTasks.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
              {woTasks.length ? (
                <div className="space-y-2">
                  {woTasks.map((task) => {
                    const mt = toMtFields(getMT(task))

                    const savedJson: Record<string, string> = (() => {
                      try { return JSON.parse(task.measurementValue || '{}') } catch { return {} }
                    })()

                    const fields = mt.measurementFields
                    const rawUnit = mt.measurementUnit ?? ''
                    const unitOptions = rawUnit.includes('/') ? rawUnit.split('/') : null
                    const baseUnit    = unitOptions ? unitOptions[0] : rawUnit
                    const selectedUnit = unitOptions
                      ? (measureUnits[task.taskId] ?? baseUnit)
                      : rawUnit
                    const displayUnit = selectedUnit || rawUnit

                    const singleVal  = measureValues[task.taskId] ?? convertUnit(fields ? '' : (task.measurementValue || ''), baseUnit, selectedUnit)
                    const singleNorm = convertUnit(singleVal, selectedUnit, baseUnit)
                    const pass = (!fields && rawUnit)
                      ? evalPassCondition(singleNorm, mt.passCondition ?? '')
                      : null

                    const saveWithUnit = (displayVals: Record<string, string>) => {
                      const baseVals: Record<string, string> = {}
                      Object.entries(displayVals).forEach(([k, v]) => {
                        baseVals[k] = convertUnit(v, selectedUnit, baseUnit)
                      })
                      saveMeasurement(task.taskId, JSON.stringify(baseVals))
                    }

                    const noteVal = noteValues[task.taskId] ?? task.completionNotes ?? ''

                    return (
                      <div key={task.taskId} className={`rounded-lg border p-3 space-y-2 transition-colors ${task.isCompleted ? 'bg-green-50/40 dark:bg-green-950/20' : ''}`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleTask(task.taskId, !task.isCompleted)} className="mt-0.5 shrink-0">
                            {task.isCompleted
                              ? <CheckSquare className="h-5 w-5 text-green-600" />
                              : <Square className="h-5 w-5 text-muted-foreground" />}
                          </button>
                          <span className={`text-sm flex-1 ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {task.description}
                          </span>
                          {mt.passCondition && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              Required: {mt.passCondition} {baseUnit}
                            </span>
                          )}
                        </div>

                        {/* Notes + time spent */}
                        <div className="pl-8 flex gap-2 items-center">
                          <Input
                            className="h-8 text-sm flex-1"
                            placeholder="Notes / comments..."
                            value={noteVal}
                            onChange={(e) => setNoteValues(prev => ({ ...prev, [task.taskId]: e.target.value }))}
                            onBlur={(e) => {
                              if (e.target.value !== task.completionNotes) {
                                updateTask.mutateAsync({ taskId: task.taskId, updates: { completion_notes: e.target.value } })
                              }
                            }}
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              className="h-8 w-20 text-sm"
                              placeholder="0"
                              value={timeValues[task.taskId] ?? (task.timeSpentMinutes != null ? String(task.timeSpentMinutes) : '')}
                              onChange={(e) => setTimeValues(prev => ({ ...prev, [task.taskId]: e.target.value }))}
                              onBlur={(e) => {
                                const val = e.target.value
                                const prev = task.timeSpentMinutes != null ? String(task.timeSpentMinutes) : ''
                                if (val !== prev) {
                                  updateTask.mutateAsync({ taskId: task.taskId, updates: { time_spent_minutes: val ? Number(val) : '' } })
                                }
                              }}
                            />
                            <span className="text-xs text-muted-foreground">min</span>
                          </div>
                        </div>

                        {/* Unit toggle */}
                        {unitOptions && rawUnit && (
                          <div className="flex items-center gap-2 pl-8">
                            <span className="text-xs text-muted-foreground">Unit:</span>
                            {unitOptions.map(u => (
                              <button
                                key={u}
                                onClick={() => {
                                setMeasureUnits(prev => ({ ...prev, [task.taskId]: u }))
                                setMeasureValues(prev => {
                                  const next = { ...prev }
                                  delete next[task.taskId]
                                  if (fields) fields.forEach(f => delete next[`${task.taskId}__${f}`])
                                  return next
                                })
                              }}
                                className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                                  selectedUnit === u
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-muted-foreground text-muted-foreground hover:border-foreground'
                                }`}
                              >{u}</button>
                            ))}
                          </div>
                        )}

                        {/* Multi-field measurement */}
                        {fields && rawUnit && (
                          <div className="pl-8 space-y-2">
                            {fields.map(label => {
                              const key       = `${task.taskId}__${label}`
                              const fieldVal  = measureValues[key] ?? convertUnit(savedJson[label] ?? '', baseUnit, selectedUnit)
                              const fieldNorm = convertUnit(fieldVal, selectedUnit, baseUnit)
                              const fieldPass = evalPassCondition(fieldNorm, mt.passCondition ?? '')
                              return (
                                <div key={label} className="flex items-center gap-2">
                                  <span className="text-xs font-medium w-24 shrink-0 text-muted-foreground">{label}</span>
                                  <Input
                                    type="number" step="any" className="w-28 h-8 text-sm" placeholder="—"
                                    value={fieldVal}
                                    onChange={(e) => setMeasureValues(prev => ({ ...prev, [key]: e.target.value }))}
                                    onBlur={(e) => {
                                      const current: Record<string, string> = {}
                                      fields.forEach(fl => {
                                        const k = `${task.taskId}__${fl}`
                                        current[fl] = fl === label
                                          ? e.target.value
                                          : (measureValues[k] ?? convertUnit(savedJson[fl] ?? '', baseUnit, selectedUnit))
                                      })
                                      saveWithUnit(current)
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground">{displayUnit}</span>
                                  {fieldPass === true  && <Badge className="bg-green-600 text-white text-xs">PASS</Badge>}
                                  {fieldPass === false && <Badge variant="destructive" className="text-xs">FAIL</Badge>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Single-field measurement */}
                        {!fields && rawUnit && (
                          <div className="flex items-center gap-2 pl-8">
                            <Input
                              type="number" step="any" className="w-32 h-8 text-sm" placeholder="Enter value"
                              value={singleVal}
                              onChange={(e) => setMeasureValues(prev => ({ ...prev, [task.taskId]: e.target.value }))}
                              onBlur={() => {
                              const inBase = convertUnit(singleVal, selectedUnit, baseUnit)
                              if (inBase !== task.measurementValue) saveMeasurement(task.taskId, inBase)
                            }}
                            />
                            <span className="text-sm font-medium text-muted-foreground">{displayUnit}</span>
                            {pass === true  && <Badge className="bg-green-600 text-white">PASS</Badge>}
                            {pass === false && <Badge variant="destructive">FAIL</Badge>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  {wo.checklistTaskIds?.length ? (
                    <>
                      <p className="text-sm font-medium">This WO has {wo.checklistTaskIds.length} tasks in its PM checklist but no task records yet.</p>
                      <div className="text-left max-w-sm mx-auto rounded-lg border p-3 bg-muted/30 space-y-1">
                        {wo.checklistTaskIds.map(tid => (
                          <p key={tid} className="text-xs text-muted-foreground">
                            · {allMTasks.find(t => t.task_id === tid)?.description ?? tid}
                          </p>
                        ))}
                      </div>
                      <Button onClick={initializeTasks} disabled={initTasksMut.isPending} className="gap-2">
                        {initTasksMut.isPending ? 'Creating tasks…' : 'Initialize Task Records'}
                      </Button>
                      <p className="text-xs text-muted-foreground">This creates the task rows in the sheet so you can track completion and record measurements.</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">No tasks assigned to this work order.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Labor Tab ── */}
        <TabsContent value="labor">
          <Card>
            <CardContent className="pt-6">
              {wo.labor?.length ? (
                <div className="space-y-2">
                  {wo.labor.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.startTime), 'MMM d, HH:mm')}
                          {entry.endTime ? ` — ${format(new Date(entry.endTime), 'HH:mm')}` : ' (ongoing)'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium"><Clock className="h-3 w-3" />{entry.hours || 0}h</div>
                        {entry.cost && <p className="text-xs text-muted-foreground">${Number(entry.cost).toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No labor entries</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Parts Tab ── */}
        <TabsContent value="parts">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Parts Used</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setPartsModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Log Parts Used
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {woTxs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No parts logged for this work order yet.</p>
              ) : (
                <div className="space-y-2">
                  {woTxs.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{tx.partName}</p>
                          {tx.partNumber && <p className="text-xs text-muted-foreground font-mono">{tx.partNumber}</p>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">Qty: {tx.qty}</p>
                        {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Parts Used Modal */}
          {partsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-lg font-semibold">Log Parts Used</h2>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Part</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={issuePartId}
                    onChange={e => setIssuePartId(e.target.value)}
                  >
                    <option value="">Select a part...</option>
                    {allParts.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}{p.partNumber ? ` (${p.partNumber})` : ''} — Stock: {p.quantityOnHand} {p.unitOfMeasure}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity Used</label>
                  <Input type="number" step="0.001" min="0.001" value={issueQty} onChange={e => setIssueQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (optional)</label>
                  <Input placeholder="e.g. Replaced failed fuse on L1" value={issueNotes} onChange={e => setIssueNotes(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => setPartsModalOpen(false)}>Cancel</Button>
                  <Button
                    disabled={!issuePartId || !issueQty || issueStock.isPending}
                    onClick={async () => {
                      try {
                        await issueStock.mutateAsync({
                          partId: Number(issuePartId),
                          qty:    Number(issueQty),
                          woId:   wo?.woNumber,
                          notes:  issueNotes,
                        })
                        toast({ title: 'Parts logged and stock updated' })
                        setPartsModalOpen(false)
                        setIssuePartId(''); setIssueQty('1'); setIssueNotes('')
                      } catch {
                        toast({ title: 'Error logging parts', variant: 'destructive' })
                      }
                    }}
                  >
                    {issueStock.isPending ? 'Saving...' : 'Log Parts'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
