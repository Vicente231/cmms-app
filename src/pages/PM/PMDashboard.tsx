import { useState, useMemo } from 'react'
import { Calendar, AlertTriangle, CheckCircle2, Clock, Play, Loader2, ClipboardList, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { usePMSchedules, useGenerateWO } from '@/hooks/usePMSchedules'
import { useAssets } from '@/hooks/useAssets'
import type { PmSchedule } from '@/types'
import { format, isPast, differenceInDays, addDays } from 'date-fns'

// ── Status logic ──────────────────────────────────────────────────────────
type PMStatus = 'overdue' | 'due_week' | 'due_month' | 'on_track' | 'inactive' | 'unscheduled'

function getPMStatus(pm: PmSchedule): PMStatus {
  if (!pm.isActive) return 'inactive'
  if (!pm.nextDueDate) return 'unscheduled'
  const due = new Date(pm.nextDueDate)
  const days = differenceInDays(due, new Date())
  if (days < 0)   return 'overdue'
  if (days <= 7)  return 'due_week'
  if (days <= 30) return 'due_month'
  return 'on_track'
}

function getDaysLabel(pm: PmSchedule): { label: string; sub: string; urgent: boolean } {
  if (!pm.nextDueDate) return { label: '—', sub: 'No date set', urgent: false }
  const due  = new Date(pm.nextDueDate)
  const days = differenceInDays(due, new Date())
  if (days < 0)  return { label: `${Math.abs(days)}d`, sub: 'overdue',     urgent: true  }
  if (days === 0) return { label: 'Today',               sub: 'due today',   urgent: true  }
  if (days === 1) return { label: 'Tomorrow',            sub: 'due tomorrow',urgent: true  }
  return { label: `${days}d`, sub: 'until due', urgent: days <= 7 }
}

const STATUS_CONFIG: Record<PMStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  overdue:     { label: 'Overdue',       color: 'text-red-600',    bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',            icon: AlertTriangle },
  due_week:    { label: 'Due This Week', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800', icon: Clock         },
  due_month:   { label: 'Due This Month',color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800', icon: Calendar      },
  on_track:    { label: 'On Track',      color: 'text-green-600',  bg: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',     icon: CheckCircle2  },
  inactive:    { label: 'Inactive',      color: 'text-muted-foreground', bg: 'bg-muted/30 border-border',                                             icon: Clock         },
  unscheduled: { label: 'Unscheduled',   color: 'text-muted-foreground', bg: 'bg-muted/30 border-border',                                             icon: Calendar      },
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:      'bg-green-100 text-green-700 border-green-200',
}

// ── PM Schedule card ──────────────────────────────────────────────────────
interface CardProps {
  pm: PmSchedule
  status: PMStatus
  assetNames: string[]
  onGenerate: (pm: PmSchedule) => void
  generating: boolean
}

function PMCard({ pm, status, assetNames, onGenerate, generating }: CardProps) {
  const cfg  = STATUS_CONFIG[status]
  const Icon = cfg.icon
  const { label: daysLabel, sub: daysSub, urgent } = getDaysLabel(pm)
  const assetCount = (pm.targetId ?? '').split(',').filter(Boolean).length
  const taskCount  = (pm.taskIds ?? []).length

  return (
    <div className={cn('rounded-lg border p-4 space-y-3 transition-shadow hover:shadow-md', cfg.bg)}>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{pm.name}</p>
          {pm.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pm.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border capitalize', PRIORITY_COLOR[pm.priority] ?? PRIORITY_COLOR.medium)}>
            {pm.priority}
          </span>
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <ClipboardList className="h-3 w-3" />
          {assetCount} asset{assetCount !== 1 ? 's' : ''}
        </span>
        {taskCount > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Every {pm.frequencyValue} {pm.frequencyUnit}
        </span>
        {pm.estimatedHours && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ~{pm.estimatedHours}h
          </span>
        )}
      </div>

      {/* Asset names preview */}
      {assetNames.length > 0 && (
        <p className="text-xs text-muted-foreground truncate">
          {assetNames.slice(0, 3).join(' · ')}{assetNames.length > 3 ? ` +${assetNames.length - 3} more` : ''}
        </p>
      )}

      {/* Due date + Generate button */}
      <div className="flex items-end justify-between gap-2 pt-1 border-t border-border/40">
        <div>
          {pm.nextDueDate ? (
            <>
              <p className={cn('text-lg font-bold leading-none', urgent ? cfg.color : 'text-foreground')}>
                {daysLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {daysSub} · {format(new Date(pm.nextDueDate), 'MMM d, yyyy')}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">No due date set</p>
          )}
          {pm.lastGeneratedAt && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Last WO: {format(new Date(pm.lastGeneratedAt), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        {pm.isActive && (
          <Button
            size="sm"
            variant={status === 'overdue' ? 'default' : 'outline'}
            className="h-8 text-xs gap-1 shrink-0"
            disabled={generating}
            onClick={() => onGenerate(pm)}
          >
            {generating
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Play className="h-3 w-3" />
            }
            Generate WO
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────
type FilterStatus = PMStatus | 'all'

const STAT_ORDER: PMStatus[] = ['overdue', 'due_week', 'due_month', 'on_track']

export function PMDashboard() {
  const { toast } = useToast()
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState<FilterStatus>('all')
  const [generatingId,  setGeneratingId]  = useState<number | null>(null)

  const { data }             = usePMSchedules()
  const { data: assetsData } = useAssets('', 1, 9999)
  const generateWO           = useGenerateWO()

  const schedules = data?.data ?? []
  const allAssets = assetsData?.data ?? []
  const assetByTag = new Map(allAssets.map(a => [a.assetTag ?? '', a.name]))

  // Compute status for every schedule
  const withStatus = useMemo(() =>
    schedules
      .map(pm => ({ pm, status: getPMStatus(pm) }))
      .sort((a, b) => {
        const order: Record<PMStatus, number> = { overdue: 0, due_week: 1, due_month: 2, on_track: 3, unscheduled: 4, inactive: 5 }
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
        const da = a.pm.nextDueDate ? new Date(a.pm.nextDueDate).getTime() : Infinity
        const db = b.pm.nextDueDate ? new Date(b.pm.nextDueDate).getTime() : Infinity
        return da - db
      }),
    [schedules]
  )

  // Stat counts
  const counts = useMemo(() => {
    const c: Record<PMStatus, number> = { overdue: 0, due_week: 0, due_month: 0, on_track: 0, inactive: 0, unscheduled: 0 }
    withStatus.forEach(({ status }) => { c[status] = (c[status] ?? 0) + 1 })
    return c
  }, [withStatus])

  // Filter + search
  const visible = withStatus.filter(({ pm, status }) => {
    if (filterStatus !== 'all' && status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        pm.name.toLowerCase().includes(q) ||
        (pm.description ?? '').toLowerCase().includes(q) ||
        (pm.targetId ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleGenerate = async (pm: PmSchedule) => {
    setGeneratingId(pm.id)
    try {
      const res = await generateWO.mutateAsync(pm.id)
      toast({ title: `Generated ${res.created} work order${res.created !== 1 ? 's' : ''}`, description: res.wo_ids?.join(', ') })
    } catch {
      toast({ title: 'Failed to generate work orders', variant: 'destructive' })
    } finally {
      setGeneratingId(null)
    }
  }

  const getAssetNames = (pm: PmSchedule) =>
    (pm.targetId ?? '').split(',').filter(Boolean).map(tag => assetByTag.get(tag) ?? tag)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          PM Dashboard
        </h1>
        <p className="text-muted-foreground">Overview of all preventive maintenance schedules by urgency</p>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_ORDER.map(s => {
          const cfg  = STATUS_CONFIG[s]
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
          placeholder="Search schedules..."
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
          {visible.length} of {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Cards ── */}
      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No PM schedules yet</p>
          <p className="text-sm mt-1">Go to <span className="font-semibold">Preventive Maintenance → PM Schedules</span> to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(({ pm, status }) => (
            <PMCard
              key={pm.id}
              pm={pm}
              status={status}
              assetNames={getAssetNames(pm)}
              onGenerate={handleGenerate}
              generating={generatingId === pm.id}
            />
          ))}
          {visible.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground text-sm">
              No schedules match the current filter.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
