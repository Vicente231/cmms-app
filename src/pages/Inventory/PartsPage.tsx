import { useState, useMemo } from 'react'
import { useParts, useCreatePart, useUpdatePart, useDeletePart, useReceiveStock, useAdjustStock, type PartFormData } from '@/hooks/useParts'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import type { Part } from '@/types'
import { Pencil, Trash2, AlertTriangle, Plus, SlidersHorizontal, Search, Box, ArrowDownToLine } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { cn } from '@/lib/utils'

type StockStatus = 'out' | 'low' | 'ok'

function getStatus(qty: number, min: number): StockStatus {
  if (qty <= 0) return 'out'
  if (qty < min) return 'low'
  return 'ok'
}

function StockBar({ current, min, max }: { current: number; min: number; max: number }) {
  const maxVal = Math.max(max || min * 3 || current * 2 || 10, current, 1)
  const pct    = Math.min((current / maxVal) * 100, 100)
  const minPct = Math.min((min / maxVal) * 100, 100)
  const status = getStatus(current, min)

  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 relative h-2 rounded-full bg-muted overflow-visible">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            status === 'out' ? 'bg-red-500' :
            status === 'low' ? 'bg-orange-400' : 'bg-green-500'
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
        {/* min marker */}
        {min > 0 && (
          <div
            className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-red-400 rounded"
            style={{ left: `${minPct}%` }}
            title={`Min: ${min}`}
          />
        )}
      </div>
      <span className={cn(
        'text-sm font-bold tabular-nums whitespace-nowrap',
        status === 'out' ? 'text-red-600' :
        status === 'low' ? 'text-orange-600' : 'text-foreground'
      )}>
        {current}
      </span>
    </div>
  )
}

const STATUS_STYLES = {
  out: 'bg-red-100 text-red-700 border-red-200',
  low: 'bg-orange-100 text-orange-700 border-orange-200',
  ok:  'bg-green-100 text-green-700 border-green-200',
}
const STATUS_LABELS = { out: 'Out of Stock', low: 'Low Stock', ok: 'In Stock' }

