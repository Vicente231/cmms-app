import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GASPMSchedule, GASMaintenanceTask } from '@/lib/api'
import type { PmSchedule, PaginatedResponse } from '@/types'

const KEY = 'pm-schedules'

function idNum(pm_id: string): number {
  return parseInt(pm_id?.replace('PM-', '') || '0', 10) || 0
}

function toPmId(id: number): string {
  return 'PM-' + String(id).padStart(6, '0')
}

function mapPM(p: GASPMSchedule): PmSchedule {
  return {
    id: idNum(p.pm_id),
    orgId: 0,
    name: p.name,
    description: p.description,
    targetType: (p.target_type as PmSchedule['targetType']) || 'group',
    targetId: String(p.target_id || ''),
    taskIds: (() => { try { const v = p.task_ids; if (!v) return []; const s = String(v).trim(); if (s.startsWith('[')) return JSON.parse(s) as string[]; return s.split(',').filter(Boolean) } catch { return [] } })(),
    triggerType: 'time_based',
    priority: (p.priority?.toLowerCase() as PmSchedule['priority']) || 'medium',
    frequencyValue: Number(p.frequency_value) || 1,
    frequencyUnit: p.frequency_unit || 'months',
    nextDueDate: p.next_due_date ? String(p.next_due_date).split('T')[0] : undefined,
    lastGeneratedAt: p.last_generated_date ? String(p.last_generated_date).split('T')[0] : undefined,
    estimatedHours: p.estimated_hours ? parseFloat(String(p.estimated_hours)) : undefined,
    isActive: p.is_active === true || String(p.is_active).toUpperCase() === 'TRUE',
    createdAt: p.created_date || '',
    updatedAt: '',
  }
}

const useAllPMSchedules = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_schedules').select('*')
      if (error) throw error
      return (data ?? []).map(mapPM)
    },
  })

export const usePMSchedules = (_params?: Record<string, string | number>) => {
  const query = useAllPMSchedules()
  const all = query.data ?? []
  const data: PaginatedResponse<PmSchedule> = {
    data: all,
    pagination: { total: all.length, page: 1, limit: all.length || 20, totalPages: 1, hasNext: false, hasPrev: false },
  }
  return { ...query, data }
}

export const useCreatePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PmSchedule>) => {
      const { data, error } = await supabase.from('pm_schedules').insert({
        name:               body.name || '',
        description:        body.description || '',
        target_type:        body.targetType || 'asset',
        target_id:          Array.isArray(body.targetId) ? (body.targetId as string[]).join(',') : (body.targetId || ''),
        task_ids:           JSON.stringify(Array.isArray(body.taskIds) ? body.taskIds : []),
        priority:           body.priority?.toUpperCase() || 'MEDIUM',
        frequency_value:    body.frequencyValue ?? 1,
        frequency_unit:     body.frequencyUnit || 'months',
        next_due_date:      body.nextDueDate || '',
        estimated_hours:    body.estimatedHours ?? null,
        is_active:          body.isActive !== false,
        created_date:       new Date().toISOString().split('T')[0],
      }).select('pm_id').single()
      if (error) throw error
      return { success: true, pm_id: data.pm_id }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdatePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<PmSchedule> & { id: number }) => {
      const { error } = await supabase.from('pm_schedules').update({
        name:           body.name,
        description:    body.description,
        target_type:    body.targetType,
        target_id:      Array.isArray(body.targetId) ? (body.targetId as string[]).join(',') : body.targetId,
        task_ids:       body.taskIds !== undefined ? JSON.stringify(Array.isArray(body.taskIds) ? body.taskIds : []) : undefined,
        priority:       body.priority?.toUpperCase(),
        frequency_value: body.frequencyValue,
        frequency_unit:  body.frequencyUnit,
        next_due_date:   body.nextDueDate,
        estimated_hours: body.estimatedHours,
        is_active:       body.isActive,
        updated_at:      new Date().toISOString(),
      }).eq('pm_id', toPmId(id))
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeletePMSchedule = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('pm_schedules').delete().eq('pm_id', toPmId(id))
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useMaintenanceTasks = () =>
  useQuery({
    queryKey: ['maintenance-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('maintenance_tasks').select('*')
      if (error) throw error
      return (data ?? []) as GASMaintenanceTask[]
    },
  })

// Re-export useGenerateWO from useWorkOrders to keep compatibility
export { useGenerateWO } from './useWorkOrders'
