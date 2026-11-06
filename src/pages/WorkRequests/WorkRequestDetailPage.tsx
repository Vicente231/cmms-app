import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  useWorkRequest, useUpdateWorkRequest,
  useWorkRequestItems, useCreateWorkRequestItem,
  useUpdateWorkRequestItem, useDeleteWorkRequestItem,
} from '@/hooks/useWorkRequests'
import { useCreateWorkOrder } from '@/hooks/useWorkOrders'
import { useAuthStore } from '@/store/authStore'
import { openPrintWorkRequest } from '@/utils/printWorkRequest'
import { DISCIPLINES } from '@/hooks/useProjects'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  ArrowLeft, Plus, Trash2, ExternalLink,
  CheckCircle2, Circle, Package, Wrench, ImageOff, Printer, AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import type { WrStatus, WrItemType, WrItemStatus, WorkRequestItem, WoPriority } from '@/types'
import { cn } from '@/lib/utils'

const STAGES: WrStatus[] = ['reported', 'planning', 'procuring', 'ready', 'converted']

const STAGE_LABELS: Record<WrStatus, string> = {
  reported:  'Reported',
  planning:  'Planning',
  procuring: 'Procuring',
  ready:     'Ready',
  converted: 'Converted',
}

const NEXT_STAGE: Partial<Record<WrStatus, WrStatus>> = {
  reported:  'planning',
  planning:  'procuring',
  procuring: 'ready',
}

const PART_STATUSES    = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Ordered' }, { value: 'received', label: 'Received' }]
const SERVICE_STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'requested', label: 'Requested' }, { value: 'confirmed', label: 'Confirmed' }]

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  ordered:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  requested: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  received:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  corrective: 'Corrective Maintenance', emergency: 'Emergency / Breakdown',
  safety: 'Safety Concern', improvement: 'Improvement Request', other: 'Other',
}

const FAILURE_LABELS: Record<string, string> = {
  mechanical: 'Mechanical', electrical: 'Electrical',
  hydraulic: 'Hydraulic / Pneumatic', structural: 'Structural',
  instrumentation: 'Instrumentation', other: 'Other',
}

const IMPACT_LABELS: Record<string, string> = {
  none: 'No Impact', minor: 'Minor Impact', major: 'Major Impact',
  full_stoppage: 'Full Production Stoppage',
}

function isItemDone(item: WorkRequestItem) {
  return item.itemType === 'part' ? item.status === 'received' : item.status === 'confirmed'
}

const BLANK_ITEM = { item_type: 'part' as WrItemType, description: '', quantity: '', unit: '', supplier: '', notes: '' }

