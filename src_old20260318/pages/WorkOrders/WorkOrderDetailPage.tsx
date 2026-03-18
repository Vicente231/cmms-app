import { useParams, useNavigate } from 'react-router-dom'
import { useWorkOrder } from '@/hooks/useWorkOrders'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowLeft, CheckSquare, Clock, Package, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import api from '@/lib/axios'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const { data: wo, isLoading } = useWorkOrder(+id!)

  const toggleTask = async (taskId: number, isCompleted: boolean) => {
    try {
      await api.patch(`/work-orders/${id}/tasks/${taskId}`, { isCompleted })
      qc.invalidateQueries({ queryKey: ['work-orders', +id!] })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!wo) return <div className="text-center">Work order not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{wo.woNumber}</h1>
            <StatusBadge type="wo" value={wo.status} />
            <StatusBadge type="priority" value={wo.priority} />
          </div>
          <p className="text-muted-foreground mt-1">{wo.title}</p>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({wo.tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="labor">Labor ({wo.labor?.length || 0})</TabsTrigger>
          <TabsTrigger value="parts">Parts ({wo.partsUsed?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Work Order Info</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Asset', wo.asset?.name],
                    ['Location', wo.location?.name],
                    ['Type', wo.type?.name],
                    ['Requested By', wo.requester ? `${wo.requester.firstName} ${wo.requester.lastName}` : null],
                    ['Assigned To', wo.assignee ? `${wo.assignee.firstName} ${wo.assignee.lastName}` : null],
                    ['Team', wo.team?.name],
                    ['Failure Code', wo.failureCode?.code],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd>{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Schedule & Cost</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Requested', wo.requestedDate ? format(new Date(wo.requestedDate), 'MMM d, yyyy') : null],
                    ['Due Date', wo.dueDate ? format(new Date(wo.dueDate), 'MMM d, yyyy HH:mm') : null],
                    ['Started', wo.startedAt ? format(new Date(wo.startedAt), 'MMM d, yyyy HH:mm') : null],
                    ['Completed', wo.completedAt ? format(new Date(wo.completedAt), 'MMM d, yyyy HH:mm') : null],
                    ['Est. Hours', wo.estimatedHours ? `${wo.estimatedHours}h` : null],
                    ['Actual Hours', wo.actualHours ? `${wo.actualHours}h` : null],
                    ['Total Cost', `$${Number(wo.totalCost).toFixed(2)}`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between">
                      <dt className="font-medium text-muted-foreground">{label}</dt>
                      <dd>{value || '-'}</dd>
                    </div>
                  ))}
                </dl>
                {wo.description && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{wo.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-6">
              {wo.tasks?.length ? (
                <div className="space-y-2">
                  {wo.tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <button onClick={() => toggleTask(task.id, !task.isCompleted)} className="mt-0.5">
                        <CheckSquare className={`h-5 w-5 ${task.isCompleted ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </button>
                      <span className={`text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{task.description}</span>
                      {task.isCompleted && task.completedAt && (
                        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(task.completedAt), 'MMM d')}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No tasks</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor">
          <Card>
            <CardContent className="pt-6">
              {wo.labor?.length ? (
                <div className="space-y-2">
                  {wo.labor.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(entry.startTime), 'MMM d, HH:mm')} {entry.endTime ? `— ${format(new Date(entry.endTime), 'HH:mm')}` : '(ongoing)'}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm font-medium"><Clock className="h-3 w-3" />{entry.hours || 0}h</div>
                        {entry.cost && <p className="text-xs text-muted-foreground">${Number(entry.cost).toFixed(2)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No labor entries</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts">
          <Card>
            <CardContent className="pt-6">
              {wo.partsUsed?.length ? (
                <div className="space-y-2">
                  {wo.partsUsed.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{entry.part?.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.part?.partNumber}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>Qty: {entry.quantity}</p>
                        <p className="text-muted-foreground">${Number(entry.totalCost).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t">
                    <p className="font-medium">Total: ${wo.partsUsed.reduce((s, p) => s + Number(p.totalCost), 0).toFixed(2)}</p>
                  </div>
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No parts used</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
