import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  useWorkRequest, useUpdateWorkRequest,
  useWorkRequestItems, useCreateWorkRequestItem,
  useUpdateWorkRequestItem, useDeleteWorkRequestItem,
} from '@/hooks/useWorkRequests'
import { useCreateWorkOrder } from '@/hooks/useWorkOrders'
import { useAuthStore } from '@/store/authStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  ArrowLeft, Plus, Trash2, ExternalLink,
  ChevronRight, CheckCircle2, Circle, Package, Wrench, ImageOff,
} from 'lucide-react'
import { format } from 'date-fns'
import type { WrStatus, WrItemType, WrItemStatus, WorkRequestItem } from '@/types'
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

function isItemDone(item: WorkRequestItem) {
  return item.itemType === 'part' ? item.status === 'received' : item.status === 'confirmed'
}

const BLANK_ITEM = { item_type: 'part' as WrItemType, description: '', quantity: '', unit: '', supplier: '', notes: '' }

export function WorkRequestDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { toast }   = useToast()
  const user        = useAuthStore(s => s.user)
  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor'

  const { data: wr, isLoading }  = useWorkRequest(id ?? '')
  const { data: items = [] }     = useWorkRequestItems(id ?? '')
  const updateWR      = useUpdateWorkRequest()
  const createItem    = useCreateWorkRequestItem(id ?? '')
  const updateItem    = useUpdateWorkRequestItem(id ?? '')
  const deleteItem    = useDeleteWorkRequestItem(id ?? '')
  const createWO      = useCreateWorkOrder()

  const [addingItem,    setAddingItem]    = useState(false)
  const [newItem,       setNewItem]       = useState(BLANK_ITEM)
  const [notesText,     setNotesText]     = useState<string | null>(null)
  const [savingNotes,   setSavingNotes]   = useState(false)
  const [converting,    setConverting]    = useState(false)

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading…</div>
  if (!wr)       return <div className="text-center py-16 text-muted-foreground">Work request not found</div>

  const stageIdx     = STAGES.indexOf(wr.status)
  const nextStage    = NEXT_STAGE[wr.status]
  const doneItems    = items.filter(isItemDone).length
  const allItemsDone = items.length > 0 && doneItems === items.length
  const canConvert   = wr.status === 'ready' && isSupervisor

  const advanceStage = async () => {
    if (!nextStage) return
    try {
      await updateWR.mutateAsync({ id: wr.id, updates: { status: nextStage.toUpperCase() } })
      toast({ title: `Advanced to ${STAGE_LABELS[nextStage]}` })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' })
    }
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
      const assetNumId = parseInt(wr.assetId.replace('AST-', '') || '0', 10)
      const result = await createWO.mutateAsync({
        title:         `CM - ${wr.assetName} | ${wr.id}`,
        description:   wr.description,
        assetId:       assetNumId,
        priority:      wr.priority,
        status:        'open' as never,
        taskIds:       [],
      })
      await updateWR.mutateAsync({ id: wr.id, updates: { status: 'CONVERTED', converted_to_wo: result.wo_id } })
      toast({ title: 'Work order created', description: result.wo_id })
      navigate(`/work-orders/${parseInt(result.wo_id.replace('WO-', '') || '0', 10)}`)
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create WO', variant: 'destructive' })
      setConverting(false)
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
            {wr.convertedToWo && (
              <Button
                variant="link" size="sm" className="h-6 p-0 text-xs gap-1"
                onClick={() => navigate(`/work-orders/${parseInt(wr.convertedToWo.replace('WO-', '') || '0', 10)}`)}
              >
                <ExternalLink className="h-3 w-3" />{wr.convertedToWo}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{wr.assetName || '—'}</span>
            <span>·</span>
            <span>{wr.assetId}</span>
            {wr.requestDate && <><span>·</span><span>Reported {format(new Date(wr.requestDate), 'MMM d, yyyy')}</span></>}
            <span>·</span>
            <span>By {wr.requestedBy}</span>
          </div>
        </div>
      </div>

      {/* Stage stepper */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start">
            {STAGES.map((stage, i) => {
              const done    = i < stageIdx
              const current = i === stageIdx
              return (
                <div key={stage} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    {done
                      ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      : <Circle className={cn('h-5 w-5 shrink-0', current ? 'text-primary' : 'text-muted-foreground/30')} />}
                    <span className={cn(
                      'text-xs font-medium text-center leading-tight',
                      current ? 'text-primary' : done ? 'text-green-600' : 'text-muted-foreground/50'
                    )}>
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

          {/* Action bar — supervisors only */}
          {isSupervisor && wr.status !== 'converted' && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
              {allItemsDone && wr.status === 'procuring' && (
                <p className="text-sm text-green-600 font-medium flex-1">
                  All items ready — advance to Ready to unlock Work Order creation.
                </p>
              )}
              {!allItemsDone && wr.status === 'procuring' && items.length > 0 && (
                <p className="text-sm text-muted-foreground flex-1">
                  {doneItems} of {items.length} items received/confirmed
                </p>
              )}
              <div className="flex gap-2 ml-auto">
                {nextStage && (
                  <Button variant="outline" size="sm" onClick={advanceStage} disabled={updateWR.isPending} className="gap-1">
                    Advance to {STAGE_LABELS[nextStage]} <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canConvert && (
                  <Button size="sm" onClick={convertToWO} disabled={converting} className="gap-1">
                    <Wrench className="h-3.5 w-3.5" />
                    {converting ? 'Creating WO…' : 'Create Work Order'}
                  </Button>
                )}
              </div>
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
        <TabsContent value="problem">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{wr.description}</p>
              </div>

              {wr.imageUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Photos ({wr.imageUrls.length})
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {wr.imageUrls.map((url, i) => {
                      const match = url.match(/[?&]id=([^&]+)/)
                      const thumbUrl = match
                        ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`
                        : url
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={thumbUrl}
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

              {/* Inline add form */}
              {addingItem && (
                <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Type *</Label>
                      <Select value={newItem.item_type} onValueChange={v => setNewItem(p => ({ ...p, item_type: v as WrItemType }))}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="part">
                            <span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-blue-500" />Part / Material</span>
                          </SelectItem>
                          <SelectItem value="service">
                            <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5 text-orange-500" />Contractor Service</span>
                          </SelectItem>
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
                      <Input className="h-8 text-sm" placeholder="e.g. Grainger, ABC Welding & Fabrication" value={newItem.supplier} onChange={e => setNewItem(p => ({ ...p, supplier: e.target.value }))} />
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

              {/* Items list */}
              {items.length === 0 && !addingItem ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {isSupervisor
                    ? 'No items yet. Add the parts and services needed to complete this job.'
                    : 'No materials or services have been added yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map(item => {
                    const done          = isItemDone(item)
                    const statusOptions = item.itemType === 'part' ? PART_STATUSES : SERVICE_STATUSES
                    return (
                      <div
                        key={item.itemId}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                          done && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {item.itemType === 'part'
                            ? <Package className={cn('h-4 w-4', done ? 'text-green-600' : 'text-blue-500')} />
                            : <Wrench   className={cn('h-4 w-4', done ? 'text-green-600' : 'text-orange-500')} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', done && 'text-green-700 dark:text-green-400')}>
                            {item.description}
                          </p>
                          <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
                            {item.quantity && <span>Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
                            {item.supplier && <span>Supplier: {item.supplier}</span>}
                            {item.notes    && <span>{item.notes}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSupervisor && wr.status !== 'converted' ? (
                            <Select
                              value={item.status}
                              onValueChange={v => updateItem.mutate({ itemId: item.itemId, updates: { status: v } })}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(s => (
                                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', ITEM_STATUS_COLORS[item.status] ?? '')}>
                              {item.status}
                            </span>
                          )}
                          {isSupervisor && wr.status !== 'converted' && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => deleteItem.mutate(item.itemId)}
                            >
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
                placeholder={isSupervisor
                  ? 'Add planning notes, scope of work, safety requirements, technician instructions...'
                  : 'No planning notes added yet.'}
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
    </div>
  )
}
