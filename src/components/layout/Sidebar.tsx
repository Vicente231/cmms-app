import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Wrench, Calendar, Box, ShoppingCart, MapPin,
  Users, Settings, ChevronDown, Building2, Shield, Tag, AlertTriangle,
  TruckIcon, ClipboardList, BarChart3, X
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
  { label: 'PM Schedules', href: '/pm-schedules', icon: Calendar },
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
}

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const Icon = item.icon

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
        {expanded && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children.map((child) => (
              <NavItemComponent key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
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
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">CMMS</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} />
          ))}
        </nav>
      </aside>
    </>
  )
}
