import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import { useProjects, PROJECT_STATUS_COLORS } from '@/hooks/useProjects'
import { useParts } from '@/hooks/useParts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Wrench, AlertTriangle, Package, FolderKanban, Clock, PauseCircle, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { isPast, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { WorkOrder } from '@/types'
import { Button } from '@/components/ui/button'

const STATUS_COLORS: Record<string, string> = {
  open:        '#3B82F6',
  in_progress: '#F59E0B',
  on_hold:     '#F97316',
  completed:   '#10B981',
  cancelled:   '#6B7280',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#6B7280',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In Progress', on_hold: 'On Hold',
  completed: 'Completed', cancelled: 'Cancelled',
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const { data: woPage }    = useWorkOrders({ limit: 9999 })
  const { data: assetsRes } = useAssets('', 1, 9999)
  const { data: projects = [] } = useProjects()

  const allWOs    = woPage?.data ?? []
  const allAssets = assetsRes?.data ?? []

  const { data: partsPage } = useParts({ limit: 9999 })
  const allPartsData        = partsPage?.data ?? []
  const lowStockCount       = allPartsData.filter(p => p.quantityOnHand < p.minimumQuantity).length

  // ── KPI derivations ────────────────────────────────────────────
  const openWOs       = allWOs.filter(w => w.status === 'open')
  const inProgressWOs = allWOs.filter(w => w.status === 'in_progress')
  const onHoldWOs     = allWOs.filter(w => w.status === 'on_hold')
  const overdueWOs    = allWOs.filter(w =>
    !['completed', 'cancelled'].includes(w.status) &&
    w.dueDate && isPast(new Date(w.dueDate))
  )
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning')

  // ── Chart data ─────────────────────────────────────────────────
  const statusChart = Object.entries(STATUS_LABELS).map(([status, name]) => ({
    name, status, count: allWOs.filter(w => w.status === status).length,
  }))

  const priorityChart = ['critical', 'high', 'medium', 'low'].map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: openWOs.filter(w => w.priority === p).length,
    color: PRIORITY_COLORS[p],
  })).filter(d => d.value > 0)

  // ── Overdue list sorted by priority then days overdue ──────────
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const overdueList = [...overdueWOs].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 9
    const pb = priorityOrder[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  }).slice(0, 10)

  const kpis = [
    { label: 'Open WOs',        value: openWOs.length,        icon: Wrench,       color: 'text-blue-600',   bg: 'bg-blue-50',   onClick: () => navigate('/work-orders?status=open') },
    { label: 'Overdue',         value: overdueWOs.length,     icon: AlertTriangle,color: 'text-red-600',    bg: 'bg-red-50',    onClick: () => navigate('/work-orders') },
    { label: 'In Progress',     value: inProgressWOs.length,  icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-50', onClick: () => navigate('/work-orders?status=in_progress') },
    { label: 'On Hold',         value: onHoldWOs.length,      icon: PauseCircle,  color: 'text-orange-600', bg: 'bg-orange-50', onClick: () => navigate('/work-orders?status=on_hold') },
    { label: 'Active Projects',  value: activeProjects.length, icon: FolderKanban, color: 'text-purple-600', bg: 'bg-purple-50', onClick: () => navigate('/projects') },
    { label: 'Total Assets',    value: allAssets.length,      icon: Package,      color: 'text-green-600',  bg: 'bg-green-50',  onClick: () => navigate('/assets') },
    { label: 'Low Stock Parts', value: lowStockCount,         icon: Package,      color: lowStockCount > 0 ? 'text-orange-600' : 'text-green-600', bg: lowStockCount > 0 ? 'bg-orange-50' : 'bg-green-50', onClick: () => navigate('/inventory/parts') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Maintenance operations overview</p>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {kpis.map(k => (
          <Card key={k.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={k.onClick}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground leading-tight">{k.label}</p>
                <div className={cn('rounded-lg p-1.5', k.bg)}>
                  <k.icon className={cn('h-3.5 w-3.5', k.color)} />
                </div>
              </div>
              <p className={cn('text-3xl font-bold', k.value > 0 && k.label === 'Overdue' ? 'text-red-600' : '')}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main row: Overdue list + Active Projects ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Overdue WOs */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Overdue Work Orders</CardTitle>
              {overdueWOs.length > 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  {overdueWOs.length} overdue
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {overdueList.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No overdue work orders
              </div>
            ) : (
              <div className="divide-y">
                {overdueList.map(wo => (
                  <OverdueRow key={wo.id} wo={wo} onOpen={() => navigate(`/work-orders/${wo.id}`)} />
                ))}
              </div>
            )}
            {overdueWOs.length > 10 && (
              <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => navigate('/work-orders')}>
                View all {overdueWOs.length} overdue WOs
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Projects</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => navigate('/projects')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {activeProjects.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No active projects
              </div>
            ) : (
              <div className="space-y-3">
                {activeProjects.slice(0, 5).map(p => {
                  const pWOs      = allWOs.filter(w => w.projectId === p.id)
                  const completed = pWOs.filter(w => w.status === 'completed').length
                  const total     = pWOs.length
                  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
                  return (
                    <div
                      key={p.id}
                      className="cursor-pointer rounded-lg border p-3 hover:bg-accent transition-colors"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
                        </div>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0', PROJECT_STATUS_COLORS[p.status])}>
                          {p.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{completed}/{total} WOs</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Work Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChart} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChart.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Open WOs by Priority</CardTitle></CardHeader>
          <CardContent>
            {priorityChart.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No open work orders</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={priorityChart}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {priorityChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function OverdueRow({ wo, onOpen }: { wo: WorkOrder; onOpen: () => void }) {
  const daysOverdue = wo.dueDate
    ? formatDistanceToNow(new Date(wo.dueDate), { addSuffix: false })
    : ''

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <div className={cn(
        'w-1.5 h-10 rounded-full shrink-0',
        wo.priority === 'critical' ? 'bg-red-500' :
        wo.priority === 'high'     ? 'bg-orange-500' :
        wo.priority === 'medium'   ? 'bg-yellow-500' : 'bg-gray-400'
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{wo.woNumber}</span>
          <StatusBadge type="priority" value={wo.priority} />
        </div>
        <p className="text-sm truncate font-medium">{wo.title}</p>
        <p className="text-xs text-muted-foreground">
          {wo.asset?.name && <span>{wo.asset.name} · </span>}
          <span className="text-red-600 font-medium">{daysOverdue} overdue</span>
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onOpen}>
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
