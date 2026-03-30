import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useWorkOrder, useWorkOrderTasks, useUpdateWorkOrderTask } from '@/hooks/useWorkOrders'
import { useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ArrowLeft, CheckSquare, Square, Clock, Package } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

function evalPassCondition(value: string, condition: string): boolean | null {
  if (!condition || !value) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  const m = condition.match(/^([><=!]+)\s*([\d.]+)$/)
  if (!m) return null
  const thresh = parseFloat(m[2])
  switch (m[1]) {
    case '>':  return num > thresh
    case '>=': return num >= thresh
    case '<':  return num < thresh
    case '<=': return num <= thresh
    case '=':
    case '==': return num === thresh
    case '!=': return num !== thresh
    default:   return null
  }
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: wo, isLoading } = useWorkOrder(+id!)
  const { data: woTasks = [] } = useWorkOrderTasks(+id!)
  const { data: allMTasks = [] } = useMaintenanceTasks()
  const updateTask = useUpdateWorkOrderTask(+id!)
  const [measureValues, setMeasureValues] = useState<Record<string, string>>({})

  // Build map of template_task_id → { measurementUnit, passCondition }
  const mtMap = Object.fromEntries(
    allMTasks.map(t => [t.task_id, { measurementUnit: t.measurement_unit, passCondition: t.pass_condition }])
  )

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await updateTask.mutateAsync({ taskId, updates: { is_completed: isCompleted } })
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    }
  }

  const saveMeasurement = async (taskId: string, value: string) => {
    try {
      await updateTask.mutateAsync({ taskId, updates: { measurement_value: value } })
    } catch {
      toast({ title: 'Error saving measurement', variant: 'destructive' })
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
          <TabsTrigger value="tasks">Tasks ({woTasks.length})</TabsTrigger>
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
              {woTasks.length ? (
                <div className="space-y-2">
                  {woTasks.map((task) => {
                    const mt = mtMap[task.templateTaskId] ?? {}
                    const currentVal = measureValues[task.taskId] ?? task.measurementValue
                    const pass = mt.measurementUnit ? evalPassCondition(currentVal, mt.passCondition ?? '') : null
                    return (
                      <div key={task.taskId} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleTask(task.taskId, !task.isCompleted)} className="mt-0.5 shrink-0">
                            {task.isCompleted
                              ? <CheckSquare className="h-5 w-5 text-green-600" />
                              : <Square className="h-5 w-5 text-muted-foreground" />}
                          </button>
                          <span className={`text-sm flex-1 ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {task.description}
                          </span>
                          {mt.passCondition && (
                            <span className="text-xs text-muted-foreground shrink-0">Required: {mt.passCondition} {mt.measurementUnit}</span>
                          )}
                        </div>
                        {mt.measurementUnit && (
                          <div className="flex items-center gap-2 pl-8">
                            <Input
                              type="number"
                              step="any"
                              className="w-32 h-8 text-sm"
                              placeholder="Enter value"
                              value={currentVal}
                              onChange={(e) => setMeasureValues(prev => ({ ...prev, [task.taskId]: e.target.value }))}
                              onBlur={() => currentVal !== task.measurementValue && saveMeasurement(task.taskId, currentVal)}
                            />
                            <span className="text-sm font-medium text-muted-foreground">{mt.measurementUnit}</span>
                            {pass === true  && <Badge className="bg-green-600 text-white">PASS</Badge>}
                            {pass === false && <Badge variant="destructive">FAIL</Badge>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No tasks — generate a WO from a PM Schedule to populate tasks</p>}
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
