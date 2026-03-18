import { useDashboardStats, useWorkOrders } from '@/hooks/useWorkOrders'
import { useAssets } from '@/hooks/useAssets'
import { useParts } from '@/hooks/useParts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, AlertTriangle, Package, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'

const statusColors: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  on_hold: '#F97316',
  completed: '#10B981',
  cancelled: '#6B7280',
}

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function Dashboard() {
  const { data: stats } = useDashboardStats()
  const { data: assets } = useAssets({ limit: 1 })
  const { data: overdueParts } = useParts({ limit: 1 })
  const navigate = useNavigate()

  const chartData = (stats?.byStatus || []).map((s: { status: string; _count: { status: number } }) => ({
    name: statusLabels[s.status] || s.status,
    count: s._count.status,
    status: s.status,
  }))

  const kpis = [
    {
      title: 'Open Work Orders',
      value: stats?.open ?? 0,
      icon: Wrench,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      onClick: () => navigate('/work-orders?status=open'),
    },
    {
      title: 'Overdue Work Orders',
      value: stats?.overdue ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      onClick: () => navigate('/work-orders'),
    },
    {
      title: 'Total Assets',
      value: assets?.pagination.total ?? 0,
      icon: Package,
      color: 'text-green-600',
      bg: 'bg-green-50',
      onClick: () => navigate('/assets'),
    },
    {
      title: 'Parts Below Min Stock',
      value: overdueParts?.pagination.total ?? 0,
      icon: TrendingDown,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      onClick: () => navigate('/inventory/parts'),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Maintenance overview</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="cursor-pointer hover:shadow-md transition-shadow" onClick={kpi.onClick}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`rounded-full p-3 ${kpi.bg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Work Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: { status: string }, index: number) => (
                    <Cell key={index} fill={statusColors[entry.status] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Work Order', path: '/work-orders', icon: Wrench },
                { label: 'View Assets', path: '/assets', icon: Package },
                { label: 'PM Schedules', path: '/pm-schedules', icon: AlertTriangle },
                { label: 'Inventory', path: '/inventory/parts', icon: TrendingDown },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 hover:bg-accent transition-colors text-sm font-medium"
                >
                  <action.icon className="h-6 w-6 text-primary" />
                  {action.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
