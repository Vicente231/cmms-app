import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASMaintenanceTask } from '@/lib/api'
import type { PmSchedule, PaginatedResponse } from '@/types'

const KEY = 'pm-schedules'

function idNum(task_id: string): number {
  return parseInt(task_id?.replace('MT-', '') || '0', 10) || 0
}

function mapTask(t: GASMaintenanceTask): PmSchedule {
  return {
    id: idNum(t.task_id),
    orgId: 0,
    name: t.description,
    description: t.safety,
    triggerType: 'time_based',
    priority: 'medium',
    frequencyValue: 1,
    frequencyUnit: t.frequency || 'Monthly',
    estimatedHours: t.estimated_duration ? parseFloat(t.estimated_duration) : undefined,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

function toPaged(items: PmSchedule[]): PaginatedResponse<PmSchedule> {
  return {
    data: items,
    pagination: { total: items.length, page: 1, limit: items.length, totalPages: 1, hasNext: false, hasPrev: false },
  }
}

export const usePMSchedules = (_params?: Record<string, string | number>) =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASMaintenanceTask[]>('maintenanceTasks')
      return toPaged(rows.map(mapTask))
    },
  })

export const usePMSchedule = (id: number) =>
  useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const rows = await gasGet<GASMaintenanceTask[]>('maintenanceTasks')
      const found = rows.find((t) => idNum(t.task_id) === id)
      return found ? mapTask(found) : null
    },
    enabled: !!id,
  })

export const useCreatePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PmSchedule>) =>
      gasPost<{ success: boolean }>('createMaintenanceTask', {
        asset_type: '',
        description: body.name || body.description || '',
        frequency: body.frequencyUnit || 'Monthly',
        safety: body.description || '',
        estimated_duration: body.estimatedHours ? String(body.estimatedHours) : '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PmSchedule> & { id: number }) =>
      gasPost<{ success: boolean }>('updateMaintenanceTask', {
        task_id: 'MT-' + String(id).padStart(4, '0'),
        updates: {
          description: body.name || body.description,
          frequency: body.frequencyUnit,
          estimated_duration: body.estimatedHours ? String(body.estimatedHours) : undefined,
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      gasPost<{ success: boolean }>('deleteMaintenanceTask', { task_id: 'MT-' + String(id).padStart(4, '0') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useGenerateWO = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_pmId: number) => ({ success: false, message: 'Not supported' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}
