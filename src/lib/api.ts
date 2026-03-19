import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

function getToken(): string | null {
  return useAuthStore.getState().token
}

/** GET request — action + params as query string, no custom headers → no CORS preflight */
export async function gasGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const token = getToken()
  const url = new URL(BASE_URL)
  url.searchParams.set('action', action)
  if (token) url.searchParams.set('token', token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as T
}

/** POST request — action + token inside JSON body, Content-Type: text/plain → no CORS preflight */
export async function gasPost<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getToken()
  const body: Record<string, unknown> = { action, ...payload }
  if (token) body.token = token

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as T
}

// ── GAS entity shapes ─────────────────────────────────────────────────────────

export interface GASUser {
  id: string
  name: string
  role: string
  email: string
  avatar: string
}

export interface GASAsset {
  asset_id: string
  asset_name: string
  asset_type: string
  parent_asset: string
  location: string
  criticality: string
  status: string
  manufacturer: string
  vendor: string
  part_number: string
  serial_number: string
  install_date: string
  warranty_expiry: string
  last_pm_date: string
  notes: string
  attrs: Record<string, unknown>
}

export interface GASWorkOrder {
  wo_id: string
  wo_type: string
  asset_id: string
  assigned_to: string
  created_by: string
  priority: string
  status: string
  due_date: string
  estimated_duration: string
  actual_duration: string
  safety_condition: string
  description: string
  problem_description: string
  diagnosis: string
  corrective_action: string
  completion_notes: string
  checklist: unknown[]
}

export interface GASMaintenanceTask {
  task_id: string
  asset_type: string
  description: string
  frequency: string
  safety: string
  estimated_duration: string
}

export interface GASWorkRequest {
  wr_id: string
  asset_id: string
  asset_name: string
  description: string
  priority: string
  requested_by: string
  request_date: string
  status: string
  converted_to_wo: string
}

export interface GASAssetType {
  type_code: string
  label: string
  icon: string
  color: string
}

export interface GASAssetTypeSchema {
  type_code: string
  field_key: string
  label: string
  data_type: string
  unit: string
  required: boolean
  options: string[]
}
