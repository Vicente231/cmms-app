export type AssetStatus = 'active' | 'inactive' | 'decommissioned' | 'under_maintenance'
export type WoStatus = 'open' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
export type WoPriority = 'low' | 'medium' | 'high' | 'critical'
export type PmTriggerType = 'time_based' | 'meter_based' | 'both'
export type PoStatus = 'draft' | 'submitted' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled'
export type TransactionType = 'received' | 'issued' | 'adjustment' | 'return' | 'transfer'
export type MeterType = 'incremental' | 'absolute'

export interface Organization {
  id: number
  name: string
  timezone: string
  currency: string
  address?: string
  phone?: string
  email?: string
  logoUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: number
  orgId: number
  parentId?: number
  parent?: { id: number; name: string }
  children?: { id: number; name: string }[]
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  zip?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Role {
  id: number
  name: string
  description?: string
  permissions: Record<string, unknown>
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: number
  orgId: number
  roleId?: number
  role?: { id: number; name: string }
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  hourlyRate?: number
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface Team {
  id: number
  orgId: number
  name: string
  description?: string
  members: TeamMember[]
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  id: number
  teamId: number
  userId: number
  user: { id: number; firstName: string; lastName: string; email: string }
  createdAt: string
}

export interface AssetCategory {
  id: number
  parentId?: number
  parent?: { id: number; name: string }
  children?: { id: number; name: string }[]
  name: string
  description?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

export interface Asset {
  id: number
  orgId: number
  locationId?: number
  location?: { id: number; name: string }
  categoryId?: number
  category?: { id: number; name: string }
  parentAssetId?: number
  parentAsset?: { id: number; name: string; assetTag?: string }
  childAssets?: { id: number; name: string; assetTag?: string; status: AssetStatus }[]
  assignedTo?: number
  assignedUser?: { id: number; firstName: string; lastName: string }
  name: string
  assetTag?: string
  serialNumber?: string
  model?: string
  criticality?: string
  manufacturer?: string
  purchaseDate?: string
  purchaseCost?: number
  warrantyExpiry?: string
  status: AssetStatus
  description?: string
  qrCode?: string
  customFields?: AssetCustomField[]
  meters?: AssetMeter[]
  createdAt: string
  updatedAt: string
}

export interface AssetCustomField {
  id: number
  assetId: number
  fieldName: string
  fieldValue?: string
  createdAt: string
  updatedAt: string
}

export interface AssetMeter {
  id: number
  assetId: number
  name: string
  unit: string
  meterType: MeterType
  currentValue: number
  readings?: MeterReading[]
  createdAt: string
  updatedAt: string
}

export interface MeterReading {
  id: number
  meterId: number
  recordedBy?: number
  recordedByUser?: { id: number; firstName: string; lastName: string }
  value: number
  readingDate: string
  notes?: string
  createdAt: string
}

export interface WorkOrderType {
  id: number
  orgId: number
  name: string
  color: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface FailureCode {
  id: number
  orgId: number
  code: string
  description?: string
  category?: string
  createdAt: string
  updatedAt: string
}

export interface WorkOrder {
  id: number
  orgId: number
  assetId?: number
  asset?: { id: number; name: string; assetTag?: string }
  locationId?: number
  location?: { id: number; name: string }
  typeId?: number
  type?: { id: number; name: string; color: string }
  requestedBy?: number
  requester?: { id: number; firstName: string; lastName: string }
  assignedTo?: number
  assignee?: { id: number; firstName: string; lastName: string }
  teamId?: number
  team?: { id: number; name: string }
  failureCodeId?: number
  failureCode?: { id: number; code: string; description?: string }
  pmId?: number
  woNumber: string
  title: string
  description?: string
  status: WoStatus
  priority: WoPriority
  requestedDate: string
  dueDate?: string
  startedAt?: string
  completedAt?: string
  estimatedHours?: number
  actualHours?: number
  totalCost: number
  requiresDowntime: boolean
  tasks?: WoTask[]
  labor?: WoLabor[]
  partsUsed?: WoPartsUsed[]
  createdAt: string
  updatedAt: string
}

export interface WoTask {
  id: number
  woId: number
  description: string
  isCompleted: boolean
  sortOrder: number
  completedBy?: number
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WoLabor {
  id: number
  woId: number
  userId?: number
  user?: { id: number; firstName: string; lastName: string }
  startTime: string
  endTime?: string
  hours?: number
  cost?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WoPartsUsed {
  id: number
  woId: number
  partId: number
  part?: { id: number; name: string; partNumber?: string }
  quantity: number
  unitCost: number
  totalCost: number
  createdAt: string
  updatedAt: string
}

export interface DowntimeLog {
  id: number
  woId?: number
  workOrder?: { id: number; woNumber: string }
  assetId: number
  asset?: { id: number; name: string; assetTag?: string }
  startedById?: number
  startedBy?: { id: number; firstName: string; lastName: string }
  endedById?: number
  endedBy?: { id: number; firstName: string; lastName: string }
  startTime: string
  endTime?: string
  durationHours?: number
  reason?: string
  createdAt: string
  updatedAt: string
}

export interface PmSchedule {
  id: number
  orgId: number
  assetId?: number
  asset?: { id: number; name: string; assetTag?: string }
  locationId?: number
  location?: { id: number; name: string }
  teamId?: number
  team?: { id: number; name: string }
  assignedTo?: number
  assignedUser?: { id: number; firstName: string; lastName: string }
  typeId?: number
  type?: { id: number; name: string; color: string }
  name: string
  description?: string
  targetType?: 'asset' | 'asset_type' | 'location' | 'group'
  targetId?: string
  taskIds?: string[]
  triggerType: PmTriggerType
  priority: WoPriority
  frequencyValue: number
  frequencyUnit: string
  meterTriggerId?: number
  meterThreshold?: number
  nextDueDate?: string
  lastGeneratedAt?: string
  estimatedHours?: number
  isActive: boolean
  tasks?: PmTask[]
  parts?: PmPart[]
  createdAt: string
  updatedAt: string
}

export interface PmTask {
  id: number
  pmId: number
  description: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PmPart {
  id: number
  pmId: number
  partId: number
  part?: { id: number; name: string; partNumber?: string }
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface PartsCategory {
  id: number
  parentId?: number
  parent?: { id: number; name: string }
  children?: { id: number; name: string }[]
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Part {
  id: number
  orgId: number
  categoryId?: number
  category?: { id: number; name: string }
  preferredVendorId?: number
  preferredVendor?: { id: number; name: string }
  partNumber?: string
  name: string
  description?: string
  unitOfMeasure: string
  unitCost: number
  quantityOnHand: number
  minimumQuantity: number
  reorderQuantity: number
  storageLocation?: string
  barcode?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryTransaction {
  id: number
  partId: number
  part?: { id: number; name: string; partNumber?: string }
  performedBy?: number
  performer?: { id: number; firstName: string; lastName: string }
  woId?: number
  workOrder?: { id: number; woNumber: string }
  poLineId?: number
  transactionType: TransactionType
  quantity: number
  unitCost?: number
  balanceAfter: number
  referenceNumber?: string
  notes?: string
  transactionDate: string
  createdAt: string
}

export interface Vendor {
  id: number
  orgId: number
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  taxId?: string
  paymentTerms: number
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrder {
  id: number
  orgId: number
  vendorId: number
  vendor?: { id: number; name: string }
  requestedBy?: number
  requester?: { id: number; firstName: string; lastName: string }
  approvedBy?: number
  approver?: { id: number; firstName: string; lastName: string }
  poNumber: string
  status: PoStatus
  orderDate?: string
  expectedDate?: string
  receivedDate?: string
  subtotal: number
  tax: number
  total: number
  notes?: string
  shippingAddress?: string
  lines?: PoLine[]
  createdAt: string
  updatedAt: string
}

export interface PoLine {
  id: number
  poId: number
  partId?: number
  part?: { id: number; name: string; partNumber?: string }
  description?: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: number
  totalCost: number
  createdAt: string
  updatedAt: string
}

export interface Attachment {
  id: number
  orgId: number
  entityType: string
  entityId: number
  fileName: string
  fileUrl: string
  mimeType?: string
  fileSize?: number
  uploadedBy?: number
  uploader?: { id: number; firstName: string; lastName: string }
  createdAt: string
}

export interface WorkOrderTask {
  taskId: string
  woId: string
  templateTaskId: string
  description: string
  isCompleted: boolean
  completionNotes: string
  timeSpentMinutes: number | null
  measurementValue: string
  measurementUnit?: string
  passCondition?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}
