import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsset } from '@/hooks/useAssets'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAssetDrawings, useUploadDrawing, useDeleteAssetDrawing } from '@/hooks/useAssetDrawings'
import { useAssetMeasurements, useCreateMeasurement, useDeleteMeasurement, useAssetThresholds, evaluateHealth, KNOWN_PARAMS } from '@/hooks/usePdM'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Package, ExternalLink, Plus, CheckCircle2, Clock, Printer, QrCode, Pencil, FileText, File, Upload, Trash2, Loader2, Activity, AlertTriangle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'
import type { WorkOrder, Asset } from '@/types'
import QRCode from 'react-qr-code'

const APP_BASE = 'https://vicente231.github.io/cmms-app'

interface AssetDetailSheetProps {
  assetId: number | null
  onClose: () => void
  onEdit: (asset: Asset) => void
  onViewChild: (id: number) => void
}

export function AssetDetailSheet({ assetId, onClose, onEdit, onViewChild }: AssetDetailSheetProps) {
  const navigate = useNavigate()
  const qrRef    = useRef<HTMLDivElement>(null)
  const { data: asset, isLoading } = useAsset(assetId ?? 0)
  const { data: woPage }           = useWorkOrders({ limit: 9999 })
  const { data: drawings = [] }    = useAssetDrawings(assetId ?? 0)
  const uploadDrawing              = useUploadDrawing(assetId ?? 0)
  const deleteDrawing              = useDeleteAssetDrawing(assetId ?? 0)

  // PdM readings
  const assetTag = asset?.assetTag ?? ''
  const { data: measurements = [], isLoading: measLoading } = useAssetMeasurements(assetTag)
  const { data: thresholds = [] }                            = useAssetThresholds()
  const createMeas  = useCreateMeasurement()
  const deleteMeas  = useDeleteMeasurement()
  const [readingForm, setReadingForm] = useState({ paramName: '', customParam: '', value: '', unit: '', notes: '' })

  const assetTypeCode = asset?.model ?? ''
  const typeThresholds = thresholds.filter(t => t.assetType === assetTypeCode)
  const knownParamNames = KNOWN_PARAMS.map(p => p.name)

  const handleLogReading = async () => {
    const param = readingForm.paramName === '__custom__' ? readingForm.customParam.trim() : readingForm.paramName
    if (!param || !readingForm.value || !readingForm.unit) return
    const known = KNOWN_PARAMS.find(p => p.name === param)
    await createMeas.mutateAsync({
      assetId:    assetTag,
      paramName:  param,
      value:      parseFloat(readingForm.value),
      unit:       readingForm.unit || known?.unit || '',
      notes:      readingForm.notes,
      recordedBy: '',
    })
    setReadingForm({ paramName: '', customParam: '', value: '', unit: '', notes: '' })
  }

  const [drawingName, setDrawingName] = useState('')
  const [revision,    setRevision]    = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    if (!drawingName) setDrawingName(file.name.replace(/\.[^.]+$/, ''))
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!pendingFile || !drawingName.trim()) return
    await uploadDrawing.mutateAsync({ file: pendingFile, drawingName: drawingName.trim(), revision: revision.trim() })
    setPendingFile(null)
    setDrawingName('')
    setRevision('')
  }

  const allWOs     = woPage?.data ?? []
  const assetWOs   = allWOs.filter(w => w.assetId === assetId)
  const openWOs    = assetWOs.filter(w => !['completed', 'cancelled'].includes(w.status))
  const historyWOs = assetWOs.filter(w =>  ['completed', 'cancelled'].includes(w.status))

  const handlePrintQR = () => {
    const el = qrRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`
      <html><head><title>QR - ${asset?.name}</title>
      <style>
        body { font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; }
        .qr-box { border:2px solid #000; border-radius:12px; padding:24px; display:flex; flex-direction:column; align-items:center; gap:12px; }
        h2 { margin:0; font-size:18px; font-weight:700; text-align:center; }
        p  { margin:0; font-size:13px; color:#555; font-family:monospace; }
      </style></head><body>
      <div class="qr-box">
        ${el.innerHTML}
        <h2>${asset?.name}</h2>
        <p>${asset?.assetTag ?? ''}</p>
      </div></body></html>
    `)
    win.document.close(); win.focus(); win.print(); win.close()
  }

  return (
    <>
    <Sheet open={assetId !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          {isLoading || !asset ? (
            <SheetTitle>{isLoading ? 'Loading…' : 'Asset not found'}</SheetTitle>
          ) : (
            <div className="flex items-center gap-3 pr-8">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-lg">{asset.name}</SheetTitle>
                  <StatusBadge type="asset" value={asset.status} />
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {[asset.assetTag, asset.location?.name].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => { onClose(); onEdit(asset) }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" className="gap-1" onClick={() => { onClose(); navigate(`/work-orders?asset=${asset.assetTag}`) }}>
                  <Plus className="h-3.5 w-3.5" /> New WO
                </Button>
              </div>
            </div>
          )}
        </SheetHeader>

        {/* Content */}
        {asset && (
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="details">
              <TabsList className="w-full flex-wrap h-auto gap-1">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="work-orders">
                  Work Orders
                  {openWOs.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 font-semibold">
                      {openWOs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history">History ({historyWOs.length})</TabsTrigger>
                <TabsTrigger value="meters">Meters ({asset.meters?.length || 0})</TabsTrigger>
                <TabsTrigger value="specs">Specs ({asset.customFields?.length || 0})</TabsTrigger>
                <TabsTrigger value="children">Sub-Assets ({asset.childAssets?.length || 0})</TabsTrigger>
                <TabsTrigger value="drawings">
                  <FileText className="h-3 w-3 mr-1 inline" />Drawings ({drawings.length})
                </TabsTrigger>
                <TabsTrigger value="readings">
                  <Activity className="h-3 w-3 mr-1 inline" />Readings ({measurements.length})
                </TabsTrigger>
                <TabsTrigger value="qr"><QrCode className="h-3 w-3 mr-1 inline" />QR</TabsTrigger>
              </TabsList>

              {/* Details */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Asset Information</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      {([
                        ['Asset Tag',    asset.assetTag],
                        ['Type',         asset.model],
                        ['Serial No.',   asset.serialNumber],
                        ['Manufacturer', asset.manufacturer],
                        ['Location',     asset.location?.name],
                        ['Parent Asset', asset.parentAsset?.name],
                        ['Feed From',    asset.feedFrom?.name],
                        ['Criticality',  asset.criticality],
                      ] as [string, string | undefined][]).map(([label, value]) => value ? (
                        <div key={label} className="flex justify-between gap-4">
                          <dt className="font-medium text-muted-foreground shrink-0">{label}</dt>
                          <dd className="text-right">{value}</dd>
                        </div>
                      ) : null)}
                    </dl>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Financial & Warranty</CardTitle></CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      {([
                        ['Install Date',    asset.purchaseDate   ? format(new Date(asset.purchaseDate),   'MMM d, yyyy') : null],
                        ['Warranty Expiry', asset.warrantyExpiry ? format(new Date(asset.warrantyExpiry), 'MMM d, yyyy') : null],
                      ] as [string, string | null][]).map(([label, value]) => value ? (
                        <div key={label} className="flex justify-between">
                          <dt className="font-medium text-muted-foreground">{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ) : null)}
                    </dl>
                    {asset.description && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{asset.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Open Work Orders */}
              <TabsContent value="work-orders" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Open Work Orders</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => { onClose(); navigate(`/work-orders?asset=${asset.assetTag}`) }}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> New WO
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {openWOs.length === 0
                      ? <p className="text-center text-muted-foreground py-8 text-sm">No open work orders</p>
                      : <WOTable wos={openWOs} onNavigate={id => { onClose(); navigate(`/work-orders/${id}`) }} />}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History */}
              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {historyWOs.length === 0
                      ? <p className="text-center text-muted-foreground py-8 text-sm">No history</p>
                      : <WOTable wos={historyWOs} onNavigate={id => { onClose(); navigate(`/work-orders/${id}`) }} />}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Meters */}
              <TabsContent value="meters" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {asset.meters?.length ? (
                      <div className="space-y-3">
                        {asset.meters.map(meter => (
                          <div key={meter.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium text-sm">{meter.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{meter.meterType}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{Number(meter.currentValue).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{meter.unit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-muted-foreground text-center py-8 text-sm">No meters configured</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Specs */}
              <TabsContent value="specs" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {asset.customFields?.length ? (
                      <dl className="space-y-3 text-sm">
                        {asset.customFields.map(field => (
                          <div key={field.id} className="flex justify-between border-b pb-2">
                            <dt className="font-medium text-muted-foreground">{field.fieldName}</dt>
                            <dd>{field.fieldValue || '-'}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : <p className="text-muted-foreground text-center py-8 text-sm">No specifications recorded</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sub-Assets */}
              <TabsContent value="children" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {asset.childAssets?.length ? (
                      <div className="space-y-2">
                        {asset.childAssets.map(child => (
                          <div key={child.id}
                            className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent"
                            onClick={() => onViewChild(child.id)}
                          >
                            <div>
                              <p className="font-medium text-sm">{child.name}</p>
                              <p className="text-xs text-muted-foreground">{child.assetTag}</p>
                            </div>
                            <StatusBadge type="asset" value={child.status} />
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-muted-foreground text-center py-8 text-sm">No sub-assets</p>}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Drawings */}
              <TabsContent value="drawings" className="mt-4 space-y-4">
                {/* Upload form */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Upload Drawing</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Drawing Name *</Label>
                        <Input
                          placeholder="e.g. P&ID Sheet 1"
                          value={drawingName}
                          onChange={e => setDrawingName(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Revision</Label>
                        <Input
                          placeholder="e.g. Rev B"
                          value={revision}
                          onChange={e => setRevision(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className={cn(
                        'flex flex-1 items-center gap-2 cursor-pointer rounded-md border border-dashed px-3 py-2 text-sm transition-colors',
                        pendingFile ? 'border-primary/60 bg-primary/5' : 'border-muted-foreground/30 hover:border-foreground/40'
                      )}>
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className={cn('truncate', pendingFile ? 'text-foreground' : 'text-muted-foreground')}>
                          {pendingFile ? pendingFile.name : 'Choose PDF or DWG file…'}
                        </span>
                        <input type="file" accept=".pdf,.dwg" className="sr-only" onChange={handleFileChange} />
                      </label>
                      <Button
                        size="sm"
                        disabled={!pendingFile || !drawingName.trim() || uploadDrawing.isPending}
                        onClick={handleUpload}
                        className="shrink-0"
                      >
                        {uploadDrawing.isPending
                          ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading…</>
                          : <><Upload className="h-3.5 w-3.5 mr-1.5" />Upload</>}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Max recommended size: 30 MB. Larger DWG files should be linked from Drive directly.</p>
                  </CardContent>
                </Card>

                {/* Drawings list */}
                <Card>
                  <CardContent className="pt-4">
                    {drawings.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">No drawings uploaded yet</p>
                    ) : (
                      <div className="divide-y">
                        {drawings.map(d => (
                          <div key={d.drawingId} className="flex items-center gap-3 py-2.5">
                            {d.fileType === 'pdf'
                              ? <FileText className="h-4 w-4 text-red-500 shrink-0" />
                              : <File     className="h-4 w-4 text-blue-500 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{d.drawingName}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.revision && <span className="mr-2">{d.revision}</span>}
                                <span className="uppercase font-mono">{d.fileType}</span>
                                {d.uploadedDate && <span className="ml-2">{format(new Date(d.uploadedDate), 'MMM d, yyyy')}</span>}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                                title="Open in Drive"
                                onClick={() => window.open(`https://drive.google.com/file/d/${d.driveFileId}/view#zoom=150`, '_blank')}
                              >
                                <ExternalLink className="h-3.5 w-3.5" /> Open
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Delete"
                                disabled={deleteDrawing.isPending}
                                onClick={() => deleteDrawing.mutate({ drawingId: d.drawingId, driveFileId: d.driveFileId })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Readings (PdM) */}
              <TabsContent value="readings" className="mt-4 space-y-4">
                {/* Log new reading */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Log New Reading</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Parameter *</Label>
                        <select
                          value={readingForm.paramName}
                          onChange={e => {
                            const val = e.target.value
                            const known = KNOWN_PARAMS.find(p => p.name === val)
                            setReadingForm(prev => ({ ...prev, paramName: val, unit: known ? known.unit : prev.unit }))
                          }}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select parameter...</option>
                          {knownParamNames.map(n => (
                            <option key={n} value={n}>{n.replace(/_/g, ' ')}</option>
                          ))}
                          {typeThresholds.filter(t => !knownParamNames.includes(t.paramName)).map(t => (
                            <option key={t.paramName} value={t.paramName}>{t.paramName.replace(/_/g, ' ')}</option>
                          ))}
                          <option value="__custom__">Other (type below)…</option>
                        </select>
                        {readingForm.paramName === '__custom__' && (
                          <Input
                            placeholder="Custom parameter name..."
                            value={readingForm.customParam}
                            onChange={e => setReadingForm(p => ({ ...p, customParam: e.target.value }))}
                            className="mt-1 h-8 text-sm"
                          />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Value *</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={readingForm.value}
                          onChange={e => setReadingForm(p => ({ ...p, value: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit *</Label>
                        <Input
                          placeholder="e.g. mm/s, °C, MΩ"
                          value={readingForm.unit}
                          onChange={e => setReadingForm(p => ({ ...p, unit: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Notes</Label>
                        <Input
                          placeholder="Optional notes..."
                          value={readingForm.notes}
                          onChange={e => setReadingForm(p => ({ ...p, notes: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={createMeas.isPending || !readingForm.paramName || !readingForm.value || !readingForm.unit}
                      onClick={handleLogReading}
                    >
                      {createMeas.isPending ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Plus className="h-3 w-3 mr-2" />}
                      Log Reading
                    </Button>
                  </CardContent>
                </Card>

                {/* Reading history */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Reading History</CardTitle></CardHeader>
                  <CardContent>
                    {measLoading ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : measurements.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No readings recorded yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {[...measurements].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).map(m => {
                          const thresh = thresholds.find(t => t.assetType === assetTypeCode && t.paramName === m.paramName)
                          const status = evaluateHealth(m.value, thresh)
                          const statusColor = status === 'critical' ? 'text-red-600' : status === 'warning' ? 'text-yellow-600' : status === 'ok' ? 'text-green-600' : 'text-muted-foreground'
                          return (
                            <div key={m.measurementId} className="flex items-center justify-between py-2 border-b last:border-0 gap-2 text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                {status === 'critical' && <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                                {status === 'warning'  && <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />}
                                {status === 'ok'       && <CheckCircle2  className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                                <span className="truncate text-muted-foreground">{m.paramName.replace(/_/g, ' ')}</span>
                              </div>
                              <span className={cn('font-semibold tabular-nums shrink-0', statusColor)}>
                                {m.value} {m.unit}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                                {m.recordedAt ? new Date(m.recordedAt).toLocaleString() : ''}
                              </span>
                              <button
                                className="text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => deleteMeas.mutate({ measurementId: m.measurementId, assetId: assetTag })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* QR */}
              <TabsContent value="qr" className="mt-4">
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center gap-6">
                    <div ref={qrRef} className="p-4 bg-white rounded-lg border">
                      <QRCode value={`${APP_BASE}/assets/${asset.id}`} size={180} level="M" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{asset.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{asset.assetTag}</p>
                      {asset.location?.name && <p className="text-sm text-muted-foreground mt-1">{asset.location.name}</p>}
                    </div>
                    <Button variant="outline" onClick={handlePrintQR}>
                      <Printer className="h-4 w-4 mr-2" /> Print QR Label
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>

    </>
  )
}

function WOTable({ wos, onNavigate }: { wos: WorkOrder[]; onNavigate: (id: number) => void }) {
  return (
    <div className="divide-y">
      {wos.map(wo => {
        const overdue = wo.dueDate && isPast(new Date(wo.dueDate)) && !['completed', 'cancelled'].includes(wo.status)
        const done    = wo.status === 'completed'
        return (
          <div key={wo.id}
            className="flex items-center gap-3 py-2.5 group cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
            onClick={() => onNavigate(wo.id)}
          >
            {done
              ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              : <Clock className={cn('h-4 w-4 shrink-0', overdue ? 'text-red-500' : 'text-muted-foreground/50')} />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
                <StatusBadge type="priority" value={wo.priority} />
              </div>
              <p className="text-sm truncate">{wo.title}</p>
              {wo.dueDate && (
                <p className={cn('text-xs', overdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                  Due {format(new Date(wo.dueDate), 'MMM d, yyyy')}{overdue ? ' — OVERDUE' : ''}
                </p>
              )}
            </div>
            <StatusBadge type="wo" value={wo.status} />
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
          </div>
        )
      })}
    </div>
  )
}
