import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAll } from '@/lib/supabase'
import type { GASWorkOrder, GASWorkOrderTask, GASMaintenanceTask } from '@/lib/api'
import type { WorkOrder, WorkOrderTask, WoStatus, WoPriority, PaginatedResponse } from '@/types'

const KEY = 'work-orders'

function idNum(wo_id: string): number {
  return parseInt(wo_id?.replace('WO-', '') || '0', 10) || 0
}

function toWoId(id: number): string {
  return 'WO-' + String(id).padStart(6, '0')
}

function mapWo(wo: GASWorkOrder): WorkOrder {
  const checklistTaskIds: string[] = (() => {
    try {
      const c = wo.checklist
      if (Array.isArray(c)) return c as string[]
      return JSON.parse(String(c || '[]'))
    } catch { return [] }
  })()
  return {
    id: idNum(wo.wo_id),
    orgId: 0,
    woNumber: wo.wo_id,
    title: wo.description || wo.wo_id,
    description: wo.problem_description || wo.description,
    status: (wo.status?.toLowerCase() as WoStatus) || 'open',
    priority: (wo.priority?.toLowerCase() as WoPriority) || 'medium',
    requestedDate: '',
    dueDate: wo.due_date || undefined,
    estimatedHours: wo.estimated_duration ? parseFloat(wo.estimated_duration) : undefined,
    actualHours: wo.actual_duration ? parseFloat(wo.actual_duration) : undefined,
    totalCost: 0,
    requiresDowntime: false,
    checklistTaskIds,
    assetId: wo.asset_id ? parseInt(wo.asset_id.replace('AST-', '') || '0', 10) : undefined,
    asset: wo.asset_id ? { id: 0, name: wo.asset_id, assetTag: wo.asset_id } : undefined,
    projectId: wo.project_id || undefined,
    discipline: wo.discipline || undefined,
    completionNotes: wo.completion_notes || undefined,
    completionImageUrls: (() => { try { return JSON.parse(wo.completion_image_urls || '[]') } catch { return [] } })(),
    completedBy: wo.completed_by || undefined,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(all: WorkOrder[], params?: Record<string, string | number>): PaginatedResponse<WorkOrder> {
  const search    = String(params?.search    || '').toLowerCase().trim()
  const status    = String(params?.status    || '').toLowerCase().trim()
  const projectId = String(params?.projectId || '').trim()
  const page      = Number(params?.page  || 1)
  const limit     = Number(params?.limit || all.length || 20)

  let filtered = all
  if (search)    filtered = filtered.filter((w) =>
    w.woNumber?.toLowerCase().includes(search) ||
    w.title?.toLowerCase().includes(search) ||
    w.asset?.name?.toLowerCase().includes(search)
  )
  if (status)    filtered = filtered.filter((w) => w.status === status)
  if (projectId) filtered = filtered.filter((w) => w.projectId === projectId)

  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start      = (page - 1) * limit

  return {
    data: filtered.slice(start, start + limit),
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  }
}

const useAllWorkOrders = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const data = await fetchAll<GASWorkOrder>('work_orders')
      return data.map(mapWo)
    },
  })

export const useWorkOrders = (params?: Record<string, string | number>) => {
  const query = useAllWorkOrders()
  return { ...query, data: toPaged(query.data ?? [], params) }
}

export const useWorkOrder = (id: number) => {
  const query = useAllWorkOrders()
  return { ...query, data: query.data?.find((w) => w.id === id) ?? null }
}

export type CreateWOBody = Partial<WorkOrder> & {
  taskIds?: string[]
  woType?: 'PM' | 'CM'
  projectId?: string
  discipline?: string
  safetyCondition?: string
  problemDescription?: string
  diagnosis?: string
  correctiveAction?: string
  assignedTo?: string
  assetTag?: string
}

