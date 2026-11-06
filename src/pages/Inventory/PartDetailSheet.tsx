import { useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SpecFieldsView } from '@/components/shared/SpecFields'
import { useToast } from '@/components/ui/use-toast'
import { useEquipmentTypes } from '@/hooks/useEquipmentTypes'
import { useInventoryTransactions } from '@/hooks/useInventoryTransactions'
import {
  DOC_TYPES, MAX_FILE_MB, getDocumentUrl, previewKind,
  usePartDocuments, useUploadPartDocument, useAddPartLink, useDeletePartDocument,
  type PartDocument,
} from '@/hooks/usePartDocuments'
import type { Part } from '@/types'
import { Box, Pencil, FileText, Link2, Image as ImageIcon, Download, Eye, ExternalLink, Trash2, Upload, Shapes } from 'lucide-react'
import { cn } from '@/lib/utils'

function fmtSize(b: number) {
  if (!b) return ''
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(d: string) {
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString()
}

function docIcon(d: PartDocument) {
  if (d.kind === 'link') return Link2
  if (previewKind(d) === 'image') return ImageIcon
  if (d.docType === '3D Model' || d.docType === 'CAD') return Shapes
  return FileText
}

export function PartDetailSheet({ part, onClose, onEdit }: {
  part: Part | null
  onClose: () => void
  onEdit: (p: Part) => void
}) {
  const { types, fieldsFor } = useEquipmentTypes('part')
  const type = types.find(t => t.type_code === part?.partType)

  return (
    <Sheet open={!!part} onOpenChange={open => !open && onClose()}>
      <SheetContent aria-describedby={undefined}>
        {part && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3 pr-8">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Box className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-lg">{part.name}</SheetTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {[part.partNumber, type ? `${type.icon ?? ''} ${type.label}`.trim() : ''].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => { onClose(); onEdit(part) }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="specs">Specs</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="history">Stock History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview"><Overview part={part} typeLabel={type?.label} /></TabsContent>
                <TabsContent value="specs">
                  <SpecFieldsView fields={fieldsFor(part.partType || '')} values={part.attrs ?? {}} />
                </TabsContent>
                <TabsContent value="documents"><Documents partId={part.partId || ''} /></TabsContent>
                <TabsContent value="history"><History partId={part.partId || ''} unit={part.unitOfMeasure} /></TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ part, typeLabel }: { part: Part; typeLabel?: string }) {
  const rows: [string, string][] = [
    ['Part Number',      part.partNumber || '—'],
    ['Type',             typeLabel || '—'],
    ['Category',         part.category?.name || '—'],
    ['Description',      part.description || '—'],
    ['Stock on Hand',    `${part.quantityOnHand} ${part.unitOfMeasure}`],
    ['Min / Max',        `${part.minimumQuantity} / ${part.reorderQuantity || '—'} ${part.unitOfMeasure}`],
    ['Unit Cost',        `$${Number(part.unitCost).toFixed(2)}`],
    ['Storage Location', part.storageLocation || '—'],
    ['Supplier',         part.preferredVendor?.name || '—'],
  ]
  return (
    <div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-1.5 border-b border-border/50 text-sm">
          <span className="text-muted-foreground shrink-0">{k}</span>
          <span className="font-medium text-right">{v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Stock history ─────────────────────────────────────────────────────────────
function History({ partId, unit }: { partId: string; unit: string }) {
  const { data: txs, isLoading } = useInventoryTransactions(partId)
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!txs.length) return <p className="text-sm text-muted-foreground">No stock movements yet.</p>
  return (
    <table className="w-full text-sm">
      <thead className="border-b text-xs text-muted-foreground">
        <tr>
          <th className="text-left py-2">Date</th><th className="text-left">Type</th>
          <th className="text-right">Qty</th><th className="text-right">Balance</th><th className="text-left pl-4">Reference / Notes</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {txs.map(t => (
          <tr key={t.id}>
            <td className="py-1.5 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
            <td className="text-xs">{t.txType}</td>
            <td className={cn('text-right tabular-nums', t.txType === 'ISSUED' ? 'text-red-600' : 'text-green-700')}>
              {t.txType === 'ISSUED' ? '-' : t.qty > 0 ? '+' : ''}{t.qty}
            </td>
            <td className="text-right tabular-nums">{t.balanceAfter} {unit}</td>
            <td className="pl-4 text-xs text-muted-foreground">{[t.woId, t.reference, t.notes].filter(Boolean).join(' · ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Documents ─────────────────────────────────────────────────────────────────
function Documents({ partId }: { partId: string }) {
  const { toast } = useToast()
  const { data: docs = [], isLoading } = usePartDocuments(partId)
  const upload  = useUploadPartDocument(partId)
  const addLink = useAddPartLink(partId)
  const remove  = useDeletePartDocument(partId)

  const [mode,     setMode]     = useState<'file' | 'link'>('file')
  const [files,    setFiles]    = useState<File[]>([])
  const [url,      setUrl]      = useState('')
  const [title,    setTitle]    = useState('')
  const [docType,  setDocType]  = useState<string>('Manual')
  const [revision, setRevision] = useState('')
  const [preview,  setPreview]  = useState<{ doc: PartDocument; src: string } | null>(null)
  const [toDelete, setToDelete] = useState<PartDocument | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setFiles([]); setUrl(''); setTitle(''); setRevision('')
    if (fileInput.current) fileInput.current.value = ''
  }

  const onAdd = async () => {
    try {
      if (mode === 'file') {
        if (!files.length) return
        // A typed title only applies when a single file is uploaded
        for (const file of files) {
          await upload.mutateAsync({ file, docType, revision, title: files.length === 1 ? title : '' })
        }
        toast({ title: files.length === 1 ? 'File uploaded' : `${files.length} files uploaded` })
      } else {
        if (!url.trim()) return
        await addLink.mutateAsync({ url: url.trim(), title, docType, revision })
        toast({ title: 'Link added' })
      }
      resetForm()
    } catch (e) {
      toast({ title: 'Could not add document', description: (e as { message?: string })?.message, variant: 'destructive' })
    }
  }

  const open = async (d: PartDocument, download = false) => {
    try {
      const src = await getDocumentUrl(d, download)
      if (!download && previewKind(d) !== 'none') setPreview({ doc: d, src })
      else window.open(src, '_blank', 'noopener')
    } catch (e) {
      toast({ title: 'Could not open file', description: (e as { message?: string })?.message, variant: 'destructive' })
    }
  }

  const busy = upload.isPending || addLink.isPending

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={mode === 'file' ? 'default' : 'outline'} onClick={() => setMode('file')} className="gap-1">
            <Upload className="h-3.5 w-3.5" /> Upload file
          </Button>
          <Button type="button" size="sm" variant={mode === 'link' ? 'default' : 'outline'} onClick={() => setMode('link')} className="gap-1">
            <Link2 className="h-3.5 w-3.5" /> Add link
          </Button>
        </div>

        {mode === 'file' ? (
          <div className="space-y-1">
            <Input ref={fileInput} type="file" multiple onChange={e => setFiles(Array.from(e.target.files ?? []))} />
            <p className="text-xs text-muted-foreground">
              PDF, SVG, images, STEP, STL, DWG, DXF… up to {MAX_FILE_MB} MB each. Larger CAD files: use a link.
            </p>
          </div>
        ) : (
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… (Google Drive, OneDrive, vendor page)" />
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input className="h-9" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={mode === 'file' && files.length > 1 ? 'Uses file names' : 'Optional'}
              disabled={mode === 'file' && files.length > 1} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Revision</Label>
            <Input className="h-9" value={revision} onChange={e => setRevision(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={onAdd}
            disabled={busy || (mode === 'file' ? !files.length : !url.trim())}>
            {busy ? 'Saving…' : mode === 'file' ? 'Upload' : 'Add link'}
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !docs.length ? (
        <p className="text-sm text-muted-foreground">No documents yet. Upload manuals, datasheets, drawings or 3D/CAD files above.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {docs.map(d => {
            const Icon = docIcon(d)
            const canPreview = previewKind(d) !== 'none'
            return (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button type="button" className="text-sm font-medium hover:underline text-left truncate" onClick={() => open(d)}>
                      {d.title}
                    </button>
                    <span className="text-[10px] rounded border px-1.5 py-0.5 text-muted-foreground">{d.docType}</span>
                    {d.revision && <span className="text-[10px] text-muted-foreground">Rev {d.revision}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[d.kind === 'link' ? d.url : d.fileName, fmtSize(d.fileSize), d.uploadedBy, fmtDate(d.createdAt)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {canPreview && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview" onClick={() => open(d)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {d.kind === 'link' ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Open link" onClick={() => open(d)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => open(d, true)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete" onClick={() => setToDelete(d)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="pr-6 truncate">{preview?.doc.title}</DialogTitle>
          </DialogHeader>
          {preview && (previewKind(preview.doc) === 'pdf' ? (
            <iframe src={preview.src} title={preview.doc.title} className="flex-1 w-full rounded border" />
          ) : (
            <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 rounded border">
              <img src={preview.src} alt={preview.doc.title} className="max-w-full max-h-full object-contain" />
            </div>
          ))}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={async () => {
          try { await remove.mutateAsync(toDelete!); toast({ title: 'Document deleted' }); setToDelete(null) }
          catch (e) { toast({ title: 'Error', description: (e as { message?: string })?.message, variant: 'destructive' }) }
        }}
        isLoading={remove.isPending}
        description={toDelete?.kind === 'link' ? 'This will remove the link.' : 'This will permanently delete the file.'}
      />
    </div>
  )
}
