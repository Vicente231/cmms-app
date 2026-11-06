import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

const BUCKET = 'part-files'
const KEY = (partId: string) => ['part-documents', partId]

export const DOC_TYPES = [
  'Manual', 'Datasheet', 'Wiring Diagram', 'Drawing', '3D Model', 'CAD', 'Certificate', 'Photo', 'Other',
] as const

export const MAX_FILE_MB = 50

export interface PartDocument {
  id: number
  partId: string
  docType: string
  title: string
  revision: string
  kind: 'file' | 'link'
  url: string
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  createdAt: string
}

function mapDoc(r: Record<string, unknown>): PartDocument {
  return {
    id:          Number(r.doc_id),
    partId:      String(r.part_id || ''),
    docType:     String(r.doc_type || 'Other'),
    title:       String(r.title || ''),
    revision:    String(r.revision || ''),
    kind:        r.kind === 'link' ? 'link' : 'file',
    url:         String(r.url || ''),
    storagePath: String(r.storage_path || ''),
    fileName:    String(r.file_name || ''),
    fileSize:    Number(r.file_size) || 0,
    mimeType:    String(r.mime_type || ''),
    uploadedBy:  String(r.uploaded_by || ''),
    createdAt:   String(r.created_at || ''),
  }
}

/** How a document can be shown inside the app. */
export function previewKind(d: PartDocument): 'pdf' | 'image' | 'none' {
  if (d.kind === 'link') return 'none'
  const ext = d.fileName.split('.').pop()?.toLowerCase() ?? ''
  if (d.mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (d.mimeType.startsWith('image/') || ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  return 'none'
}

/** Signed URL for a stored file (bucket is private). */
export async function getDocumentUrl(d: PartDocument, download = false): Promise<string> {
  if (d.kind === 'link') return d.url
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(d.storagePath, 60 * 60, download ? { download: d.fileName } : undefined)
  if (error) throw error
  return data.signedUrl
}

export function usePartDocuments(partId: string) {
  return useQuery({
    queryKey: KEY(partId),
    queryFn: async () => {
      const { data, error } = await supabase.from('part_documents')
        .select('*').eq('part_id', partId).order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapDoc)
    },
    enabled: !!partId,
  })
}

export function useUploadPartDocument(partId: string) {
  const qc = useQueryClient()
  const userName = useAuthStore(s => s.user?.name || '')
  return useMutation({
    mutationFn: async (p: { file: File; title: string; docType: string; revision: string }) => {
      if (p.file.size > MAX_FILE_MB * 1024 * 1024) {
        throw new Error(`File is larger than ${MAX_FILE_MB} MB — add it as a link instead`)
      }
      const safeName = p.file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${partId}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from(BUCKET)
        .upload(path, p.file, { contentType: p.file.type || 'application/octet-stream' })
      if (upErr) throw upErr

      const { error } = await supabase.from('part_documents').insert({
        part_id:      partId,
        doc_type:     p.docType,
        title:        p.title || p.file.name,
        revision:     p.revision,
        kind:         'file',
        storage_path: path,
        file_name:    p.file.name,
        file_size:    p.file.size,
        mime_type:    p.file.type,
        uploaded_by:  userName,
      })
      if (error) {
        await supabase.storage.from(BUCKET).remove([path])
        throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(partId) }),
  })
}

export function useAddPartLink(partId: string) {
  const qc = useQueryClient()
  const userName = useAuthStore(s => s.user?.name || '')
  return useMutation({
    mutationFn: async (p: { url: string; title: string; docType: string; revision: string }) => {
      const url = /^https?:\/\//i.test(p.url) ? p.url : `https://${p.url}`
      const { error } = await supabase.from('part_documents').insert({
        part_id:     partId,
        doc_type:    p.docType,
        title:       p.title || url,
        revision:    p.revision,
        kind:        'link',
        url,
        uploaded_by: userName,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(partId) }),
  })
}

export function useDeletePartDocument(partId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: PartDocument) => {
      if (d.kind === 'file' && d.storagePath) {
        const { error: stErr } = await supabase.storage.from(BUCKET).remove([d.storagePath])
        if (stErr) throw stErr
      }
      const { error } = await supabase.from('part_documents').delete().eq('doc_id', d.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(partId) }),
  })
}
