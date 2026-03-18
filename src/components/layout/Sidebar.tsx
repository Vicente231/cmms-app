import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Wrench, Calendar, Box, ShoppingCart, MapPin,
  Users, Settings, ChevronDown, Building2, Shield, Tag, AlertTriangle,
  TruckIcon, ClipboardList, BarChart3, X, ChevronsLeft, ChevronsRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

interface NavItemComponentProps {
  item: NavItem
  depth?: number
  collapsed: boolean
}

function NavItemComponent({ item, depth = 0, collapsed }: NavItemComponentProps) {
  const [expanded, setExpanded] = useState(true)
  const Icon = item.icon

  if (item.children) {
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <Icon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-0.5 p-2 min-w-[140px]">
            <span className="text-xs font-semibold text-muted-foreground mb-1 px-2">{item.label}</span>
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href!}
                end={child.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )
                }
              >
                <child.icon className="h-3 w-3 shrink-0" />
                {child.label}
              </NavLink>
            ))}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </button>
        {expanded && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children.map((child) => (
              <NavItemComponent key={child.href} item={child} depth={depth + 1} collapsed={false} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={item.href!}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center rounded-lg p-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
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
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function Sidebar({ open, onClose, collapsed, onCollapsedChange }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={100}>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background transition-all duration-300 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-14' : 'w-64'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex h-16 items-center border-b shrink-0',
          collapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}>
          {collapsed ? (
            <Wrench className="h-6 w-6 text-primary" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Wrench className="h-6 w-6 text-primary shrink-0" />
                <span className="text-lg font-bold">CMMS</span>
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => (
            <NavItemComponent key={item.href || item.label} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className={cn(
          'hidden lg:flex border-t p-2',
          collapsed ? 'justify-center' : 'justify-end'
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCollapsedChange(!collapsed)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {collapsed
                  ? <ChevronsRight className="h-4 w-4" />
                  : <ChevronsLeft className="h-4 w-4" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
