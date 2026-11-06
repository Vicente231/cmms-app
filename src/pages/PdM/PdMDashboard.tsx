import { useState, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAssets } from '@/hooks/useAssets'
import { usePdMHealth } from '@/hooks/usePdM'
import type { HealthStatus, ParamHealth, AssetHealth } from '@/types'
import type { Asset } from '@/types'
import { format } from 'date-fns'

// ── Visual helpers ────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<HealthStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ok:      { label: 'OK',       color: 'text-green-600',  bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',  icon: CheckCircle2  },
  warning: { label: 'Warning',  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800', icon: AlertTriangle },
  critical:{ label: 'Critical', color: 'text-red-600',    bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',           icon: AlertTriangle },
  unknown: { label: 'No Data',  color: 'text-muted-foreground', bg: 'bg-muted/30 border-border',                                          icon: HelpCircle    },
}

const PARAM_LABEL: Record<string, string> = {
  vibration:             'Vibration',
  temperature:           'Temperature',
  insulation_resistance: 'Insulation Resistance',
  oil_condition_score:   'Oil Condition',
}

function paramLabel(name: string) {
  return PARAM_LABEL[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function TrendIcon({ direction, status }: { direction?: 'above' | 'below'; status: HealthStatus }) {
  if (status === 'unknown') return <Minus className="h-3 w-3 text-muted-foreground" />
  if (!direction) return null
  return direction === 'above'
    ? <TrendingUp   className={cn('h-3 w-3', status === 'ok' ? 'text-green-500' : status === 'warning' ? 'text-yellow-500' : 'text-red-500')} />
    : <TrendingDown className={cn('h-3 w-3', status === 'ok' ? 'text-green-500' : status === 'warning' ? 'text-yellow-500' : 'text-red-500')} />
}

// ── Param row inside card ─────────────────────────────────────────────────
function ParamRow({ p }: { p: ParamHealth }) {
  const cfg = STATUS_CONFIG[p.status]
  const Icon = cfg.icon
  return (
    <div className="flex items-center justify-between py-1 border-b last:border-0 border-border/40">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.color)} />
        <span className="text-xs text-muted-foreground truncate">{paramLabel(p.paramName)}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <TrendIcon direction={p.direction} status={p.status} />
        <span className={cn('text-xs font-semibold tabular-nums', cfg.color)}>
          {p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} {p.unit}
        </span>
        {p.warningValue !== undefined && (
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            W:{p.warningValue} C:{p.criticalValue}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Asset health card ─────────────────────────────────────────────────────
function AssetCard({ asset, health, onView }: { asset: Asset; health: AssetHealth; onView: (id: number) => void }) {
  const cfg = STATUS_CONFIG[health.overallStatus]
  const Icon = cfg.icon
  const lastDate = health.params.length > 0
    ? health.params.map(p => p.recordedAt).sort().at(-1)
    : null

  return (
    <div
      className={cn('rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow', cfg.bg)}
      onClick={() => onView(asset.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{asset.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{asset.assetTag}</p>
          {asset.location?.name && (
            <p className="text-xs text-muted-foreground mt-0.5">{asset.location.name}</p>
          )}
        </div>
        <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border shrink-0 ml-2', cfg.bg, cfg.color)}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </div>
      </div>

      {health.params.length > 0 ? (
        <div className="space-y-0">
          {health.params.map(p => <ParamRow key={p.paramName} p={p} />)}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No readings recorded yet</p>
      )}

      {lastDate && (
        <p className="text-[10px] text-muted-foreground mt-2 text-right">
          Last reading: {format(new Date(lastDate), 'MMM d, yyyy HH:mm')}
        </p>
      )}
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────────────────
type FilterStatus = 'all' | HealthStatus

export function PdMDashboard() {
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  const { data: allAssetsData, isLoading: assetsLoading } = useAssets('', 1, 9999)
  const { isLoading: pdmLoading, latestMeasurements, threshMap, computeHealth } = usePdMHealth()

  const allAssets = allAssetsData?.data ?? []

  // Group latest measurements by assetId (latest per param per asset)
  const measByAsset = useMemo(() => {
    const map = new Map<string, Map<string, typeof latestMeasurements[0]>>()
    for (const m of latestMeasurements) {
      if (!map.has(m.assetId)) map.set(m.assetId, new Map())
      const existing = map.get(m.assetId)!.get(m.paramName)
      if (!existing || m.recordedAt > existing.recordedAt) {
        map.get(m.assetId)!.set(m.paramName, m)
      }
    }
    return map
  }, [latestMeasurements])

  // Only show assets that have at least one measurement (or all if filter is set)
  const healthByAsset = useMemo(() => {
    const result = new Map<number, AssetHealth>()
    for (const asset of allAssets) {
      const tag = asset.assetTag ?? ''
      const paramMap = measByAsset.get(tag) ?? new Map()
      const measurements = Array.from(paramMap.values())
      const health = computeHealth(tag, asset.model ?? '', measurements)
      result.set(asset.id, health)
    }
    return result
  }, [allAssets, measByAsset, computeHealth, threshMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Assets with any measurements
  const monitoredAssets = allAssets.filter(a => {
    const tag = a.assetTag ?? ''
    return measByAsset.has(tag) && (measByAsset.get(tag)?.size ?? 0) > 0
  })

  // Stats
  const counts = { ok: 0, warning: 0, critical: 0, unknown: 0 }
  monitoredAssets.forEach(a => {
    const h = healthByAsset.get(a.id)
    if (h) counts[h.overallStatus] = (counts[h.overallStatus] ?? 0) + 1
  })

  // Filter + search
  const visibleAssets = allAssets.filter(a => {
    const h = healthByAsset.get(a.id)
    const hasData = (measByAsset.get(a.assetTag ?? '')?.size ?? 0) > 0
    if (!hasData && filterStatus !== 'all') return false
    if (filterStatus !== 'all' && h?.overallStatus !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        (a.assetTag ?? '').toLowerCase().includes(q) ||
        (a.location?.name ?? '').toLowerCase().includes(q) ||
        (a.model ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const isLoading = assetsLoading || pdmLoading

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Predictive Maintenance
        </h1>
        <p className="text-muted-foreground">Asset health based on field readings vs. defined thresholds</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['critical', 'warning', 'ok', 'unknown'] as HealthStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s]
          const Icon = cfg.icon
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(prev => prev === s ? 'all' : s)}
              className={cn(
                'rounded-lg border p-3 text-left transition-all hover:shadow-sm',
                cfg.bg,
                filterStatus === s && 'ring-2 ring-offset-1 ring-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', cfg.color)} />
                <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
              </div>
              <p className={cn('text-2xl font-bold mt-1', cfg.color)}>{counts[s]}</p>
            </button>
          )
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {filterStatus !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')} className="text-xs">
            Clear filter
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">
          {monitoredAssets.length} asset{monitoredAssets.length !== 1 ? 's' : ''} monitored
        </span>
      </div>

      {/* ── Asset grid ── */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading asset health data...</div>
      ) : visibleAssets.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No readings recorded yet</p>
          <p className="text-sm mt-1">
            Open any asset detail, go to the <span className="font-semibold">Readings</span> tab, and log the first measurement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleAssets.map(asset => {
            const health = healthByAsset.get(asset.id) ?? { assetId: asset.assetTag ?? '', overallStatus: 'unknown' as HealthStatus, params: [] }
            return (
              <AssetCard
                key={asset.id}
                asset={asset}
                health={health}
                onView={() => {/* navigate to asset or open sheet */}}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
