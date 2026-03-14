/**
 * Lightweight hash-based router for GitHub Pages.
 * Routes are defined in ROUTES below — add a new entry to add a new page.
 *
 * URL format:  /#/page-name
 * Example:     /#/assets   /#/work-orders   /#/settings
 */

import { useState, useEffect, createContext, useContext } from 'react'

// ─── ROUTE REGISTRY ──────────────────────────────────────────────────────────
// To add a new page:
//   1. Create src/pages/YourPage.jsx
//   2. Import it here
//   3. Add an entry to ROUTES
//
// Each route:
//   path     — the hash segment, e.g. 'assets' → /#/assets
//   label    — sidebar label
//   icon     — emoji or text icon
//   roles    — which roles can see this route (omit = all roles)
//   divider  — show a divider above this item in sidebar
// ─────────────────────────────────────────────────────────────────────────────

import Dashboard        from '../pages/Dashboard.jsx'
import AssetsPage       from '../pages/AssetsPage.jsx'
import WorkOrdersPage   from '../pages/WorkOrdersPage.jsx'
import WorkRequestsPage from '../pages/WorkRequestsPage.jsx'
import MaintenancePage  from '../pages/MaintenancePage.jsx'
import UsersPage        from '../pages/UsersPage.jsx'
import SettingsPage     from '../pages/SettingsPage.jsx'

export const ROUTES = [
  { path: 'dashboard',     label: 'Dashboard',        icon: '⬡',  component: Dashboard        },
  { path: 'assets',        label: 'Assets',            icon: '⚙',  component: AssetsPage       },
  { path: 'work-orders',   label: 'Work orders',       icon: '◫',  component: WorkOrdersPage   },
  { path: 'work-requests', label: 'Work requests',     icon: '◈',  component: WorkRequestsPage },
  { path: 'maintenance',   label: 'Maintenance tasks', icon: '⊟',  component: MaintenancePage  },
  { path: 'users',         label: 'Users',             icon: '◎',  component: UsersPage,        roles: ['admin','supervisor'], divider: true },
  { path: 'settings',      label: 'Settings',          icon: '⊕',  component: SettingsPage,     divider: true },
]

export const DEFAULT_ROUTE = 'dashboard'

// ─── ROUTER CONTEXT ──────────────────────────────────────────────────────────
const RouterCtx = createContext(null)

function getHash() {
  const h = window.location.hash.replace('#/', '').split('?')[0]
  return h || DEFAULT_ROUTE
}

export function RouterProvider({ children }) {
  const [current, setCurrent] = useState(getHash)

  useEffect(() => {
    function onHash() { setCurrent(getHash()) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function navigate(path) {
    window.location.hash = '/' + path
  }

  return (
    <RouterCtx.Provider value={{ current, navigate }}>
      {children}
    </RouterCtx.Provider>
  )
}

export function useRouter() {
  return useContext(RouterCtx)
}

// Render the component for the current route
export function RouterOutlet({ appData, user, onRefresh, onLogout }) {
  const { current } = useRouter()
  const route = ROUTES.find(r => r.path === current)
    || ROUTES.find(r => r.path === DEFAULT_ROUTE)

  const Cmp = route.component
  return (
    <div key={current} className='fade-in' style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
      <Cmp appData={appData} user={user} onRefresh={onRefresh} onLogout={onLogout} />
    </div>
  )
}