export function PartsPage() {
  const { toast } = useToast()
  const [search,      setSearch]      = useState('')
  const [lowOnly,     setLowOnly]     = useState(false)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [adjustOpen,  setAdjustOpen]  = useState(false)
  const [deleteId,    setDeleteId]    = useState<number | null>(null)
  const [editPart,    setEditPart]    = useState<Part | null>(null)
  const [targetPart,  setTargetPart]  = useState<Part | null>(null)

  const { data: partsPage, isLoading } = useParts({ search, lowStock: lowOnly, limit: 9999 })
  const allParts = partsPage?.data ?? []

  const create       = useCreatePart()
  const update       = useUpdatePart()
  const remove       = useDeletePart()
  const receiveStock = useReceiveStock()
  const adjustStock  = useAdjustStock()

  // Part form
  const { register: reg, handleSubmit: hs, reset } = useForm<PartFormData>()
  // Receive form
  const { register: regR, handleSubmit: hsR, reset: rstR } = useForm<{ qty: number; unit_cost: number; reference: string; notes: string }>()
  // Adjust form
  const { register: regA, handleSubmit: hsA, reset: rstA } = useForm<{ newQty: number; notes: string }>()

  const stats = useMemo(() => {
    return {
      total: allParts.length,
      low:   allParts.filter(p => getStatus(p.quantityOnHand, p.minimumQuantity) === 'low').length,
      out:   allParts.filter(p => getStatus(p.quantityOnHand, p.minimumQuantity) === 'out').length,
    }
  }, [allParts])

  const openCreate = () => { setEditPart(null); reset({}); setModalOpen(true) }
  const openEdit   = (p: Part) => {
    setEditPart(p)
    reset({
      part_number: p.partNumber,
      name:        p.name,
      description: p.description,
      category:    p.category?.name,
      unit:        p.unitOfMeasure,
      unit_cost:   p.unitCost,
      qty_on_hand: p.quantityOnHand,
      min_qty:     p.minimumQuantity,
      max_qty:     p.reorderQuantity,
      location:    p.storageLocation,
      supplier:    p.preferredVendor?.name,
    })
    setModalOpen(true)
  }
  const openReceive = (p: Part) => { setTargetPart(p); rstR({ qty: 1, unit_cost: p.unitCost, reference: '', notes: '' }); setReceiveOpen(true) }
  const openAdjust  = (p: Part) => { setTargetPart(p); rstA({ newQty: p.quantityOnHand, notes: '' }); setAdjustOpen(true) }

  const onPartSubmit = hs(async (data) => {
    try {
      if (editPart) {
        await update.mutateAsync({ id: editPart.id, ...data })
        toast({ title: 'Part updated' })
      } else {
        await create.mutateAsync(data)
        toast({ title: 'Part created' })
      }
      setModalOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const onReceive = hsR(async (data) => {
    if (!targetPart) return
    try {
      await receiveStock.mutateAsync({ partId: targetPart.id, qty: Number(data.qty), unitCost: Number(data.unit_cost), reference: data.reference, notes: data.notes })
      toast({ title: `+${data.qty} ${targetPart.unitOfMeasure} received` })
      setReceiveOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const onAdjust = hsA(async (data) => {
    if (!targetPart) return
    try {
      await adjustStock.mutateAsync({ partId: targetPart.id, newQty: Number(data.newQty), notes: data.notes })
      toast({ title: `Stock adjusted to ${data.newQty} ${targetPart.unitOfMeasure}` })
      setAdjustOpen(false)
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  })

  const handleDelete = async () => {
    if (!deleteId) return
    try { await remove.mutateAsync(deleteId); toast({ title: 'Part deleted' }); setDeleteId(null) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parts & Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage spare parts and stock levels</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Part
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Parts',   value: stats.total, icon: Box,           color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Low Stock',     value: stats.low,   icon: AlertTriangle,  color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Out of Stock',  value: stats.out,   icon: AlertTriangle,  color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(k => (
          <Card
            key={k.label}
            className={cn('cursor-pointer hover:shadow-md transition-shadow', k.label !== 'Total Parts' && k.value > 0 ? 'ring-1 ring-orange-200' : '')}
            onClick={() => { if (k.label !== 'Total Parts') setLowOnly(true) }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <div className={cn('rounded-lg p-1.5', k.bg)}>
                  <k.icon className={cn('h-3.5 w-3.5', k.color)} />
                </div>
              </div>
              <p className={cn('text-3xl font-bold', k.label !== 'Total Parts' && k.value > 0 ? k.color : '')}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search parts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={lowOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLowOnly(v => !v)}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock Only
          {(stats.low + stats.out) > 0 && (
            <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0 font-bold">
              {stats.low + stats.out}
            </span>
          )}
        </Button>
        {(search || lowOnly) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setLowOnly(false) }}>
            Clear
          </Button>
        )}
      </div>

      {/* Parts table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">Loading parts...</div>
      ) : allParts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Box className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              {search || lowOnly ? 'No parts match the current filters' : 'No parts in catalog yet. Add your first part.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {['Part #', 'Name', 'Category', 'Location', 'Stock', 'Min / Max', 'Unit Cost', 'Supplier', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {allParts.map(p => {
                  const status = getStatus(p.quantityOnHand, p.minimumQuantity)
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.partNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.category?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.storageLocation || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StockBar current={p.quantityOnHand} min={p.minimumQuantity} max={p.reorderQuantity} />
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium self-start', STATUS_STYLES[status])}>
                            {STATUS_LABELS[status]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {p.minimumQuantity} / {p.reorderQuantity || '—'} {p.unitOfMeasure}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">${Number(p.unitCost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.preferredVendor?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Receive stock" onClick={() => openReceive(p)}>
                            <ArrowDownToLine className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Adjust stock" onClick={() => openAdjust(p)}>
                            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit part" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete part" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {allParts.length} part{allParts.length !== 1 ? 's' : ''} {lowOnly || search ? 'matching filters' : 'in catalog'}
          </div>
        </Card>
      )}

      {/* Create/Edit Part Modal */}
      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editPart ? 'Edit Part' : 'Add Part'}
        onSubmit={onPartSubmit}
        isLoading={create.isPending || update.isPending}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Name *</Label>
            <Input {...reg('name', { required: true })} placeholder="e.g. 30A Fuse, 10W-30 Oil" />
          </div>
          <div className="space-y-2">
            <Label>Part Number</Label>
            <Input {...reg('part_number')} placeholder="SKU or manufacturer P/N" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input {...reg('category')} placeholder="e.g. Electrical, Bearings" />
          </div>
          <div className="space-y-2">
            <Label>Unit of Measure</Label>
            <Input {...reg('unit')} placeholder="each, kg, m, L..." defaultValue="each" />
          </div>
          <div className="space-y-2">
            <Label>Unit Cost ($)</Label>
            <Input type="number" step="0.01" min="0" {...reg('unit_cost')} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Current Stock</Label>
            <Input type="number" step="0.001" min="0" {...reg('qty_on_hand')} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Minimum Stock <span className="text-xs text-muted-foreground">(reorder point)</span></Label>
            <Input type="number" step="0.001" min="0" {...reg('min_qty')} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Maximum Stock</Label>
            <Input type="number" step="0.001" min="0" {...reg('max_qty')} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Storage Location</Label>
            <Input {...reg('location')} placeholder="Shelf A3, Bin 12, Storeroom 2" />
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Input {...reg('supplier')} placeholder="Vendor or supplier name" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description / Notes</Label>
            <Input {...reg('description')} placeholder="Additional details, specs, cross-references..." />
          </div>
        </div>
      </CRUDModal>

      {/* Receive Stock Modal */}
      <CRUDModal
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        title={`Receive Stock — ${targetPart?.name}`}
        onSubmit={onReceive}
        isLoading={receiveStock.isPending}
        size="sm"
        submitLabel="Receive"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
            Current stock: <span className="font-bold">{targetPart?.quantityOnHand} {targetPart?.unitOfMeasure}</span>
          </div>
          <div className="space-y-2">
            <Label>Quantity to Receive *</Label>
            <Input type="number" step="0.001" min="0.001" {...regR('qty', { required: true, min: 0.001 })} />
          </div>
          <div className="space-y-2">
            <Label>Unit Cost ($) <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Input type="number" step="0.01" min="0" {...regR('unit_cost')} />
          </div>
          <div className="space-y-2">
            <Label>Reference / PO # <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Input {...regR('reference')} placeholder="PO-001, Invoice #123..." />
          </div>
          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Input {...regR('notes')} placeholder="Delivery notes, condition..." />
          </div>
        </div>
      </CRUDModal>

      {/* Adjust Stock Modal */}
      <CRUDModal
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title={`Adjust Stock — ${targetPart?.name}`}
        onSubmit={onAdjust}
        isLoading={adjustStock.isPending}
        size="sm"
        submitLabel="Adjust"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
            Current stock: <span className="font-bold">{targetPart?.quantityOnHand} {targetPart?.unitOfMeasure}</span>
          </div>
          <div className="space-y-2">
            <Label>New Stock Quantity *</Label>
            <Input type="number" step="0.001" min="0" {...regA('newQty', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Reason for Adjustment *</Label>
            <Input {...regA('notes', { required: true })} placeholder="Physical count, damage write-off..." />
          </div>
        </div>
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={remove.isPending}
        description="This will permanently remove this part from the catalog."
      />
    </div>
  )
}
