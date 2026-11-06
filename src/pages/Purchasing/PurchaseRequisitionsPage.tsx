import { useState, useRef, useEffect, useCallback } from 'react'
import {
  usePurchaseRequisitions, useCreatePR, useUpdatePR, useUpdatePRStatus, useDeletePR, printSavedPR,
  PR_STATUSES, type SavedPR,
} from '@/hooks/usePurchaseRequisitions'
import { useParts } from '@/hooks/useParts'
import type { Part } from '@/types'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import { Trash2, Plus, X, Printer, Pencil } from 'lucide-react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { format } from 'date-fns'
import { COST_CODES, type CostCode } from '@/data/costCodes'
import { openPrintPurchaseRequisition, type PRPrintData, type PRLineItem } from '@/utils/printPurchaseRequisition'

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100  text-green-800',
  rejected: 'bg-red-100    text-red-800',
  ordered:  'bg-blue-100   text-blue-800',
}

type PRFormData = {
  prNumber: string; date: string; requestedBy: string; department: string
  requiredBy: string; vendorName: string; vendorContact: string; costCode: string
  taxRate: number; justification: string; lineItems: PRLineItem[]
}

// ── Cost-code combobox ────────────────────────────────────────────────────────
function CostCodeCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState<CostCode | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = search.trim().length < 2
    ? COST_CODES.slice(0, 40)
    : COST_CODES.filter(c =>
        c.code.includes(search) ||
        c.unitOperation.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.department.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 40)

  const displayValue = selected
    ? `${selected.code} — ${selected.unitOperation} · ${selected.description}`
    : value || ''

  const handleSelect = (c: CostCode) => { setSelected(c); setSearch(''); setOpen(false); onChange(c.code) }
  const handleClear  = () => { setSelected(null); setSearch(''); onChange('') }

  return (
    <div ref={ref} className="relative">
      <div className="relative flex items-center">
        <Input
          value={open ? search : displayValue}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by code, unit operation, or description…"
          className="pr-8 font-mono text-xs"
        />
        {(selected || value) && (
          <button type="button" className="absolute right-2 text-muted-foreground hover:text-foreground" onClick={handleClear}>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0
            ? <div className="p-3 text-xs text-muted-foreground">No results</div>
            : filtered.map(c => (
                <div key={c.code} onMouseDown={e => { e.preventDefault(); handleSelect(c) }}
                  className="cursor-pointer px-3 py-2 hover:bg-muted border-b border-border/40 last:border-0">
                  <div className="font-mono text-xs font-bold">{c.code}</div>
                  <div className="text-xs text-muted-foreground">{c.department} · {c.unitOperation} — {c.description}</div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}

// ── Part picker cell (description column) ────────────────────────────────────
function PartPickerCell({
  value, onChange, onSelect, parts,
}: {
  value: string; onChange: (v: string) => void
  onSelect: (p: Part) => void; parts: Part[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Every typed word must appear somewhere in the part's fields, in any order
  const words = value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const filtered = !words.length
    ? parts.slice(0, 50)
    : parts.filter(p => {
        const text = [p.name, p.partNumber, p.description, p.category?.name, p.preferredVendor?.name]
          .filter(Boolean).join(' ').toLowerCase()
        return words.every(w => text.includes(w))
      }).slice(0, 50)

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search parts or type description…"
        className="h-7 text-xs"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 mt-0.5 w-[28rem] max-w-[80vw] rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {filtered.map(p => (
            <div
              key={p.id}
              onMouseDown={e => { e.preventDefault(); onSelect(p); setOpen(false) }}
              className="cursor-pointer px-3 py-2 hover:bg-muted border-b border-border/40 last:border-0"
            >
              <div className="text-xs font-semibold leading-tight">{p.name}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {p.partNumber || '—'} · {p.unitOfMeasure} · ${Number(p.unitCost).toFixed(2)}
                {p.category?.name ? ` · ${p.category.name}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PR form modal ─────────────────────────────────────────────────────────────
function PRModal({ open, onOpenChange, editData }: {
  open: boolean; onOpenChange: (v: boolean) => void; editData?: SavedPR | null
}) {
  const { toast } = useToast()
  const createPR  = useCreatePR()
  const updatePR  = useUpdatePR()
  const isEdit    = !!editData
  const { data: partsData } = useParts({ limit: 9999 })
  const allParts = partsData?.data ?? []

  const makeDefault = (): PRFormData => editData ? {
    prNumber:    editData.pr_id,
    date:        editData.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    requestedBy: editData.requested_by,
    department:  editData.department,
    requiredBy:  editData.required_by?.slice(0, 10) || '',
    vendorName:  editData.vendor_name,
    vendorContact: editData.vendor_contact,
    costCode:    editData.cost_code,
    taxRate:     editData.tax_rate,
    justification: editData.justification,
    lineItems: editData.purchase_requisition_items.length > 0
      ? editData.purchase_requisition_items.map(it => ({
          description: it.description, partNumber: it.part_number,
          qty: it.qty, unit: it.unit, unitCost: it.unit_cost,
        }))
      : [{ description: '', partNumber: '', qty: 1, unit: 'each', unitCost: 0 }],
  } : {
    prNumber:    `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-3)}`,
    date:        new Date().toISOString().slice(0, 10),
    requestedBy: '', department: '', requiredBy: '',
    vendorName: '', vendorContact: '', costCode: '',
    taxRate: 5, justification: '',
    lineItems: [{ description: '', partNumber: '', qty: 1, unit: 'each', unitCost: 0 }],
  }

  const { register, handleSubmit, control, watch, reset, setValue } = useForm<PRFormData>({ defaultValues: makeDefault() })
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  useEffect(() => { if (open) reset(makeDefault()) }, [open, editData])

  const watchedItems = watch('lineItems')
  const watchedTax   = watch('taxRate')
  const watchedCode  = watch('costCode')
  const selectedMeta = COST_CODES.find(c => c.code === watchedCode)

  const subtotal = (watchedItems || []).reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitCost) || 0), 0)
  const taxAmt   = subtotal * (Number(watchedTax) || 0) / 100
  const total    = subtotal + taxAmt

  const handleClose = (v: boolean) => { if (!v) reset(makeDefault()); onOpenChange(v) }

  const onSubmit = handleSubmit(async data => {
    const printData: PRPrintData = { ...data, costCodeMeta: selectedMeta }
    try {
      if (isEdit) {
        await updatePR.mutateAsync(printData)
        toast({ title: `PR ${data.prNumber} updated` })
        handleClose(false)
      } else {
        await createPR.mutateAsync(printData)
        openPrintPurchaseRequisition(printData)
        toast({ title: `PR ${data.prNumber} saved` })
        handleClose(false)
      }
    } catch (err: any) {
      toast({ title: isEdit ? 'Error updating PR' : 'Error saving PR', description: err?.message, variant: 'destructive' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Purchase Requisition' : 'New Purchase Requisition'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">PR Number *</Label><Input {...register('prNumber')} className="font-mono text-sm" disabled={isEdit} /></div>
            <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" {...register('date')} /></div>
            <div className="space-y-1"><Label className="text-xs">Required By</Label><Input type="date" {...register('requiredBy')} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Requested By</Label><Input {...register('requestedBy')} placeholder="Your name" /></div>
            <div className="space-y-1"><Label className="text-xs">Department</Label><Input {...register('department')} placeholder="e.g. Maintenance, Electrical" /></div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Cost Code *</Label>
            <Controller control={control} name="costCode" render={({ field }) => (
              <CostCodeCombobox value={field.value || ''} onChange={field.onChange} />
            )} />
            {selectedMeta && (
              <p className="text-xs text-muted-foreground mt-1">{selectedMeta.department} · {selectedMeta.unitOperation} — {selectedMeta.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Supplier / Vendor Name</Label><Input {...register('vendorName')} placeholder="Supplier name" /></div>
            <div className="space-y-1"><Label className="text-xs">Vendor Contact / Phone</Label><Input {...register('vendorContact')} placeholder="Contact info" /></div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Items Requested</Label>
            <div className="border rounded-md">
              <div className="grid gap-1 bg-muted rounded-t-md px-2 py-1.5 text-xs font-semibold text-muted-foreground" style={{ gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1.5fr auto' }}>
                <span>Description</span><span>Part / Cat. #</span><span>Qty</span><span>Unit</span><span>Unit Cost ($)</span><span />
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="grid gap-1 px-2 py-1.5 border-t items-center" style={{ gridTemplateColumns: '3fr 1.5fr 1fr 1fr 1.5fr auto' }}>
                  <Controller control={control} name={`lineItems.${i}.description`} render={({ field: f }) => (
                    <PartPickerCell
                      value={f.value}
                      onChange={f.onChange}
                      onSelect={p => {
                        f.onChange(p.name)
                        setValue(`lineItems.${i}.partNumber`, p.partNumber || '')
                        setValue(`lineItems.${i}.unit`, p.unitOfMeasure)
                        setValue(`lineItems.${i}.unitCost`, p.unitCost)
                      }}
                      parts={allParts}
                    />
                  )} />
                  <Input {...register(`lineItems.${i}.partNumber`)} placeholder="Part #" className="h-7 text-xs font-mono" />
                  <Input type="number" min={0} {...register(`lineItems.${i}.qty`, { valueAsNumber: true })} className="h-7 text-xs" />
                  <Input {...register(`lineItems.${i}.unit`)} placeholder="each" className="h-7 text-xs" />
                  <Input type="number" step="0.01" min={0} {...register(`lineItems.${i}.unitCost`, { valueAsNumber: true })} className="h-7 text-xs" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => remove(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="px-2 py-1.5 border-t">
                <Button type="button" variant="ghost" size="sm" className="text-xs h-7 gap-1"
                  onClick={() => append({ description: '', partNumber: '', qty: 1, unit: 'each', unitCost: 0 })}>
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 w-28">
              <Label className="text-xs">GST / Tax Rate (%)</Label>
              <Input type="number" step="0.1" min={0} {...register('taxRate', { valueAsNumber: true })} className="text-xs" />
            </div>
            <div className="text-right text-sm space-y-0.5 mt-1">
              <div className="text-muted-foreground">Subtotal: <span className="font-mono font-semibold text-foreground">${subtotal.toFixed(2)}</span></div>
              <div className="text-muted-foreground">Tax ({Number(watchedTax) || 0}%): <span className="font-mono font-semibold text-foreground">${taxAmt.toFixed(2)}</span></div>
              <div className="text-base font-bold">Total: <span className="font-mono">${total.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Business Justification / Reason for Purchase</Label>
            <Textarea {...register('justification')} placeholder="Describe why this purchase is needed…" rows={3} className="text-xs" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            <Button type="submit" disabled={createPR.isPending || updatePR.isPending} className="gap-2">
              <Printer className="h-4 w-4" />
              {createPR.isPending || updatePR.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save & Print PR'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function PurchaseRequisitionsPage() {
  const { toast }  = useToast()
  const [search, setSearch]       = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editPR, setEditPR]         = useState<SavedPR | null>(null)
  const [deletePrId, setDeletePrId] = useState<string | null>(null)

  const openEdit = (pr: SavedPR) => { setEditPR(pr); setModalOpen(true) }
  const openNew  = ()            => { setEditPR(null); setModalOpen(true) }

  const { data: prs = [], isLoading } = usePurchaseRequisitions()
  const updateStatus = useUpdatePRStatus()
  const removePR     = useDeletePR()

  const handleDelete = async () => {
    if (!deletePrId) return
    try { await removePR.mutateAsync(deletePrId); toast({ title: 'PR deleted' }); setDeletePrId(null) }
    catch { toast({ title: 'Cannot delete PR', variant: 'destructive' }) }
  }

  const filtered = prs.filter(pr => {
    const q = search.toLowerCase()
    return !q || pr.pr_id.toLowerCase().includes(q) || pr.requested_by.toLowerCase().includes(q)
      || pr.cost_code.toLowerCase().includes(q) || pr.vendor_name.toLowerCase().includes(q)
      || pr.department.toLowerCase().includes(q)
  })

  const columns: ColumnDef<SavedPR>[] = [
    { accessorKey: 'pr_id',        header: 'PR #',         cell: ({ row }) => <span className="font-mono text-sm font-medium">{row.original.pr_id}</span> },
    { accessorKey: 'date',         header: 'Date',          cell: ({ row }) => row.original.date ? format(new Date(row.original.date), 'MMM d, yyyy') : '—' },
    { accessorKey: 'requested_by', header: 'Requested By',  cell: ({ row }) => row.original.requested_by || '—' },
    { accessorKey: 'cost_code',    header: 'Cost Code',     cell: ({ row }) => <span className="font-mono text-xs">{row.original.cost_code || '—'}</span> },
    { accessorKey: 'vendor_name',  header: 'Vendor',        cell: ({ row }) => row.original.vendor_name || '—' },
    { accessorKey: 'total',        header: 'Total',         cell: ({ row }) => <span className="font-mono">${Number(row.original.total).toFixed(2)}</span> },
    {
      accessorKey: 'status', header: 'Status', cell: ({ row }) => (
        <Select value={row.original.status} onValueChange={status => updateStatus.mutate({ prId: row.original.pr_id, status })}>
          <SelectTrigger className="h-7 text-xs w-28">
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${STATUS_COLORS[row.original.status] ?? 'bg-muted text-muted-foreground'}`}>
              {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
            </span>
          </SelectTrigger>
          <SelectContent>
            {PR_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'actions', header: 'Actions', cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.status === 'pending' && (
            <Button variant="ghost" size="icon" title="Edit PR" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          )}
          <Button variant="ghost" size="icon" title="Print PR" onClick={() => printSavedPR(row.original)}><Printer className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletePrId(row.original.pr_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Purchase Requisitions</h1><p className="text-muted-foreground">Create and track purchase requisitions</p></div>
      <DataTable
        columns={columns} data={filtered} isLoading={isLoading}
        onAddNew={openNew} addNewLabel="New PR"
        searchValue={search} onSearchChange={setSearch}
        total={filtered.length}
      />
      <ConfirmDialog open={!!deletePrId} onOpenChange={o => !o && setDeletePrId(null)} onConfirm={handleDelete} isLoading={removePR.isPending} />
      <PRModal open={modalOpen} onOpenChange={v => { setModalOpen(v); if (!v) setEditPR(null) }} editData={editPR} />
    </div>
  )
}
