import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Upload, Trash2, Pencil, Eye, Loader2, Plus, X, Map as MapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import type { Asset, PlatPin } from '@/types'
import {
  usePlatMaps,
  usePlatPins,
  useUploadPlatMap,
  useCreatePlatPin,
  useDeletePlatPin,
  useDeletePlatMap,
} from '@/hooks/usePlatView'

const STATUS_COLOR: Record<string, string> = {
  active:            '#22c55e',
  inactive:          '#9ca3af',
  under_maintenance: '#eab308',
  decommissioned:    '#f87171',
}

function driveImgUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
}

// ── Pin marker ───────────────────────────────────────────────────────────────
interface PinMarkerProps {
  pin: PlatPin
  asset: Asset | undefined
  editMode: boolean
  onViewAsset: (id: number) => void
  onDelete: (pinId: string, mapId: string) => void
}

function PinMarker({ pin, asset, editMode, onViewAsset, onDelete }: PinMarkerProps) {
  const [show, setShow] = useState(false)
  const statusKey = asset?.status ?? 'inactive'
  const color = STATUS_COLOR[statusKey] ?? '#9ca3af'
  const numericId = asset ? asset.id : parseInt(pin.assetId.replace('AST-', ''), 10) || 0

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%`, transform: 'translate(-50%, -100%)', zIndex: 10 }}
    >
      <div className="relative">
        {/* Delete button in edit mode */}
        {editMode && (
          <button
            className="absolute -top-1 -right-1 z-20 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none hover:opacity-80 shadow"
            onClick={e => { e.stopPropagation(); onDelete(pin.pinId, pin.mapId) }}
            title="Remove pin"
          >
            ×
          </button>
        )}

        {/* Pin icon */}
        <div
          className="relative cursor-pointer drop-shadow-lg"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onClick={() => !editMode && numericId > 0 && onViewAsset(numericId)}
          title={asset?.name ?? pin.assetId}
        >
          <MapPin
            className="h-7 w-7 transition-transform hover:scale-110"
            style={{ color, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
            fill={color}
            stroke="white"
            strokeWidth={1.5}
          />
        </div>

        {/* Tooltip */}
        {show && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border rounded-md px-2.5 py-1.5 shadow-xl whitespace-nowrap text-xs z-30 pointer-events-none">
            <p className="font-semibold text-foreground">{asset?.name ?? pin.assetId}</p>
            {asset?.location?.name && (
              <p className="text-muted-foreground">{asset.location.name}</p>
            )}
            {asset?.status && (
              <p className="capitalize" style={{ color }}>
                {asset.status.replace(/_/g, ' ')}
              </p>
            )}
            {!editMode && <p className="text-muted-foreground italic mt-0.5">Click to view</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pin placement popup ──────────────────────────────────────────────────────
interface PlacePinPopupProps {
  x: number
  y: number
  assets: Asset[]
  onPlace: (assetId: string) => void
  onCancel: () => void
  isLoading: boolean
}

function PlacePinPopup({ x, y, assets, onPlace, onCancel, isLoading }: PlacePinPopupProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)

  const results = search.length > 0
    ? assets
        .filter(a =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          (a.assetTag ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (a.location?.name ?? '').toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 6)
    : []

  // Flip popup so it doesn't go off-screen
  const flipX = x > 70
  const flipY = y > 70

  return (
    <div
      className="absolute z-40 bg-popover border rounded-lg shadow-2xl p-3 w-60"
      style={{
        left: `${x}%`,
        top:  `${y}%`,
        transform: `translate(${flipX ? '-100%' : '8px'}, ${flipY ? '-100%' : '8px'})`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Pin an Asset</p>
        <button className="text-muted-foreground hover:text-foreground" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {selected ? (
        <div className="flex items-center justify-between rounded border px-2 py-1.5 bg-muted/30 mb-2">
          <div>
            <p className="text-xs font-medium">{selected.name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{selected.assetTag}</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground" onClick={() => { setSelected(null); setSearch('') }}>
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder="Search asset..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 text-xs mb-1"
            autoFocus
          />
          {results.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded border bg-background mb-2">
              {results.map(a => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-2 py-1.5 text-xs cursor-pointer hover:bg-accent"
                  onMouseDown={() => { setSelected(a); setSearch('') }}
                >
                  <span className="font-medium truncate">{a.name}</span>
                  <span className="text-muted-foreground font-mono shrink-0 ml-2">{a.assetTag}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex gap-1.5 mt-1">
        <Button
          size="sm"
          className="flex-1 h-7 text-xs"
          disabled={!selected || isLoading}
          onClick={() => selected && onPlace(selected.assetTag ?? '')}
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
          Place Pin
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
interface PlatViewPanelProps {
  assets: Asset[]
  onViewAsset: (id: number) => void
}

export function PlatViewPanel({ assets, onViewAsset }: PlatViewPanelProps) {
  const { toast } = useToast()
  const [selectedMapId,  setSelectedMapId]  = useState<string>('')
  const [editMode,       setEditMode]       = useState(false)
  const [pendingPin,     setPendingPin]     = useState<{ x: number; y: number } | null>(null)
  const [showUpload,     setShowUpload]     = useState(false)
  const [uploadFile,     setUploadFile]     = useState<File | null>(null)
  const [uploadName,     setUploadName]     = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: maps = [],  isLoading: mapsLoading } = usePlatMaps()
  const { data: pins = [],  isLoading: pinsLoading  } = usePlatPins(selectedMapId)
  const uploadMap   = useUploadPlatMap()
  const createPin   = useCreatePlatPin()
  const deletePin   = useDeletePlatPin()
  const deleteMap   = useDeletePlatMap()

  // Auto-select first map
  useEffect(() => {
    if (maps.length > 0 && !selectedMapId) setSelectedMapId(maps[0].mapId)
  }, [maps, selectedMapId])

  const selectedMap = maps.find(m => m.mapId === selectedMapId)

  // Asset lookup by assetTag (e.g. "AST-000004")
  const assetByTag = new Map(assets.map(a => [a.assetTag ?? '', a]))

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editMode || !selectedMapId || pendingPin) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top)  / rect.height) * 100
    setPendingPin({ x, y })
  }, [editMode, selectedMapId, pendingPin])

  const handlePlacePin = async (assetId: string) => {
    if (!pendingPin || !assetId || !selectedMapId) return
    try {
      await createPin.mutateAsync({ mapId: selectedMapId, assetId, xPct: pendingPin.x, yPct: pendingPin.y })
      setPendingPin(null)
      toast({ title: 'Pin placed' })
    } catch {
      toast({ title: 'Error', description: 'Failed to place pin', variant: 'destructive' })
    }
  }

  const handleDeletePin = async (pinId: string, mapId: string) => {
    try {
      await deletePin.mutateAsync({ pinId, mapId })
      toast({ title: 'Pin removed' })
    } catch {
      toast({ title: 'Error', description: 'Failed to remove pin', variant: 'destructive' })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadName(file.name.replace(/\.[^.]+$/, ''))
    setShowUpload(true)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    try {
      const result = await uploadMap.mutateAsync({ file: uploadFile, mapName: uploadName.trim() })
      toast({ title: 'Map uploaded', description: uploadName.trim() })
      setShowUpload(false)
      setUploadFile(null)
      setUploadName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (result?.map_id) setSelectedMapId(result.map_id)
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' })
    }
  }

  const handleDeleteMap = async () => {
    if (!selectedMap) return
    if (!confirm(`Delete map "${selectedMap.mapName}" and all its pins?`)) return
    try {
      await deleteMap.mutateAsync({ mapId: selectedMap.mapId, driveFileId: selectedMap.driveFileId })
      setSelectedMapId('')
      toast({ title: 'Map deleted' })
    } catch {
      toast({ title: 'Error', description: 'Failed to delete map', variant: 'destructive' })
    }
  }

  return (
    <div className="rounded-lg border bg-card space-y-0">

      {/* ── Toolbar ── */}
      <div className="px-3 py-2 border-b bg-muted/30 space-y-2">
        <div className="flex flex-wrap items-center gap-2">

          {/* Map selector */}
          {maps.length > 0 && (
            <select
              value={selectedMapId}
              onChange={e => { setSelectedMapId(e.target.value); setPendingPin(null) }}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {maps.map(m => (
                <option key={m.mapId} value={m.mapId}>{m.mapName}</option>
              ))}
            </select>
          )}

          {mapsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

          {/* Upload new map */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" /> Upload Map
          </Button>

          {/* Edit mode toggle */}
          {selectedMap && (
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => { setEditMode(v => !v); setPendingPin(null) }}
            >
              {editMode ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {editMode ? 'View Mode' : 'Edit Pins'}
            </Button>
          )}

          {/* Delete current map */}
          {selectedMap && editMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1 text-destructive hover:text-destructive ml-auto"
              onClick={handleDeleteMap}
              disabled={deleteMap.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Map
            </Button>
          )}

          {/* Pin count info */}
          {selectedMap && !editMode && (
            <span className="text-xs text-muted-foreground ml-auto">
              {pins.length} pin{pins.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Edit mode hint */}
        {editMode && (
          <p className="text-xs text-muted-foreground">
            Click anywhere on the map to place a pin. Click <span className="font-semibold">×</span> on a pin to remove it.
          </p>
        )}

        {/* Upload inline form */}
        {showUpload && uploadFile && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="Map name..."
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleUpload}
              disabled={uploadMap.isPending || !uploadName.trim()}
            >
              {uploadMap.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Upload'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setShowUpload(false); setUploadFile(null); setUploadName(''); if (fileInputRef.current) fileInputRef.current.value = '' }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── Map canvas ── */}
      {!selectedMap && !mapsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <MapIcon className="h-12 w-12 opacity-30" />
          <div className="text-center">
            <p className="font-medium">No maps uploaded yet</p>
            <p className="text-sm mt-1">Upload a Google Maps screenshot to start placing asset pins</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload Map Image
          </Button>
        </div>
      ) : selectedMap && (
        <div className="relative w-full select-none" style={{ minHeight: 200 }}>
          {/* Map image */}
          <img
            src={driveImgUrl(selectedMap.driveFileId)}
            alt={selectedMap.mapName}
            className="w-full h-auto block"
            draggable={false}
            onError={e => {
              ;(e.target as HTMLImageElement).src = ''
            }}
          />

          {/* Transparent click overlay (edit mode only) */}
          {editMode && (
            <div
              className="absolute inset-0 cursor-crosshair"
              style={{ zIndex: 5 }}
              onClick={handleOverlayClick}
            />
          )}

          {/* Pins */}
          {!pinsLoading && pins.map(pin => (
            <PinMarker
              key={pin.pinId}
              pin={pin}
              asset={assetByTag.get(pin.assetId)}
              editMode={editMode}
              onViewAsset={onViewAsset}
              onDelete={handleDeletePin}
            />
          ))}

          {/* Pending pin placement popup */}
          {pendingPin && (
            <PlacePinPopup
              x={pendingPin.x}
              y={pendingPin.y}
              assets={assets}
              onPlace={handlePlacePin}
              onCancel={() => setPendingPin(null)}
              isLoading={createPin.isPending}
            />
          )}

          {/* Loading pins spinner */}
          {pinsLoading && (
            <div className="absolute top-2 right-2 bg-background/80 rounded px-2 py-1 flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading pins...
            </div>
          )}
        </div>
      )}

      {/* ── Legend ── */}
      {selectedMap && (
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-t bg-muted/10 flex-wrap">
          <span className="font-medium">Status:</span>
          {[
            ['#22c55e', 'Active'],
            ['#eab308', 'Under Maintenance'],
            ['#9ca3af', 'Inactive'],
            ['#f87171', 'Decommissioned'],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1">
              <MapPin className="h-3 w-3" style={{ color, fill: color }} stroke="white" strokeWidth={1.5} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
