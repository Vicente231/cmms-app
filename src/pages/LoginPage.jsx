import React, { useState } from 'react'
import { apiGet, apiPost, setToken, setUser } from '../api.js'
import { Btn, Alert, Spinner } from '../components/UI.jsx'

export default function LoginPage({ onLogin }) {
  const [mode, setMode]     = useState('login')
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    if (mode === 'login') {
      const d = await apiGet('login', { email, password: pass })
      setBusy(false)
      if (d.error) return setError(d.error)
      setToken(d.token); setUser(d.user); onLogin(d.user)
    } else {
      if (!name.trim()) { setBusy(false); return setError('Name is required.') }
      const d = await apiPost({ action:'register', name, email, password: pass })
      if (d.error) { setBusy(false); return setError(d.error) }
      const login = await apiGet('login', { email, password: pass })
      setBusy(false)
      if (login.error) return setError(login.error)
      setToken(login.token); setUser(login.user); onLogin(login.user)
    }
  }

  const inputStyle = {
    width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
    borderRadius:'var(--radius)', color:'var(--text)', padding:'9px 12px', fontSize:'13px',
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)',
      backgroundImage:'radial-gradient(ellipse at 15% 60%, rgba(56,139,253,.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(56,139,253,.04) 0%, transparent 50%)',
    }}>
      <div className='fade-in' style={{ width:'100%', maxWidth:'360px', padding:'0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width:'44px', height:'44px', background:'var(--blue-dim)',
            border:'1px solid var(--blue-border)', borderRadius:'9px', marginBottom:'14px',
          }}>⚡</div>
          <div style={{ fontSize:'20px', fontWeight:600, letterSpacing:'-.02em' }}>CMMS</div>
          <div style={{ color:'var(--text3)', fontSize:'12px', marginTop:'3px', fontFamily:'var(--mono)' }}>Electrical Maintenance System</div>
        </div>

        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px' }}>
          {/* Tabs */}
          <div style={{ display:'flex', background:'var(--bg3)', borderRadius:'var(--radius)', padding:'3px', marginBottom:'20px' }}>
            {['login','register'].map(m => (
              <button key={m} onClick={()=>{ setMode(m); setError('') }} style={{
                flex:1, padding:'6px', borderRadius:'var(--radius)', fontSize:'13px', fontWeight:500,
                background: mode===m ? 'var(--bg4)' : 'transparent',
                color: mode===m ? 'var(--text)' : 'var(--text2)',
                border: mode===m ? '1px solid var(--border2)' : '1px solid transparent',
                transition:'var(--trans)', textTransform:'capitalize',
              }}>{m}</button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {mode === 'register' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                <label style={{ fontSize:'12px', color:'var(--text2)', fontWeight:500 }}>Full name</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder='Victor Casmac' style={inputStyle}
                  onFocus={e=>e.target.style.borderColor='var(--blue)'}
                  onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              <label style={{ fontSize:'12px', color:'var(--text2)', fontWeight:500 }}>Email</label>
              <input type='email' value={email} onChange={e=>setEmail(e.target.value)} placeholder='you@plant.com' style={inputStyle}
                onFocus={e=>e.target.style.borderColor='var(--blue)'}
                onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              <label style={{ fontSize:'12px', color:'var(--text2)', fontWeight:500 }}>Password</label>
              <input type='password' value={pass} onChange={e=>setPass(e.target.value)} placeholder='••••••••' style={inputStyle}
                onFocus={e=>e.target.style.borderColor='var(--blue)'}
                onBlur={e=>e.target.style.borderColor='var(--border2)'}/>
            </div>

            {error && <Alert message={error} type='error' onClose={()=>setError('')}/>}

            <Btn type='submit' disabled={busy} style={{ width:'100%', justifyContent:'center', marginTop:'4px' }}>
              {busy ? <Spinner size={14}/> : mode==='login' ? 'Sign in' : 'Create account'}
            </Btn>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'var(--text3)', fontSize:'11px', marginTop:'16px', fontFamily:'var(--mono)' }}>
          New accounts are created as <span style={{color:'var(--blue)'}}>technician</span>
        </p>
      </div>
    </div>
  )
}
