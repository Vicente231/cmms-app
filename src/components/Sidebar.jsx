import React from 'react'
import { ROUTES } from '../router/index.jsx'
import { useRouter } from '../router/index.jsx'

export default function Sidebar({ user, onLogout }) {
  const { current, navigate } = useRouter()

  const visible = ROUTES.filter(r => !r.roles || r.roles.includes(user.role))

  return (
    <aside style={{
      width:'var(--sidebar-w)', flexShrink:0,
      background:'var(--bg2)', borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0,
    }}>
      {/* Logo */}
      <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{
            width:'30px', height:'30px', background:'var(--blue-dim)',
            border:'1px solid var(--blue-border)', borderRadius:'6px',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0,
          }}>⚡</div>
          <div>
            <div style={{ fontWeight:600, fontSize:'14px', letterSpacing:'-.01em' }}>CMMS</div>
            <div style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'var(--mono)' }}>Electrical</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
        {visible.map(route => {
          const active = current === route.path
          return (
            <React.Fragment key={route.path}>
              {route.divider && <div style={{ height:'1px', background:'var(--border)', margin:'6px 4px' }}/>}
              <button onClick={() => navigate(route.path)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:'9px',
                padding:'7px 10px', borderRadius:'var(--radius)',
                background: active ? 'var(--blue-dim)' : 'transparent',
                color: active ? 'var(--blue)' : 'var(--text2)',
                border: active ? '1px solid var(--blue-border)' : '1px solid transparent',
                fontSize:'13px', fontWeight: active ? 500 : 400,
                textAlign:'left', marginBottom:'2px', transition:'var(--trans)',
              }}
                onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--text)' }}}
                onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)' }}}
              >
                <span style={{ fontSize:'14px', width:'18px', textAlign:'center', flexShrink:0 }}>{route.icon}</span>
                {route.label}
              </button>
            </React.Fragment>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'9px', marginBottom:'10px' }}>
          <div style={{
            width:'28px', height:'28px', borderRadius:'50%',
            background:'var(--blue-dim)', border:'1px solid var(--blue-border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'11px', fontWeight:600, color:'var(--blue)', flexShrink:0,
          }}>{user.avatar || user.name?.slice(0,2).toUpperCase()}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:'12px', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
            <div style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'var(--mono)' }}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          width:'100%', padding:'5px', fontSize:'12px', color:'var(--text3)',
          background:'transparent', borderRadius:'var(--radius)', border:'1px solid var(--border)',
          transition:'var(--trans)',
        }}
          onMouseEnter={e=>{ e.currentTarget.style.color='var(--red)'; e.currentTarget.style.borderColor='rgba(248,81,73,.3)' }}
          onMouseLeave={e=>{ e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.borderColor='var(--border)' }}
        >Sign out</button>
      </div>
    </aside>
  )
}