export const useCreateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateWOBody) => {
      const assetId = body.assetTag
        ?? (body.assetId ? 'AST-' + String(body.assetId).padStart(6, '0') : '')
      const { error } = await supabase.from('work_orders').insert({
        wo_type:             body.woType || 'CM',
        asset_id:            assetId,
        assigned_to:         body.assignedTo || '',
        priority:            body.priority?.toUpperCase() || 'MEDIUM',
        status:              'OPEN',
        due_date:            body.dueDate || '',
        description:         body.title || body.description || '',
        problem_description: body.problemDescription || body.description || '',
        diagnosis:           body.diagnosis || '',
        corrective_action:   body.correctiveAction || '',
        safety_condition:    body.safetyCondition || '',
        estimated_duration:  body.estimatedHours ? String(body.estimatedHours) : '',
        checklist:           body.taskIds || [],
        project_id:          body.projectId || '',
        discipline:          body.discipline || '',
      })
      if (error) throw error
      // Fetch the newly generated WO ID (separate query avoids RETURNING/RLS issue)
      const { data: latest } = await supabase.from('work_orders')
        .select('wo_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      return { success: true, wo_id: latest?.wo_id ?? '' }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<WorkOrder> & { id: number }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.priority   !== undefined) patch.priority            = body.priority.toUpperCase()
      if (body.status     !== undefined) patch.status              = body.status.toUpperCase()
      if (body.dueDate    !== undefined) patch.due_date            = body.dueDate
      if (body.title      !== undefined) patch.description         = body.title
      if (body.description !== undefined) patch.problem_description = body.description
      if (body.estimatedHours !== undefined) patch.estimated_duration = String(body.estimatedHours)
      if (body.actualHours    !== undefined) patch.actual_duration    = String(body.actualHours)
      if (body.completionNotes     !== undefined) patch.completion_notes      = body.completionNotes
      if (body.completedBy         !== undefined) patch.completed_by          = body.completedBy
      if (body.completionImageUrls !== undefined) patch.completion_image_urls = JSON.stringify(body.completionImageUrls)

      const { error } = await supabase.from('work_orders').update(patch).eq('wo_id', toWoId(id))
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('work_orders').delete().eq('wo_id', toWoId(id))
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

function mapWoTask(t: GASWorkOrderTask): WorkOrderTask {
  return {
    taskId: t.task_id,
    woId: t.wo_id,
    templateTaskId: t.template_task_id,
    description: t.task_description,
    isCompleted: t.is_completed === true || String(t.is_completed).toUpperCase() === 'TRUE',
    completionNotes: t.completion_notes || '',
    timeSpentMinutes: t.time_spent_minutes ? Number(t.time_spent_minutes) : null,
    measurementValue: t.measurement_value ? String(t.measurement_value) : '',
  }
}

export const useWorkOrderTasks = (woId: number) => {
  const woIdStr = toWoId(woId)
  return useQuery({
    queryKey: ['wo-tasks', woId],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_order_tasks').select('*').eq('wo_id', woIdStr)
      if (error) throw error
      return (data ?? []).map(mapWoTask)
    },
    enabled: !!woId,
  })
}

export const useInitializeWOTasks = (woId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!taskIds.length) return { success: true, created: 0 }
      const { data: templates, error: tErr } = await supabase
        .from('maintenance_tasks').select('*').in('task_id', taskIds)
      if (tErr) throw tErr
      if (!templates?.length) return { success: true, created: 0 }
      const { data, error } = await supabase.from('work_order_tasks').insert(
        (templates as GASMaintenanceTask[]).map(t => ({
          wo_id:            toWoId(woId),
          template_task_id: t.task_id,
          task_description: t.description,
          is_completed:     false,
          completion_notes: '',
          time_spent_minutes: null,
          measurement_value: '',
        }))
      ).select()
      if (error) throw error
      return { success: true, created: data?.length ?? 0 }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wo-tasks', woId] }),
  })
}

