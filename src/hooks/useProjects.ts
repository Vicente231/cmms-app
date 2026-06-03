import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASProject } from '@/lib/api'
import type { Project, ProjectType, ProjectStatus, Discipline } from '@/types'

const KEY = 'projects'

function mapProject(p: GASProject): Project {
  return {
    id:          p.project_id,
    name:        p.name,
    type:        p.type as ProjectType,
    status:      (p.status?.toLowerCase() || 'planning') as ProjectStatus,
    plannedStart: p.planned_start || '',
    plannedEnd:   p.planned_end   || '',
    actualStart:  p.actual_start  || '',
    actualEnd:    p.actual_end    || '',
    assetsScope:  p.assets_scope  ? p.assets_scope.split(',').map(s => s.trim()).filter(Boolean) : [],
    description:  p.description   || '',
    createdBy:    p.created_by    || '',
    createdAt:    p.created_at    || '',
  }
}

export const useProjects = () => {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASProject[]>('projects')
      return rows.map(mapProject)
    },
  })
}

export const useProject = (id: string) => {
  const query = useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const rows = await gasGet<GASProject[]>('projects')
      return rows.map(mapProject)
    },
    enabled: !!id,
  })
  return { data: (query.data ?? []).find(p => p.id === id) ?? null, isLoading: query.isLoading }
}

export type ProjectFormData = {
  name: string
  type: ProjectType
  planned_start: string
  planned_end: string
  assets_scope: string[]
  description: string
}

export const useCreateProject = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProjectFormData) =>
      gasPost<{ success: boolean; project_id: string }>('createProject', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateProject = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProjectFormData> & { status?: ProjectStatus; actual_start?: string; actual_end?: string } }) =>
      gasPost<{ success: boolean }>('updateProject', { project_id: id, updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteProject = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      gasPost<{ success: boolean }>('deleteProject', { project_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const PROJECT_TYPES: ProjectType[] = [
  'Maintenance Shutdown', 'New Installation', 'Commissioning',
  'Inspection', 'Emergency Repair', 'Upgrade / Retrofit',
]

export const PROJECT_STATUSES: ProjectStatus[] = ['planning', 'active', 'completed', 'cancelled']

export const DISCIPLINES: Discipline[] = [
  'Mechanical', 'Electrical', 'Instrumentation', 'Civil', 'Contractor', 'Other',
]

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const PROJECT_TYPE_COLORS: Record<ProjectType, string> = {
  'Maintenance Shutdown': 'bg-orange-100 text-orange-800',
  'New Installation':     'bg-purple-100 text-purple-800',
  'Commissioning':        'bg-teal-100 text-teal-800',
  'Inspection':           'bg-sky-100 text-sky-800',
  'Emergency Repair':     'bg-red-100 text-red-800',
  'Upgrade / Retrofit':   'bg-indigo-100 text-indigo-800',
}
