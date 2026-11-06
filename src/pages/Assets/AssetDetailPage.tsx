import { useParams, useNavigate } from 'react-router-dom'
import { useRef, useState } from 'react'
import { useAsset } from '@/hooks/useAssets'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAssetDrawings, useUploadDrawing, useDeleteAssetDrawing } from '@/hooks/useAssetDrawings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowLeft, Package, ExternalLink, Plus, CheckCircle2, Clock, Printer, QrCode, FileText, File, Upload, Trash2, Loader2 } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'
import type { WorkOrder } from '@/types'
import QRCode from 'react-qr-code'

const APP_BASE = 'https://vicente231.github.io/cmms-app'

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qrRef    = useRef<HTMLDivElement>(null)
  const { data: asset, isLoading } = useAsset(+id!)
  const { data: woPage }           = useWorkOrders({ limit: 9999 })
  const { data: drawings = [] }    = useAssetDrawings(+id!)
  const uploadDrawing              = useUploadDrawing(+id!)
  const deleteDrawing              = useDeleteAssetDrawing(+id!)

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

  const handlePrintQR = () => {
    const el = qrRef.current
    if (!el) return
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`
      <html><head><title>QR - ${asset?.name}</title>
      <style>
        body { font-family: sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; }
        .qr-box { border:2px solid #000; border-radius:12px; padding:24px; display:flex; flex-direction:column; align-items:center; gap:12px; }
        h2 { margin:0; font-size:18px; font-weight:700; text-align:center; }
        p  { margin:0; font-size:13px; color:#555; font-family:monospace; }
      </style></head><body>
      <div class="qr-box">
        ${el.innerHTML}
        <h2>${asset?.name}</h2>
        <p>${asset?.assetTag ?? ''}</p>
      </div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const allWOs = woPage?.data ?? []
  const assetWOs = allWOs.filter(w => w.assetId === +id!)
  const openWOs      = assetWOs.filter(w => !['completed', 'cancelled'].includes(w.status))
  const historyWOs   = assetWOs.filter(w =>  ['completed', 'cancelled'].includes(w.status))

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!asset)    return <div className="text-center">Asset not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="rounded-full bg-primary/10 p-2">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{asset.name}</h1>
            <p className="text-muted-foreground text-sm">{asset.assetTag || asset.serialNumber}</p>
          </div>
          <StatusBadge type="asset" value={asset.status} />
        </div>
        <Button
          size="sm"
          onClick={() => navigate(`/work-orders?asset=${asset.assetTag}`)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New WO
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
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
          <TabsTrigger value="custom-fields">Specs ({asset.customFields?.length || 0})</TabsTrigger>
          <TabsTrigger value="children">Sub-Assets ({asset.childAssets?.length || 0})</TabsTrigger>
          <TabsTrigger value="drawings">
            <FileText className="h-3.5 w-3.5 mr-1 inline" />Drawings ({drawings.length})
          </TabsTrigger>
          <TabsTrigger value="qr"><QrCode className="h-3.5 w-3.5 mr-1 inline" />QR</TabsTrigger>
        </TabsList>

        {/* ── Details ── */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Asset Information</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Asset Tag',    asset.assetTag],
                    ['Type',         asset.model],
                    ['Serial No.',   asset.serialNumber],
                    ['Manufacturer', asset.manufacturer],
                    ['Location',     asset.location?.name],
                    ['Parent Asset', asset.parentAsset?.name],
                    ['Feed From',    asset.feedFrom?.name],
                    ['Criticality',  asset.criticality],
                  ].map(([label, value]) => value ? (
                    <div key={label as string} className="flex justify-between gap-4">
                      <dt className="font-medium text-muted-foreground shrink-0">{label}</dt>
                      <dd className="text-right">{value}</dd>
                    </div>
                  ) : null)}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financial & Warranty</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Install Date',    asset.purchaseDate  ? format(new Date(asset.purchaseDate),  'MMM d, yyyy') : null],
                    ['Purchase Cost',   asset.purchaseCost  ? `$${Number(asset.purchaseCost).toLocaleString()}` : null],
                    ['Warranty Expiry', asset.warrantyExpiry ? format(new Date(asset.warrantyExpiry), 'MMM d, yyyy') : null],
                  ].map(([label, value]) => value ? (
                    <div key={label as string} className="flex justify-between">
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
          </div>
        </TabsContent>

        {/* ── Open Work Orders ── */}
        <TabsContent value="work-orders">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Open Work Orders</CardTitle>
                <Button size="sm" variant="outline" onClick={() => navigate(`/work-orders?asset=${asset.assetTag}`)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> New WO
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {openWOs.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">No open work orders for this asset</p>
              ) : (
                <WOTable wos={openWOs} navigate={navigate} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Completed & Cancelled</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {historyWOs.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">No work order history for this asset</p>
              ) : (
                <WOTable wos={historyWOs} navigate={navigate} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Meters ── */}
        <TabsContent value="meters">
          <Card>
            <CardContent className="pt-6">
              {asset.meters?.length ? (
                <div className="space-y-3">
                  {asset.meters.map((meter) => (
                    <div key={meter.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{meter.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{meter.meterType}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{Number(meter.currentValue).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{meter.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No meters configured</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Custom Fields / Specs ── */}
        <TabsContent value="custom-fields">
          <Card>
            <CardContent className="pt-6">
              {asset.customFields?.length ? (
                <dl className="space-y-3 text-sm">
                  {asset.customFields.map((field) => (
                    <div key={field.id} className="flex justify-between border-b pb-2">
                      <dt className="font-medium text-muted-foreground">{field.fieldName}</dt>
                      <dd>{field.fieldValue || '-'}</dd>
                    </div>
                  ))}
                </dl>
              ) : <p className="text-muted-foreground text-center py-8">No specifications recorded</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sub-Assets ── */}
        <TabsContent value="children">
          <Card>
            <CardContent className="pt-6">
              {asset.childAssets?.length ? (
                <div className="space-y-2">
                  {asset.childAssets.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent"
                      onClick={() => navigate(`/assets/${child.id}`)}
                    >
                      <div>
                        <p className="font-medium">{child.name}</p>
                        <p className="text-sm text-muted-foreground">{child.assetTag}</p>
                      </div>
                      <StatusBadge type="asset" value={child.status} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No sub-assets</p>}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── Drawings ── */}
        <TabsContent value="drawings" className="space-y-4 mt-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Upload Drawing</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Drawing Name *</Label>
                  <Input placeholder="e.g. P&ID Sheet 1" value={drawingName} onChange={e => setDrawingName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Revision</Label>
                  <Input placeholder="e.g. Rev B" value={revision} onChange={e => setRevision(e.target.value)} />
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
                  disabled={!pendingFile || !drawingName.trim() || uploadDrawing.isPending}
                  onClick={handleUpload}
                >
                  {uploadDrawing.isPending
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</>
                    : <><Upload className="h-4 w-4 mr-2" />Upload</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Max recommended size: 30 MB. Larger DWG files should be linked from Drive directly.</p>
            </CardContent>
          </Card>


          <Card>
            <CardContent className="pt-6">
              {drawings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No drawings uploaded yet</p>
              ) : (
                <div className="divide-y">
                  {drawings.map(d => (
                    <div key={d.drawingId} className="flex items-center gap-3 py-3">
                      {d.fileType === 'pdf'
                        ? <FileText className="h-5 w-5 text-red-500 shrink-0" />
                        : <File     className="h-5 w-5 text-blue-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{d.drawingName}</p>
                        <p className="text-sm text-muted-foreground">
                          {d.revision && <span className="mr-2">{d.revision}</span>}
                          <span className="uppercase font-mono text-xs">{d.fileType}</span>
                          {d.uploadedDate && <span className="ml-2">{format(new Date(d.uploadedDate), 'MMM d, yyyy')}</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://drive.google.com/file/d/${d.driveFileId}/view#zoom=150`, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-1" /> Open in Drive
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteDrawing.isPending}
                          onClick={() => deleteDrawing.mutate({ drawingId: d.drawingId, driveFileId: d.driveFileId })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── QR Code ── */}
        <TabsContent value="qr">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-6">
              <div ref={qrRef} className="p-4 bg-white rounded-lg border">
                <QRCode
                  value={`${APP_BASE}/assets/${asset.id}`}
                  size={200}
                  level="M"
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{asset.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{asset.assetTag}</p>
                {asset.location?.name && (
                  <p className="text-sm text-muted-foreground mt-1">{asset.location.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2 break-all max-w-xs">
                  {APP_BASE}/assets/{asset.id}
                </p>
              </div>
              <Button variant="outline" onClick={handlePrintQR}>
                <Printer className="h-4 w-4 mr-2" /> Print QR Label
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}

function WOTable({ wos, navigate }: { wos: WorkOrder[]; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="divide-y">
      {wos.map(wo => {
        const overdue = wo.dueDate && isPast(new Date(wo.dueDate)) && !['completed', 'cancelled'].includes(wo.status)
        const done    = wo.status === 'completed'
        return (
          <div
            key={wo.id}
            className="flex items-center gap-3 py-2.5 group cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1"
            onClick={() => navigate(`/work-orders/${wo.id}`)}
          >
            {done
              ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              : <Clock className={cn('h-4 w-4 shrink-0', overdue ? 'text-red-500' : 'text-muted-foreground/50')} />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
                <StatusBadge type="priority" value={wo.priority} />
                {wo.discipline && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{wo.discipline}</span>
                )}
              </div>
              <p className="text-sm truncate">{wo.title}</p>
              {wo.dueDate && (
                <p className={cn('text-xs', overdue ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                  Due {format(new Date(wo.dueDate), 'MMM d, yyyy')}{overdue ? ' — OVERDUE' : ''}
                </p>
              )}
            </div>
            <StatusBadge type="wo" value={wo.status} />
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        )
      })}
    </div>
  )
}
