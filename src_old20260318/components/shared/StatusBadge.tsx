import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AssetStatus, WoStatus, WoPriority, PoStatus } from '@/types'

const woStatusConfig: Record<WoStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  on_hold: { label: 'On Hold', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const priorityConfig: Record<WoPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
}

const assetStatusConfig: Record<AssetStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800 border-green-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  decommissioned: { label: 'Decommissioned', className: 'bg-red-100 text-red-700 border-red-200' },
  under_maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
}

const poStatusConfig: Record<PoStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ordered: { label: 'Ordered', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  partially_received: { label: 'Partial', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  received: { label: 'Received', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
}

interface StatusBadgeProps {
  type: 'wo' | 'priority' | 'asset' | 'po'
  value: string
  className?: string
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  let config: { label: string; className: string } | undefined

  if (type === 'wo') config = woStatusConfig[value as WoStatus]
  else if (type === 'priority') config = priorityConfig[value as WoPriority]
  else if (type === 'asset') config = assetStatusConfig[value as AssetStatus]
  else if (type === 'po') config = poStatusConfig[value as PoStatus]

  if (!config) return <Badge variant="outline">{value}</Badge>

  return (
    <Badge className={cn('border font-medium', config.className, className)}>
      {config.label}
    </Badge>
  )
}
