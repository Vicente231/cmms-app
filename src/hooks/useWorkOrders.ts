import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASWorkOrder } from '@/lib/api'
import type { WorkOrder, WoStatus, WoPriority, PaginatedResponse } from '@/types'

const KEY = 'work-orders'

function idNum(wo_id: string): number {
  return parseInt(wo_id?.replace('WO-', '') || '0', 10) || 0
}

function toWoId(id: number): string {
  return 'WO-' + String(id).padStart(6, '0')
}

function mapWo(wo: GASWorkOrder): WorkOrder {
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
    assetId: wo.asset_id ? parseInt(wo.asset_id.replace('AST-', '') || '0', 10) : undefined,
    asset: wo.asset_id ? { id: 0, name: wo.asset_id, assetTag: wo.asset_id } : undefined,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(all: WorkOrder[], params?: Record<string, string | number>): PaginatedResponse<WorkOrder> {
  const search = String(params?.search || '').toLowerCase().trim()
  const status = String(params?.status || '').toLowerCase().trim()
  const page   = Number(params?.page  || 1)
  const limit  = Number(params?.limit || all.length || 20)

  let filtered = all
  if (search) filtered = filtered.filter((w) =>
    w.woNumber?.toLowerCase().includes(search) ||
    w.title?.toLowerCase().includes(search) ||
    w.asset?.name?.toLowerCase().includes(search)
  )
  if (status) filtered = filtered.filter((w) => w.status === status)

  const total      = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start      = (page - 1) * limit
  const data       = filtered.slice(start, start + limit)

  return {
    data,
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  }
}

const useAllWorkOrders = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASWorkOrder[]>('workOrders')
      return rows.map(mapWo)
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

export const useCreateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<WorkOrder>) =>
      gasPost<{ success: boolean; wo_id: string }>('createWorkOrder', {
        wo_type: 'CM',
        asset_id: body.assetId ? 'AST-' + String(body.assetId).padStart(6, '0') : '',
        priority: body.priority?.toUpperCase() || 'MEDIUM',
        status: body.status?.toUpperCase() || 'OPEN',
        due_date: body.dueDate || '',
        description: body.title || body.description || '',
        problem_description: body.description || '',
        estimated_duration: body.estimatedHours ? String(body.estimatedHours) : '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<WorkOrder> & { id: number }) =>
      gasPost<{ success: boolean }>('updateWorkOrder', {
        wo_id: toWoId(id),
        updates: {
          priority: body.priority?.toUpperCase(),
          status: body.status?.toUpperCase(),
          due_date: body.dueDate,
          description: body.title || body.description,
          problem_description: body.description,
          estimated_duration: body.estimatedHours ? String(body.estimatedHours) : undefined,
          actual_duration: body.actualHours ? String(body.actualHours) : undefined,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteWorkOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deleteWorkOrder', { wo_id: toWoId(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const wos = await gasGet<GASWorkOrder[]>('workOrders')
      const statuses = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
      const byStatus = statuses.map((s) => ({
        status: s.toLowerCase(),
        _count: { status: wos.filter((w) => w.status === s).length },
      }))
      const open = wos.filter((w) => w.status === 'OPEN').length
      const overdue = wos.filter(
        (w) =>
          w.status !== 'COMPLETED' &&
          w.status !== 'CANCELLED' &&
          w.due_date &&
          new Date(w.due_date) < new Date()
      ).length
      return { open, overdue, byStatus }
    },
  })
