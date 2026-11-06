import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { AssetDrawing } from '@/types'

const KEY = (assetId: number) => ['assetDrawings', assetId]

interface GASDrawing {
  drawing_id: string
  asset_id: string
  drawing_name: string
  revision: string
  file_type: string
  drive_file_id: string
  drive_url: string
  uploaded_date: string
}

function mapDrawing(r: GASDrawing): AssetDrawing {
  return {
    drawingId:    r.drawing_id    || '',
    assetId:      r.asset_id      || '',
    drawingName:  r.drawing_name  || '',
    revision:     r.revision      || '',
    fileType:     (r.file_type?.toLowerCase() === 'dwg' ? 'dwg' : 'pdf') as 'pdf' | 'dwg',
    driveFileId:  r.drive_file_id || '',
    driveUrl:     r.drive_url     || '',
    uploadedDate: r.uploaded_date || '',
  }
}

function toAssetId(id: number): string {
  return 'AST-' + String(id).padStart(6, '0')
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve((e.target!.result as string).split(',')[1])
    reader.readAsDataURL(file)
    reader.onerror = reject
  })
}

export function useAssetDrawings(assetId: number) {
  return useQuery({
    queryKey: KEY(assetId),
    queryFn: async () => {
      const res = await gasGet<{ data: GASDrawing[] }>('assetDrawings', { asset_id: toAssetId(assetId) })
      return (res.data ?? []).map(mapDrawing)
    },
    enabled: assetId > 0,
  })
}

export function useUploadDrawing(assetId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { file: File; drawingName: string; revision: string }) => {
      const ext      = params.file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
      const mimeType = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'
      const fileType = ext === 'pdf' ? 'pdf' : 'dwg'
      const base64   = await readFileAsBase64(params.file)
      return gasPost<{ success?: boolean; error?: string; drawing_id: string; drive_file_id: string; drive_url: string }>(
        'uploadDrawing',
        {
          asset_id:     toAssetId(assetId),
          drawing_name: params.drawingName,
          revision:     params.revision,
          file_type:    fileType,
          base64,
          filename:     params.file.name,
          mimeType,
        }
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(assetId) }),
  })
}

export function useDeleteAssetDrawing(assetId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { drawingId: string; driveFileId: string }) =>
      gasPost<{ success: boolean }>('deleteAssetDrawing', {
        drawing_id:    params.drawingId,
        drive_file_id: params.driveFileId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(assetId) }),
  })
}
