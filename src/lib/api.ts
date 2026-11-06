// Legacy GAS helpers — only used for Google Drive file operations (drawings, plat maps).
// All database operations now go through Supabase (src/lib/supabase.ts).

const GAS_URL = import.meta.env.VITE_API_URL ?? ''

/** GET to GAS (file-read operations only, no auth token) */
export async function gasGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res  = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as T
}

/** POST to GAS (file-upload operations only, no auth token) */
export async function gasPost<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data as T
}

// GAS row shapes — column names match Supabase table columns exactly.
// Hooks import these types to keep mapXxx() functions unchanged.

export interface GASUser {
  id: string
  name: string
  role: string
  email: string
  avatar: string
}

export interface GASProject {
  project_id: string
  name: string
  type: string
  status: string
  planned_start: string
  planned_end: string
  actual_start: string
  actual_end: string
  assets_scope: string
  description: string
  created_by: string
  created_at: string
}

export interface GASAsset {
  asset_id: string
  asset_name: string
  asset_type: string
  parent_asset: string
  feed_from: string
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
  completion_image_urls?: string
  completed_by?: string
  checklist: unknown[]
  project_id: string
  discipline: string
}

export interface GASMaintenanceTask {
  task_id: string
  asset_type: string
  description: string
  frequency: string
  safety: string
  estimated_duration: string
  measurement_unit?: string
  pass_condition?: string
  measurement_fields?: string
}

export interface GASWorkOrderTask {
  task_id: string
  wo_id: string
  template_task_id: string
  task_description: string
  is_completed: boolean | string
  completion_notes: string
  time_spent_minutes: string | number
  measurement_value: string | number
}

export interface GASWorkRequest {
  wr_id: string
  asset_id: string
  asset_name: string
  asset_location: string
  description: string
  priority: string
  requested_by: string
  request_date: string
  status: string
  converted_to_wo: string
  image_urls: string
  notes: string
  department: string
  contact_phone: string
  request_type: string
  failure_mode: string
  machine_down: string | boolean
  production_impact: string
  safety_concern: string | boolean
  safety_detail: string
  preferred_date: string
}

export interface GASWorkRequestItem {
  item_id: string
  wr_id: string
  item_type: string
  description: string
  quantity: string
  unit: string
  supplier: string
  status: string
  notes: string
}

export interface GASPMSchedule {
  pm_id: string
  name: string
  description: string
  target_type: string
  target_id: string
  priority: string
  frequency_value: string | number
  frequency_unit: string
  next_due_date: string
  last_generated_date: string
  estimated_hours: string | number
  is_active: string | boolean
  created_date: string
  task_ids: string
}

export type AppliesTo = 'asset' | 'part' | 'both'

export interface GASAssetType {
  type_code: string
  label: string
  icon: string
  color: string
  applies_to?: AppliesTo
}

export interface GASAssetTypeSchema {
  type_code: string
  field_key: string
  label: string
  data_type: string
  unit: string
  required: boolean
  options: string[]
  applies_to?: AppliesTo
  section?: string
  sort_order?: number
}

export interface GASPart {
  part_id: string
  part_number: string
  name: string
  description: string
  category: string
  unit: string
  unit_cost: string | number
  qty_on_hand: string | number
  min_qty: string | number
  max_qty: string | number
  location: string
  supplier: string
  is_active: string | boolean
  notes: string
  part_type?: string
  attrs?: Record<string, unknown> | null
}

export interface GASInventoryTransaction {
  tx_id: string
  part_id: string
  part_name: string
  part_number: string
  tx_type: string
  qty: string | number
  unit_cost: string | number
  balance_after: string | number
  wo_id: string
  reference: string
  notes: string
  created_at: string
}