export const useUpdateWorkOrderTask = (woId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('work_order_tasks').update(updates).eq('task_id', taskId)
      if (error) throw error
      return { success: true }
    },
    onMutate: async ({ taskId, updates }) => {
      await qc.cancelQueries({ queryKey: ['wo-tasks', woId] })
      const previous = qc.getQueryData<WorkOrderTask[]>(['wo-tasks', woId])
      qc.setQueryData<WorkOrderTask[]>(['wo-tasks', woId], old =>
        (old ?? []).map(t => {
          if (t.taskId !== taskId) return t
          const patch: Partial<WorkOrderTask> = {}
          if ('is_completed'       in updates) patch.isCompleted      = updates.is_completed as boolean
          if ('completion_notes'   in updates) patch.completionNotes  = updates.completion_notes as string
          if ('time_spent_minutes' in updates) patch.timeSpentMinutes = updates.time_spent_minutes as number | null
          if ('measurement_value'  in updates) patch.measurementValue = updates.measurement_value as string
          return { ...t, ...patch }
        })
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['wo-tasks', woId], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['wo-tasks', woId] }),
  })
}

function calculateNextDueDate(pm: { next_due_date: string; frequency_value: number | string; frequency_unit: string }): string {
  const base = pm.next_due_date ? new Date(pm.next_due_date) : new Date()
  const v = Number(pm.frequency_value) || 1
  const next = new Date(base)
  switch (pm.frequency_unit) {
    case 'days':   next.setDate(next.getDate() + v); break
    case 'weeks':  next.setDate(next.getDate() + v * 7); break
    case 'months': next.setMonth(next.getMonth() + v); break
    case 'years':  next.setFullYear(next.getFullYear() + v); break
    default:       next.setMonth(next.getMonth() + v)
  }
  return next.toISOString().split('T')[0]
}

export const useGenerateWO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const pmId = 'PM-' + String(id).padStart(6, '0')
      const { data: pm, error: pmErr } = await supabase.from('pm_schedules').select('*').eq('pm_id', pmId).single()
      if (pmErr) throw pmErr

      let assets: { asset_id: string; asset_name: string }[] = []
      const targetIds = String(pm.target_id || '').split(',').map((s: string) => s.trim()).filter(Boolean)

      if (pm.target_type === 'asset') {
        const { data } = await supabase.from('assets').select('asset_id,asset_name').in('asset_id', targetIds)
        assets = data ?? []
      } else if (pm.target_type === 'location') {
        const { data } = await supabase.from('assets').select('asset_id,asset_name').in('location', targetIds)
        assets = data ?? []
      } else {
        const { data } = await supabase.from('assets').select('asset_id,asset_name').in('asset_type', targetIds)
        assets = data ?? []
      }

      if (!assets.length) return { success: true, created: 0, wo_ids: [] }

      const { data: createdWOs, error: woErr } = await supabase.from('work_orders').insert(
        assets.map(a => ({
          wo_type:             'PM',
          asset_id:            a.asset_id,
          priority:            pm.priority || 'MEDIUM',
          status:              'OPEN',
          description:         pm.name,
          problem_description: pm.description || '',
          estimated_duration:  pm.estimated_hours ? String(pm.estimated_hours) : '',
          checklist:           pm.task_ids ? JSON.parse(typeof pm.task_ids === 'string' ? pm.task_ids : '[]') : [],
        }))
      ).select('wo_id')
      if (woErr) throw woErr

      await supabase.from('pm_schedules').update({
        last_generated_date: new Date().toISOString().split('T')[0],
        next_due_date:       calculateNextDueDate(pm),
        updated_at:          new Date().toISOString(),
      }).eq('pm_id', pmId)

      return { success: true, created: createdWOs?.length ?? 0, wo_ids: (createdWOs ?? []).map(w => w.wo_id) }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['pm-schedules'] })
    },
  })
}

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: wos, error } = await supabase.from('work_orders').select('status,due_date')
      if (error) throw error
      const all = wos ?? []
      const statuses = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
      const byStatus = statuses.map((s) => ({
        status: s.toLowerCase(),
        _count: { status: all.filter((w) => w.status === s).length },
      }))
      const open = all.filter((w) => w.status === 'OPEN').length
      const overdue = all.filter(
        (w) =>
          w.status !== 'COMPLETED' &&
          w.status !== 'CANCELLED' &&
          w.due_date &&
          new Date(w.due_date) < new Date()
      ).length
      return { open, overdue, byStatus }
    },
  })
