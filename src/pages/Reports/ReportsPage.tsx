import { useMemo } from 'react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import { subMonths, startOfMonth, endOfMonth, format, isPast } from 'date-fns'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react'

const DISCIPLINE_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#EC4899']
const STATUS_COLORS: Record<string, string> = {
  open: '#3B82F6', in_progress: '#F59E0B', on_hold: '#F97316',
  completed: '#10B981', cancelled: '#6B7280',
}

export function ReportsPage() {
  const { data: woPage }    = useWorkOrders({ limit: 9999 })
  const { data: assetsRes } = useAssets('', 1, 9999)

  const allWOs    = woPage?.data    ?? []
  const allAssets = assetsRes?.data ?? []

  // Last 6 months for trend
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return { label: format(d, 'MMM yy'), start: startOfMonth(d).getTime(), end: endOfMonth(d).getTime() }
  }), [])

  const monthlyData = useMemo(() => months.map(m => {
    const inMonth = allWOs.filter(w => w.dueDate && new Date(w.dueDate).getTime() >= m.start && new Date(w.dueDate).getTime() <= m.end)
    return {
      name:      m.label,
      total:     inMonth.length,
      completed: inMonth.filter(w => w.status === 'completed').length,
      open:      inMonth.filter(w => w.status !== 'completed' && w.status !== 'cancelled').length,
    }
  }), [allWOs, months])

  // By discipline
  const disciplineData = useMemo(() => {
    const discs = [...new Set(allWOs.map(w => w.discipline).filter(Boolean))] as string[]
    return discs.map(d => ({
      name:      d,
      total:     allWOs.filter(w => w.discipline === d).length,
      completed: allWOs.filter(w => w.discipline === d && w.status === 'completed').length,
    })).sort((a, b) => b.total - a.total)
  }, [allWOs])

  // By status (pie)
  const statusData = useMemo(() => {
    const statuses = ['open', 'in_progress', 'on_hold', 'completed', 'cancelled']
    return statuses
      .map(s => ({ name: s.replace(/_/g, ' '), value: allWOs.filter(w => w.status === s).length, status: s }))
      .filter(d => d.value > 0)
  }, [allWOs])

  // Top assets by WO count
  const topAssets = useMemo(() =>
    allAssets
      .map(a => ({
        name:    a.name,
        tag:     a.assetTag ?? '',
        total:   allWOs.filter(w => w.assetId === a.id).length,
        open:    allWOs.filter(w => w.assetId === a.id && !['completed', 'cancelled'].includes(w.status)).length,
        done:    allWOs.filter(w => w.assetId === a.id && w.status === 'completed').length,
      }))
      .filter(a => a.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  [allWOs, allAssets])

  // Avg actual hours (only WOs with actual hours > 0)
  const wosWithHours = allWOs.filter(w => w.actualHours && w.actualHours > 0)
  const avgHours = wosWithHours.length > 0
    ? (wosWithHours.reduce((s, w) => s + (w.actualHours ?? 0), 0) / wosWithHours.length).toFixed(1)
    : '—'

  const overdueCount    = allWOs.filter(w => !['completed', 'cancelled'].includes(w.status) && w.dueDate && isPast(new Date(w.dueDate))).length
  const completedCount  = allWOs.filter(w => w.status === 'completed').length
  const completionRate  = allWOs.length > 0 ? Math.round((completedCount / allWOs.length) * 100) : 0

  const kpis = [
    { label: 'Total WOs',       value: allWOs.length,   icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Completed',        value: completedCount,  icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Overdue',          value: overdueCount,    icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50'    },
    { label: 'Completion Rate',  value: `${completionRate}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Maintenance performance overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <div className={cn('rounded-lg p-1.5', k.bg)}>
                  <k.icon className={cn('h-3.5 w-3.5', k.color)} />
                </div>
              </div>
              <p className="text-3xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly trend + status pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">WO Volume — Last 6 Months</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="open"      name="Open/In Progress" fill="#3B82F6" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">WOs by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => v.replace(/_/g, ' ')} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By discipline + top assets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">WOs by Discipline</CardTitle></CardHeader>
          <CardContent>
            {disciplineData.length === 0
              ? <p className="text-muted-foreground text-center py-8 text-sm">No disciplines assigned</p>
              : (
                <div className="space-y-3">
                  {disciplineData.map((d, i) => {
                    const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
                    return (
                      <div key={d.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium truncate">{d.name}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">{d.total} WOs · {pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
            {avgHours !== '—' && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Avg actual duration: <span className="font-semibold text-foreground">{avgHours}h</span> per WO
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Top Assets by Work Order Count</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {topAssets.length === 0
              ? <p className="text-muted-foreground text-center py-8 text-sm">No WOs with assigned assets</p>
              : (
                <div className="divide-y">
                  <div className="grid grid-cols-12 gap-2 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <div className="col-span-5">Asset</div>
                    <div className="col-span-2 text-center">Total</div>
                    <div className="col-span-2 text-center">Open</div>
                    <div className="col-span-3 text-right">Completion</div>
                  </div>
                  {topAssets.map((a, i) => {
                    const pct = a.total > 0 ? Math.round((a.done / a.total) * 100) : 0
                    return (
                      <div key={a.tag} className="grid grid-cols-12 gap-2 py-2 text-sm items-center">
                        <div className="col-span-5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground font-medium w-4 shrink-0">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="font-medium truncate leading-tight">{a.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{a.tag}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 text-center font-semibold">{a.total}</div>
                        <div className={cn('col-span-2 text-center font-semibold', a.open > 0 ? 'text-blue-600' : 'text-muted-foreground')}>{a.open}</div>
                        <div className="col-span-3 text-right">
                          <span className={cn('font-semibold', pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-muted-foreground')}>
                            {pct}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
