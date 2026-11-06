import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAll } from '@/lib/supabase'
import { gasPost } from '@/lib/api'
import type { GASWorkRequest, GASWorkRequestItem } from '@/lib/api'
import type { WorkRequest, WorkRequestItem, WrStatus, WrItemStatus, WrItemType, WoPriority } from '@/types'

const KEY       = 'work-requests'
const ITEMS_KEY = 'wr-items'

function mapWR(r: GASWorkRequest): WorkRequest {
  return {
    id:              r.wr_id,
    assetId:         r.asset_id        || '',
    assetName:       r.asset_name      || '',
    assetLocation:   r.asset_location  || '',
    description:     r.description     || '',
    priority:        (r.priority?.toLowerCase() as WoPriority) || 'medium',
    requestedBy:     r.requested_by    || '',
    requestDate:     r.request_date    || '',
    status:          (r.status?.toLowerCase() as WrStatus) || 'reported',
    convertedToWo:   r.converted_to_wo || '',
    imageUrls:       (() => { try { return JSON.parse(r.image_urls || '[]') } catch { return [] } })(),
    notes:           r.notes           || '',
    department:      r.department      || '',
    contactPhone:    r.contact_phone   || '',
    requestType:     r.request_type    || '',
    failureMode:     r.failure_mode    || '',
    machineDown:     r.machine_down === true || r.machine_down === 'true' || r.machine_down === 'TRUE',
    productionImpact: r.production_impact || '',
    safetyConcern:   r.safety_concern === true || r.safety_concern === 'true' || r.safety_concern === 'TRUE',
    safetyDetail:    r.safety_detail   || '',
    preferredDate:   r.preferred_date  || '',
  }
}

function mapItem(r: GASWorkRequestItem): WorkRequestItem {
  return {
    itemId:      r.item_id,
    wrId:        r.wr_id,
    itemType:    (r.item_type as WrItemType) || 'part',
    description: r.description || '',
    quantity:    r.quantity    || '',
    unit:        r.unit        || '',
    supplier:    r.supplier    || '',
    status:      (r.status?.toLowerCase() as WrItemStatus) || 'pending',
    notes:       r.notes       || '',
  }
}

async function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale  = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width  = img.width  * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }
      img.src = e.target!.result as string
      img.onerror = reject
    }
    reader.readAsDataURL(file)
    reader.onerror = reject
  })
}

const useAllWorkRequests = () =>
  useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const data = await fetchAll<GASWorkRequest>('work_requests')
      return data.map(mapWR)
    },
  })

export const useWorkRequests = (statusFilter?: string) => {
  const query = useAllWorkRequests()
  const all   = query.data ?? []
  const data  = statusFilter ? all.filter(r => r.status === statusFilter) : all
  return { ...query, data }
}

export const useWorkRequest = (id: string) => {
  const query = useAllWorkRequests()
  return { ...query, data: (query.data ?? []).find(r => r.id === id) ?? null }
}

export const useCreateWorkRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      asset_id: string
      asset_name: string
      asset_location: string
      description: string
      priority: string
      image_urls: string[]
      department: string
      contact_phone: string
      request_type: string
      failure_mode: string
      machine_down: boolean
      production_impact: string
      safety_concern: boolean
      safety_detail: string
      preferred_date: string
    }) => {
      const { error } = await supabase.from('work_requests').insert({
        ...body,
        request_date: new Date().toISOString().split('T')[0],
        status: 'reported',
        image_urls: JSON.stringify(body.image_urls || []),
      })
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateWorkRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('work_requests').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('wr_id', id)
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteWorkRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('work_requests').delete().eq('wr_id', id)
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useWorkRequestItems = (wrId: string) =>
  useQuery({
    queryKey: [ITEMS_KEY, wrId],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_request_items').select('*').eq('wr_id', wrId)
      if (error) throw error
      return (data ?? []).map(mapItem)
    },
    enabled: !!wrId,
  })

export const useCreateWorkRequestItem = (wrId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      item_type: WrItemType
      description: string
      quantity: string
      unit: string
      supplier: string
      notes: string
    }) => {
      const { data, error } = await supabase.from('work_request_items').insert({
        wr_id: wrId, ...body, status: 'pending',
      }).select('item_id').single()
      if (error) throw error
      return { success: true, item_id: data.item_id }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ITEMS_KEY, wrId] }),
  })
}

export const useUpdateWorkRequestItem = (wrId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('work_request_items').update(updates).eq('item_id', itemId)
      if (error) throw error
      return { success: true }
    },
    onMutate: async ({ itemId, updates }) => {
      await qc.cancelQueries({ queryKey: [ITEMS_KEY, wrId] })
      const previous = qc.getQueryData<WorkRequestItem[]>([ITEMS_KEY, wrId])
      qc.setQueryData<WorkRequestItem[]>([ITEMS_KEY, wrId], old =>
        (old ?? []).map(i => i.itemId === itemId ? { ...i, ...updates, status: (updates.status as WrItemStatus) ?? i.status } : i)
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData([ITEMS_KEY, wrId], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [ITEMS_KEY, wrId] }),
  })
}

export const useDeleteWorkRequestItem = (wrId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('work_request_items').delete().eq('item_id', itemId)
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [ITEMS_KEY, wrId] }),
  })
}

export const useUploadImage = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const base64 = await compressImage(file)
      const res = await gasPost<{ success: boolean; url: string; error?: string }>(
        'uploadImage',
        { base64, mimeType: 'image/jpeg', filename: `WR_${Date.now()}.jpg` }
      )
      if (!res.success || !res.url) throw new Error(res.error ?? 'Upload failed')
      return { success: true, url: res.url, id: Date.now().toString() }
    },
  })