export function WorkRequestDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const user      = useAuthStore(s => s.user)
  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor'

  const { data: wr, isLoading } = useWorkRequest(id ?? '')
  const { data: items = [] }    = useWorkRequestItems(id ?? '')
  const updateWR   = useUpdateWorkRequest()
  const createItem = useCreateWorkRequestItem(id ?? '')
  const updateItem = useUpdateWorkRequestItem(id ?? '')
  const deleteItem = useDeleteWorkRequestItem(id ?? '')
  const createWO   = useCreateWorkOrder()

  const [addingItem,  setAddingItem]  = useState(false)
  const [newItem,     setNewItem]     = useState(BLANK_ITEM)
  const [notesText,   setNotesText]   = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [converting,  setConverting]  = useState(false)
  const [printing,    setPrinting]    = useState(false)
  const [woModalOpen, setWoModalOpen] = useState(false)
  const [woForm, setWoForm] = useState({
    title: '', problemDescription: '', assignedTo: '',
    dueDate: '', estimatedHours: '', discipline: '', priority: '', woType: 'CM' as 'CM' | 'PM',
  })

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading…</div>
  if (!wr)       return <div className="text-center py-16 text-muted-foreground">Work request not found</div>

  const stageIdx     = STAGES.indexOf(wr.status)
  const doneItems    = items.filter(isItemDone).length
  const allItemsDone = items.length > 0 && doneItems === items.length

  const jumpToStage = async (stage: WrStatus) => {
    if (stage === wr.status || stage === 'converted') return
    try {
      await updateWR.mutateAsync({ id: wr.id, updates: { status: stage.toUpperCase() } })
      toast({ title: `Status → ${STAGE_LABELS[stage]}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  const openWoModal = () => {
    setWoForm({
      title:              `CM - ${wr.assetName} | ${wr.id}`,
      problemDescription: wr.description,
      assignedTo:         '',
      dueDate:            wr.preferredDate || '',
      estimatedHours:     '',
      discipline:         '',
      priority:           wr.priority,
      woType:             'CM',
    })
    setWoModalOpen(true)
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await updateWR.mutateAsync({ id: wr.id, updates: { notes: notesText ?? wr.notes } })
      toast({ title: 'Notes saved' })
    } catch {
      toast({ title: 'Error saving notes', variant: 'destructive' })
    } finally {
      setSavingNotes(false)
    }
  }

  const addItem = async () => {
    if (!newItem.description.trim()) return
    try {
      await createItem.mutateAsync(newItem)
      setNewItem(BLANK_ITEM)
      setAddingItem(false)
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' })
    }
  }

  const convertToWO = async () => {
    setConverting(true)
    try {
      const result = await createWO.mutateAsync({
        title:              woForm.title || `CM - ${wr.assetName} | ${wr.id}`,
        problemDescription: woForm.problemDescription || wr.description,
        assetTag:           wr.assetId,
        priority:           (woForm.priority || wr.priority) as WoPriority,
        assignedTo:         woForm.assignedTo,
        dueDate:            woForm.dueDate,
        estimatedHours:     woForm.estimatedHours ? parseFloat(woForm.estimatedHours) : undefined,
        discipline:         woForm.discipline || undefined,
        woType:             woForm.woType,
        taskIds:            [],
      })
      const woId = result.wo_id
      await updateWR.mutateAsync({ id: wr.id, updates: { status: 'CONVERTED', converted_to_wo: woId } })
      toast({ title: 'Work Order created', description: woId || 'Successfully created' })
      setWoModalOpen(false)
      if (woId) navigate(`/work-orders/${parseInt(woId.replace('WO-', '') || '0', 10)}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Failed to create WO'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setConverting(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      await openPrintWorkRequest(wr, items)
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{wr.id}</h1>
            <StatusBadge type="priority" value={wr.priority} />
            {wr.requestType && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded font-medium',
                wr.requestType === 'emergency' ? 'bg-red-100 text-red-700' :
                wr.requestType === 'safety'    ? 'bg-orange-100 text-orange-700' :
                wr.requestType === 'corrective' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
              )}>
                {REQUEST_TYPE_LABELS[wr.requestType] ?? wr.requestType}
              </span>
            )}
            {wr.machineDown && (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-700">Machine Down</span>
            )}
            {wr.convertedToWo && (
              <Button variant="link" size="sm" className="h-6 p-0 text-xs gap-1"
                onClick={() => navigate(`/work-orders/${parseInt(wr.convertedToWo.replace('WO-', '') || '0', 10)}`)}>
                <ExternalLink className="h-3 w-3" />{wr.convertedToWo}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{wr.assetName || '—'}</span>
            <span>·</span>
            <span>{wr.assetId}</span>
            {wr.assetLocation && <><span>·</span><span>{wr.assetLocation}</span></>}
            {wr.requestDate && <><span>·</span><span>Reported {format(new Date(wr.requestDate), 'MMM d, yyyy')}</span></>}
            <span>·</span>
            <span>By {wr.requestedBy}</span>
            {wr.department && <><span>·</span><span className="capitalize">{wr.department}</span></>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={printing} className="gap-1.5 shrink-0">
          <Printer className="h-4 w-4" />
          {printing ? 'Preparing…' : 'Print / PDF'}
        </Button>
      </div>

      {/* Stage stepper */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start">
            {STAGES.map((stage, i) => {
              const done      = i < stageIdx
              const current   = i === stageIdx
              const clickable = isSupervisor && stage !== 'converted' && stage !== wr.status && wr.status !== 'converted'
              return (
                <div key={stage} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <button
                      type="button"
                      disabled={!clickable || updateWR.isPending}
                      onClick={() => jumpToStage(stage)}
                      className={cn('shrink-0 rounded-full transition-transform', clickable && 'hover:scale-110 active:scale-95 cursor-pointer')}
                    >
                      {done
                        ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                        : <Circle className={cn('h-5 w-5', current ? 'text-primary' : 'text-muted-foreground/30')} />}
                    </button>
                    <span className={cn('text-xs font-medium text-center leading-tight', current ? 'text-primary' : done ? 'text-green-600' : 'text-muted-foreground/50')}>
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={cn('h-0.5 flex-1 mx-1.5 rounded mt-[-10px]', i < stageIdx ? 'bg-green-600' : 'bg-muted')} />
                  )}
                </div>
              )
            })}
          </div>

          {isSupervisor && wr.status !== 'converted' && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
              {items.length > 0 && (
                <p className={cn('text-sm flex-1', allItemsDone ? 'text-green-600 font-medium' : 'text-muted-foreground')}>
                  {allItemsDone ? 'All items ready' : `${doneItems} / ${items.length} items received`}
                </p>
              )}
              <Button size="sm" onClick={openWoModal} className="gap-1.5 ml-auto">
                <Wrench className="h-3.5 w-3.5" />
                Create Work Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="problem">
        <TabsList>
          <TabsTrigger value="problem">Problem</TabsTrigger>
          <TabsTrigger value="requirements">
            Requirements
            {items.length > 0 && (
              <span className={cn('ml-1.5 text-xs', allItemsDone ? 'text-green-600' : 'opacity-60')}>
                ({doneItems}/{items.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Problem Tab */}
        <TabsContent value="problem" className="space-y-4">

          {/* Classification card */}
          {(wr.requestType || wr.failureMode || wr.productionImpact || wr.safetyConcern || wr.preferredDate || wr.contactPhone) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Classification</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  {wr.requestType && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Request Type</p>
                      <p className="font-medium">{REQUEST_TYPE_LABELS[wr.requestType] ?? wr.requestType}</p>
                    </div>
                  )}
                  {wr.failureMode && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Failure Mode</p>
                      <p className="font-medium">{FAILURE_LABELS[wr.failureMode] ?? wr.failureMode}</p>
                    </div>
                  )}
                  {wr.productionImpact && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Production Impact</p>
                      <p className="font-medium">{IMPACT_LABELS[wr.productionImpact] ?? wr.productionImpact}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Machine Down</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', wr.machineDown ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                      {wr.machineDown ? 'YES — Out of Service' : 'NO — Still Running'}
                    </span>
                  </div>
                  {wr.preferredDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Preferred Completion</p>
                      <p className="font-medium">{format(new Date(wr.preferredDate), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {wr.contactPhone && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Contact / Radio</p>
                      <p className="font-medium">{wr.contactPhone}</p>
                    </div>
                  )}
                </div>

                {/* Safety concern banner */}
                {wr.safetyConcern && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">Safety Concern Reported</p>
                      {wr.safetyDetail && <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5">{wr.safetyDetail}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description + photos */}
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{wr.description}</p>
              </div>

              {wr.imageUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Photos ({wr.imageUrls.length})</p>
                  <div className="flex flex-wrap gap-3">
                    {wr.imageUrls.map((url, i) => {
                      const match = url.match(/[?&]id=([^&]+)/)
                      const thumbSrc = match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400` : url
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={thumbSrc}
                            alt={`Photo ${i + 1}`}
                            className="h-40 w-40 rounded-lg object-cover border hover:opacity-90 transition-opacity shadow-sm"
                            onError={(e) => {
                              const el = e.currentTarget
                              el.style.display = 'none'
                              el.parentElement!.innerHTML = `<div class="h-40 w-40 rounded-lg border flex items-center justify-center bg-muted text-muted-foreground text-xs">No preview</div>`
                            }}
                          />
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {wr.imageUrls.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageOff className="h-4 w-4" />
                  No photos attached
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Materials & Services</CardTitle>
              {isSupervisor && wr.status !== 'converted' && !addingItem && (
                <Button size="sm" variant="outline" onClick={() => setAddingItem(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">

              {addingItem && (
                <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type *</Label>
                      <Select value={newItem.item_type} onValueChange={v => setNewItem(p => ({ ...p, item_type: v as WrItemType }))}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="part"><span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-blue-500" />Part / Material</span></SelectItem>
                          <SelectItem value="service"><span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-orange-500" />Contractor Service</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description *</Label>
                      <Input className="h-8 text-sm" placeholder="e.g. Bearing 6205-2RS" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input className="h-8 text-sm" placeholder="e.g. 2" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit</Label>
                      <Input className="h-8 text-sm" placeholder="e.g. pcs, hrs, ft" value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Supplier / Contractor</Label>
                      <Input className="h-8 text-sm" placeholder="e.g. Grainger, ABC Welding" value={newItem.supplier} onChange={e => setNewItem(p => ({ ...p, supplier: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Input className="h-8 text-sm" placeholder="Part number, specs, special instructions..." value={newItem.notes} onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button size="sm" variant="ghost" onClick={() => { setAddingItem(false); setNewItem(BLANK_ITEM) }}>Cancel</Button>
                    <Button size="sm" onClick={addItem} disabled={!newItem.description.trim() || createItem.isPending}>
                      {createItem.isPending ? 'Adding…' : 'Add Item'}
                    </Button>
                  </div>
                </div>
              )}

              {items.length === 0 && !addingItem ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {isSupervisor ? 'No items yet. Add the parts and services needed to complete this job.' : 'No materials or services have been added yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => {
                    const done          = isItemDone(item)
                    const statusOptions = item.itemType === 'part' ? PART_STATUSES : SERVICE_STATUSES
                    return (
                      <div key={item.itemId} className={cn('flex items-start gap-3 rounded-lg border p-3 transition-colors', done && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900')}>
                        <div className="mt-0.5 shrink-0">
                          {item.itemType === 'part'
                            ? <Package className={cn('h-4 w-4', done ? 'text-green-600' : 'text-blue-500')} />
                            : <Wrench   className={cn('h-4 w-4', done ? 'text-green-600' : 'text-orange-500')} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', done && 'text-green-700 dark:text-green-400')}>{item.description}</p>
                          <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                            {item.quantity && <span>Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
                            {item.supplier && <span>Supplier: {item.supplier}</span>}
                            {item.notes    && <span>{item.notes}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSupervisor && wr.status !== 'converted' ? (
                            <Select value={item.status} onValueChange={v => updateItem.mutate({ itemId: item.itemId, updates: { status: v } })}>
                              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', ITEM_STATUS_COLORS[item.status] ?? '')}>{item.status}</span>
                          )}
                          {isSupervisor && wr.status !== 'converted' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteItem.mutate(item.itemId)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Planning Notes</p>
              <textarea
                rows={10}
                defaultValue={wr.notes}
                onChange={e => setNotesText(e.target.value)}
                readOnly={!isSupervisor || wr.status === 'converted'}
                placeholder={isSupervisor ? 'Add planning notes, scope of work, safety requirements, technician instructions...' : 'No planning notes added yet.'}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none read-only:opacity-60 read-only:cursor-default"
              />
              {isSupervisor && wr.status !== 'converted' && (
                <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Saving…' : 'Save Notes'}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create Work Order modal ── */}
      <Dialog open={woModalOpen} onOpenChange={setWoModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Work Order from {wr.id}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* WO Type */}
            <div className="flex rounded-md overflow-hidden border text-sm font-medium">
              {(['CM', 'PM'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setWoForm(f => ({ ...f, woType: t }))}
                  className={cn('flex-1 py-2 transition-colors',
                    woForm.woType === t ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>
                  {t === 'CM' ? 'Corrective (CM)' : 'Preventive (PM)'}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">WO Title</Label>
              <Input
                value={woForm.title}
                onChange={e => setWoForm(f => ({ ...f, title: e.target.value }))}
                placeholder={`CM - ${wr.assetName} | ${wr.id}`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Problem Description</Label>
              <textarea
                rows={3}
                value={woForm.problemDescription}
                onChange={e => setWoForm(f => ({ ...f, problemDescription: e.target.value }))}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={woForm.priority || wr.priority} onValueChange={v => setWoForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'critical'].map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discipline</Label>
                <Select value={woForm.discipline} onValueChange={v => setWoForm(f => ({ ...f, discipline: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {DISCIPLINES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned To</Label>
                <Input
                  value={woForm.assignedTo}
                  onChange={e => setWoForm(f => ({ ...f, assignedTo: e.target.value }))}
                  placeholder="Technician name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={woForm.dueDate}
                  onChange={e => setWoForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Estimated Hours</Label>
                <Input
                  type="number" step="0.5" min="0"
                  value={woForm.estimatedHours}
                  onChange={e => setWoForm(f => ({ ...f, estimatedHours: e.target.value }))}
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>

            {/* Asset read-only info */}
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground text-xs">Asset: </span>
              <span className="font-medium">{wr.assetName}</span>
              <span className="text-muted-foreground ml-2 font-mono text-xs">{wr.assetId}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWoModalOpen(false)}>Cancel</Button>
            <Button onClick={convertToWO} disabled={converting} className="gap-1.5">
              <Wrench className="h-4 w-4" />
              {converting ? 'Creating…' : 'Create Work Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
