import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Wrench, Calendar, Box, ShoppingCart, MapPin,
  Users, Settings, ChevronDown, Building2, Shield, Tag, AlertTriangle,
  TruckIcon, ClipboardList, BarChart3, X, ChevronLeft, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Assets', href: '/assets', icon: Package },
  { label: 'Work Orders', href: '/work-orders', icon: Wrench },
  {
    label: 'Preventive Maintenance', icon: Calendar, children: [
      { label: 'PM Schedules', href: '/pm-schedules', icon: Calendar },
      { label: 'Maintenance Tasks', href: '/maintenance-tasks', icon: ClipboardList },
    ],
  },
  {
    label: 'Inventory', icon: Box, children: [
      { label: 'Parts', href: '/inventory/parts', icon: Box },
      { label: 'Transactions', href: '/inventory/transactions', icon: BarChart3 },
    ],
  },
  {
    label: 'Purchasing', icon: ShoppingCart, children: [
      { label: 'Vendors', href: '/purchasing/vendors', icon: TruckIcon },
      { label: 'Purchase Orders', href: '/purchasing/orders', icon: ClipboardList },
    ],
  },
  { label: 'Locations', href: '/locations', icon: MapPin },
  {
    label: 'Settings', icon: Settings, children: [
      { label: 'Organization', href: '/settings/organization', icon: Building2 },
      { label: 'Users', href: '/settings/users', icon: Users },
      { label: 'Roles', href: '/settings/roles', icon: Shield },
      { label: 'Teams', href: '/settings/teams', icon: Users },
      { label: 'Asset Categories', href: '/settings/asset-categories', icon: Tag },
      { label: 'Work Order Types', href: '/settings/work-order-types', icon: Wrench },
      { label: 'Failure Codes', href: '/settings/failure-codes', icon: AlertTriangle },
      { label: 'Parts Categories', href: '/settings/parts-categories', icon: Tag },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function NavItemComponent({ item, depth = 0, collapsed }: { item: NavItem; depth?: number; collapsed: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const Icon = item.icon

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            collapsed && 'lg:justify-center lg:px-2'
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>{item.label}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform shrink-0', expanded && 'rotate-180', collapsed && 'lg:hidden')} />
        </button>
        <div className={cn('ml-4 mt-1 space-y-1', (!expanded || collapsed) && 'lg:hidden', !expanded && 'hidden')}>
          {item.children.map((child) => (
            <NavItemComponent key={child.href} item={child} depth={depth + 1} collapsed={collapsed} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <NavLink
      to={item.href!}
      end={item.href === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'lg:justify-center lg:px-2',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
      title={item.label}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-all duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-16'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className={cn('flex items-center gap-2', collapsed && 'lg:hidden')}>
            <Wrench className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">CMMS</span>
          </div>
          <Wrench className={cn('h-6 w-6 text-primary hidden', collapsed && 'lg:block')} />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={onToggleCollapse}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <nav className={cn('flex-1 overflow-y-auto p-4 space-y-1', collapsed && 'lg:px-2')}>
          {navItems.map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </aside>
    </>
  )
}
