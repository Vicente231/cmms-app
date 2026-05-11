import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASWorkRequest, GASWorkRequestItem } from '@/lib/api'
import type { WorkRequest, WorkRequestItem, WrStatus, WrItemStatus, WrItemType, WoPriority } from '@/types'

const KEY       = 'work-requests'
const ITEMS_KEY = 'wr-items'

function mapWR(r: GASWorkRequest): WorkRequest {
  return {
    id:            r.wr_id,
    assetId:       r.asset_id       || '',
    assetName:     r.asset_name     || '',
    description:   r.description    || '',
    priority:      (r.priority?.toLowerCase() as WoPriority) || 'medium',
    requestedBy:   r.requested_by   || '',
    requestDate:   r.request_date   || '',
    status:        (r.status?.toLowerCase() as WrStatus) || 'reported',
    convertedToWo: r.converted_to_wo || '',
    imageUrls:     (() => { try { return JSON.parse(r.image_urls || '[]') } catch { return [] } })(),
    notes:         r.notes          || '',
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
      const rows = await gasGet<GASWorkRequest[]>('workRequests')
      return rows.map(mapWR)
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
    mutationFn: (body: {
      asset_id: string
      asset_name: string
      description: string
      priority: string
      image_urls: string[]
    }) => gasPost<{ success: boolean; wr_id: string }>('createWorkRequest', {
      ...body,
      image_urls: JSON.stringify(body.image_urls || []),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useUpdateWorkRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) =>
      gasPost<{ success: boolean }>('updateWorkRequest', { wr_id: id, updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useDeleteWorkRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      gasPost<{ success: boolean }>('deleteWorkRequest', { wr_id: id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export const useWorkRequestItems = (wrId: string) =>
  useQuery({
    queryKey: [ITEMS_KEY, wrId],
    queryFn: async () => {
      const rows = await gasGet<GASWorkRequestItem[]>('workRequestItems')
      return rows.filter(r => r.wr_id === wrId).map(mapItem)
    },
    enabled: !!wrId,
  })

export const useCreateWorkRequestItem = (wrId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      item_type: WrItemType
      description: string
      quantity: string
      unit: string
      supplier: string
      notes: string
    }) => gasPost<{ success: boolean; item_id: string }>('createWorkRequestItem', {
      wr_id: wrId, ...body, status: 'pending',
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ITEMS_KEY, wrId] }),
  })
}

export const useUpdateWorkRequestItem = (wrId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Record<string, unknown> }) =>
      gasPost<{ success: boolean }>('updateWorkRequestItem', { item_id: itemId, updates }),
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
    mutationFn: (itemId: string) =>
      gasPost<{ success: boolean }>('deleteWorkRequestItem', { item_id: itemId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [ITEMS_KEY, wrId] }),
  })
}

export const useUploadImage = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const base64 = await compressImage(file)
      return gasPost<{ success: boolean; url: string; id: string }>('uploadImage', {
        base64,
        filename: file.name,
        mimeType: 'image/jpeg',
      })
    },
  })
