import React, { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, getUser, getToken, clearAuth } from './api.js'
import { RouterProvider, RouterOutlet } from './router/index.jsx'
import Sidebar    from './components/Sidebar.jsx'
import LoginPage  from './pages/LoginPage.jsx'
import { Spinner } from './components/UI.jsx'

// ─── Data loader ──────────────────────────────────────────────────────────────
// All API calls happen here. To add data for a new page, add a fetch below.
async function fetchAll() {
  const [
    assets, assetTypes, schemas, users,
    workOrders, workOrderTasks, workRequests, maintenanceTasks,
  ] = await Promise.all([
    apiGet('assets'),
    apiGet('assetTypes'),
    apiGet('assetTypeSchemas'),
    apiGet('users'),
    apiGet('workOrders'),
    apiGet('workOrderTasks'),
    apiGet('workRequests'),
    apiGet('maintenanceTasks'),
  ])
  return { assets, assetTypes, schemas, users, workOrders, workOrderTasks, workRequests, maintenanceTasks }
}

export default function App() {
  const [user,    setUser]    = useState(() => getUser())
  const [appData, setAppData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState('')

  const load = useCallback(async () => {
    if (!getToken()) return
    setLoading(true); setLoadErr('')
    try {
      const data = await fetchAll()
      // Check if any response indicates auth failure
      const authFailed = Object.values(data).some(v => Array.isArray(v) ? false : v?.error === 'Unauthorized.')
      if (authFailed) { handleLogout(); return }
      setAppData(data)
    } catch (e) {
      setLoadErr('Failed to load data. Check your connection.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user])

  function handleLogin(u) {
    setUser(u)
  }

  async function handleLogout() {
    await apiPost({ action:'logout' }).catch(()=>{})
    clearAuth()
    setUser(null)
    setAppData(null)
  }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} />

  // ── Loading data ─────────────────────────────────────────────────────────
  if (loading || !appData) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'14px' }}>
        <Spinner size={24}/>
        <span style={{ color:'var(--text3)', fontSize:'13px', fontFamily:'var(--mono)' }}>Loading CMMS data…</span>
        {loadErr && (
          <div style={{ color:'var(--red)', fontSize:'13px', maxWidth:'300px', textAlign:'center', marginTop:'8px' }}>
            {loadErr}
            <button onClick={load} style={{ display:'block', margin:'10px auto 0', color:'var(--blue)', background:'none', fontSize:'13px', cursor:'pointer' }}>
              Try again
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <RouterProvider>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Sidebar user={user} onLogout={handleLogout} />
        <RouterOutlet appData={appData} user={user} onRefresh={load} onLogout={handleLogout} />
      </div>
    </RouterProvider>
  )
}
