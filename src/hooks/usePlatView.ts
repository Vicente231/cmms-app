import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { PlatMap, PlatPin } from '@/types'

const MAPS_KEY = ['platMaps']
const PINS_KEY  = (mapId: string) => ['platPins', mapId]

interface GASPlatMap {
  map_id: string
  map_name: string
  drive_file_id: string
  drive_url: string
  uploaded_date: string
}

interface GASPlatPin {
  pin_id: string
  map_id: string
  asset_id: string
  x_pct: string | number
  y_pct: string | number
  label: string
}

function mapPlatMap(r: GASPlatMap): PlatMap {
  return {
    mapId:        r.map_id        || '',
    mapName:      r.map_name      || '',
    driveFileId:  r.drive_file_id || '',
    driveUrl:     r.drive_url     || '',
    uploadedDate: r.uploaded_date || '',
  }
}

function mapPlatPin(r: GASPlatPin): PlatPin {
  return {
    pinId:   r.pin_id   || '',
    mapId:   r.map_id   || '',
    assetId: r.asset_id || '',
    xPct:    parseFloat(String(r.x_pct)) || 0,
    yPct:    parseFloat(String(r.y_pct)) || 0,
    label:   r.label    || '',
  }
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve((e.target!.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function usePlatMaps() {
  return useQuery({
    queryKey: MAPS_KEY,
    queryFn:  async () => {
      const res = await gasGet<{ data: GASPlatMap[] }>('platMaps')
      return (res.data ?? []).map(mapPlatMap)
    },
  })
}

export function usePlatPins(mapId: string) {
  return useQuery({
    queryKey: PINS_KEY(mapId),
    queryFn:  async () => {
      const res = await gasGet<{ data: GASPlatPin[] }>('platPins', { map_id: mapId })
      return (res.data ?? []).map(mapPlatPin)
    },
    enabled: !!mapId,
  })
}

export function useUploadPlatMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { file: File; mapName: string }) => {
      const ext      = params.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
      const mimeType = mimeMap[ext] ?? 'image/jpeg'
      const base64   = await readFileAsBase64(params.file)
      return gasPost<{ success?: boolean; error?: string; map_id: string; drive_file_id: string; drive_url: string }>(
        'uploadPlatMap',
        { map_name: params.mapName, base64, filename: params.file.name, mimeType }
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAPS_KEY }),
  })
}

export function useCreatePlatPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { mapId: string; assetId: string; xPct: number; yPct: number; label?: string }) =>
      gasPost<{ success: boolean; pin_id: string }>('createPlatPin', {
        map_id:   params.mapId,
        asset_id: params.assetId,
        x_pct:    params.xPct.toFixed(4),
        y_pct:    params.yPct.toFixed(4),
        label:    params.label ?? '',
      }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: PINS_KEY(vars.mapId) }),
  })
}

export function useDeletePlatPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { pinId: string; mapId: string }) =>
      gasPost<{ success: boolean }>('deletePlatPin', { pin_id: params.pinId }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: PINS_KEY(vars.mapId) }),
  })
}

export function useDeletePlatMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { mapId: string; driveFileId: string }) =>
      gasPost<{ success: boolean }>('deletePlatMap', { map_id: params.mapId, drive_file_id: params.driveFileId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MAPS_KEY }),
  })
}
