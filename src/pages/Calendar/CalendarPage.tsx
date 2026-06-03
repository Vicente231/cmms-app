import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { usePMSchedules } from '@/hooks/usePMSchedules'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isToday, addMonths, subMonths,
  addDays, format, isSameMonth, isPast,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WorkOrder } from '@/types'
import type { PmSchedule } from '@/types'

const WO_CHIP: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-blue-500 text-white',
  low:      'bg-slate-400 text-white',
}

const WO_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-blue-500',
  low:      'bg-slate-400',
}

type Filter = 'all' | 'wo' | 'pm'

export function CalendarPage() {
  const navigate     = useNavigate()
  const [month,      setMonth]      = useState(new Date())
  const [selected,   setSelected]   = useState<Date | null>(null)
  const [filter,     setFilter]     = useState<Filter>('all')

  const { data: woPage } = useWorkOrders({ limit: 9999 })
  const { data: pmPage } = usePMSchedules()

  const allWOs = woPage?.data ?? []
  const allPMs = useMemo(
    () => (pmPage?.data ?? []).filter(p => p.isActive && p.nextDueDate),
    [pmPage]
  )

  // Calendar grid: Mon–Sun, padded to full weeks
  const calStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const calEnd   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
  const days     = eachDayOfInterval({ start: calStart, end: calEnd })

  const getWOs = (day: Date) =>
    filter === 'pm' ? [] : allWOs.filter(w => w.dueDate && isSameDay(new Date(w.dueDate), day))

  const getPMs = (day: Date) =>
    filter === 'wo' ? [] : allPMs.filter(p => isSameDay(new Date(p.nextDueDate!), day))

  // Upcoming next 14 days
  const upcoming = useMemo(() => {
    const now  = new Date()
    const end  = addDays(now, 14)
    type Evt = { type: 'wo'; date: Date; wo: WorkOrder } | { type: 'pm'; date: Date; pm: PmSchedule }
    const events: Evt[] = [
      ...allWOs
        .filter(w => w.dueDate && !['completed', 'cancelled'].includes(w.status))
        .filter(w => { const d = new Date(w.dueDate!); return d >= now && d <= end })
        .map(w => ({ type: 'wo' as const, date: new Date(w.dueDate!), wo: w })),
      ...allPMs
        .filter(p => { const d = new Date(p.nextDueDate!); return d >= now && d <= end })
        .map(p => ({ type: 'pm' as const, date: new Date(p.nextDueDate!), pm: p })),
    ]
    return events.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [allWOs, allPMs])

  const selWOs = selected ? getWOs(selected) : []
  const selPMs = selected ? getPMs(selected) : []

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-muted-foreground text-sm">Work orders &amp; PM schedules by due date</p>
        </div>
        {/* Filter */}
        <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
          {(['all', 'wo', 'pm'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : f === 'wo' ? 'Work Orders' : 'PM Schedules'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* ── Main calendar ── */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{format(month, 'MMMM yyyy')}</h2>
                  <Button
                    variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { setMonth(new Date()); setSelected(new Date()) }}
                  >
                    Today
                  </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
                {days.map(day => {
                  const wos     = getWOs(day)
                  const pms     = getPMs(day)
                  const total   = wos.length + pms.length
                  const isSel   = selected && isSameDay(day, selected)
                  const inMonth = isSameMonth(day, month)
                  const hasOverdue = wos.some(w =>
                    !['completed', 'cancelled'].includes(w.status) &&
                    isPast(new Date(w.dueDate!))
                  )

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelected(isSel ? null : day)}
                      className={cn(
                        'bg-background min-h-[80px] sm:min-h-[96px] p-1 cursor-pointer transition-colors hover:bg-accent/40',
                        isToday(day) && 'bg-primary/5',
                        isSel && 'ring-2 ring-inset ring-primary',
                        !inMonth && 'opacity-35',
                        hasOverdue && !isSel && 'bg-red-50/40',
                      )}
                    >
                      <div className={cn(
                        'text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-0.5',
                        isToday(day)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground',
                      )}>
                        {format(day, 'd')}
                      </div>

                      <div className="space-y-0.5">
                        {wos.slice(0, 2).map(wo => (
                          <div
                            key={wo.id}
                            onClick={e => { e.stopPropagation(); navigate(`/work-orders/${wo.id}`) }}
                            className={cn(
                              'text-[10px] px-1 py-0.5 rounded truncate font-medium cursor-pointer leading-tight',
                              ['completed', 'cancelled'].includes(wo.status)
                                ? 'bg-green-100 text-green-700'
                                : WO_CHIP[wo.priority] || 'bg-slate-400 text-white'
                            )}
                            title={wo.title}
                          >
                            {wo.woNumber}
                          </div>
                        ))}
                        {pms.slice(0, wos.length >= 2 ? 0 : 1).map(pm => (
                          <div
                            key={pm.id}
                            className="text-[10px] px-1 py-0.5 rounded truncate font-medium bg-teal-500 text-white leading-tight"
                            title={pm.name}
                          >
                            PM
                          </div>
                        ))}
                        {total > (wos.length >= 2 ? 2 : pms.length > 0 ? 3 : 2) && (
                          <div className="text-[9px] text-muted-foreground pl-0.5">
                            +{total - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t">
                {[
                  { cls: 'bg-red-500',    label: 'Critical' },
                  { cls: 'bg-orange-500', label: 'High' },
                  { cls: 'bg-blue-500',   label: 'Medium' },
                  { cls: 'bg-slate-400',  label: 'Low' },
                  { cls: 'bg-green-200',  label: 'Completed' },
                  { cls: 'bg-teal-500',   label: 'PM Due' },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn('w-3 h-3 rounded', cls)} />
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {selected && (selWOs.length > 0 || selPMs.length > 0) && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <h3 className="font-semibold mb-3 text-sm">
                  {format(selected, 'EEEE, MMMM d')}
                  <span className="ml-2 text-muted-foreground font-normal text-xs">
                    {selWOs.length + selPMs.length} item{selWOs.length + selPMs.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                <div className="space-y-2">
                  {selWOs.map(wo => {
                    const overdue = wo.dueDate && isPast(new Date(wo.dueDate)) && !['completed', 'cancelled'].includes(wo.status)
                    return (
                      <div
                        key={wo.id}
                        className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                      >
                        <div className={cn('w-1.5 h-9 rounded-full shrink-0', overdue ? 'bg-red-500' : WO_BAR[wo.priority] || 'bg-slate-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
                            {wo.discipline && <span className="text-xs text-muted-foreground bg-muted px-1 rounded">{wo.discipline}</span>}
                          </div>
                          <p className="text-sm truncate font-medium">{wo.title}</p>
                        </div>
                        <span className={cn(
                          'text-xs capitalize shrink-0 font-medium',
                          overdue ? 'text-red-600' : 'text-muted-foreground'
                        )}>
                          {overdue ? 'Overdue' : wo.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )
                  })}
                  {selPMs.map(pm => (
                    <div key={pm.id} className="flex items-center gap-3 p-2 rounded-lg border bg-teal-50/60">
                      <div className="w-1.5 h-9 rounded-full shrink-0 bg-teal-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-teal-700 font-semibold uppercase tracking-wide">PM Schedule Due</p>
                        <p className="text-sm truncate font-medium">{pm.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{pm.priority} · every {pm.frequencyValue} {pm.frequencyUnit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Upcoming sidebar ── */}
        <div>
          <Card className="sticky top-4">
            <CardContent className="pt-4 pb-3">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Next 14 Days
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nothing due in the next 14 days</p>
              ) : (
                <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                  {upcoming.map((entry, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2 rounded-md p-1.5 cursor-pointer transition-colors',
                        entry.type === 'wo' ? 'hover:bg-accent' : 'bg-teal-50/60'
                      )}
                      onClick={() => entry.type === 'wo' ? navigate(`/work-orders/${entry.wo.id}`) : undefined}
                    >
                      <div className="text-center shrink-0 w-9 pt-0.5">
                        <p className="text-[9px] text-muted-foreground uppercase leading-none">{format(entry.date, 'EEE')}</p>
                        <p className="text-base font-bold leading-tight">{format(entry.date, 'd')}</p>
                        <p className="text-[9px] text-muted-foreground leading-none">{format(entry.date, 'MMM')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        {entry.type === 'wo' ? (
                          <>
                            <div className="flex items-center gap-1">
                              <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', WO_BAR[entry.wo.priority] || 'bg-slate-400')} />
                              <span className="font-mono text-[10px] text-muted-foreground">{entry.wo.woNumber}</span>
                            </div>
                            <p className="text-xs font-medium truncate leading-tight">{entry.wo.title}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-[10px] text-teal-700 font-semibold leading-none">PM Due</p>
                            <p className="text-xs font-medium truncate leading-tight">{entry.pm.name}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
