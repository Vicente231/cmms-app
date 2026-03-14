import React, { useState } from 'react'
import { apiPost } from '../api.js'
import { getUser, setUser as saveUser } from '../api.js'
import { Btn, Input, Select, Grid, Divider, PageHeader, Card, Alert, Spinner } from '../components/UI.jsx'

export default function SettingsPage({ appData, user, onRefresh, onLogout }) {
  const { assetTypes=[], schemas=[] } = appData
  const [name, setName]   = useState(user.name)
  const [pass, setPass]   = useState('')
  const [pass2,setPass2]  = useState('')
  const [busy, setBusy]   = useState(false)
  const [msg,  setMsg]    = useState(null) // {type, text}

  async function saveProfile() {
    if (!name.trim()) return setMsg({type:'error',text:'Name cannot be empty.'})
    if (pass && pass !== pass2) return setMsg({type:'error',text:'Passwords do not match.'})
    setBusy(true); setMsg(null)
    const updates = { name }
    if (pass) updates.password = pass
    const res = await apiPost({ action:'updateUser', id:user.id, updates })
    setBusy(false)
    if (res.error) return setMsg({type:'error',text:res.error})
    // update local user cache
    const updated = { ...user, name }
    saveUser(updated)
    setPass(''); setPass2('')
    setMsg({type:'success',text:'Profile updated successfully.'})
    onRefresh()
  }

  return (
    <div className='fade-in'>
      <PageHeader title='Settings' subtitle='Manage your account and app preferences' />

      {/* Profile */}
      <Card style={{ marginBottom:'20px', maxWidth:'520px' }}>
        <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'16px' }}>Profile</div>

        <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'20px' }}>
          <div style={{
            width:'48px', height:'48px', borderRadius:'50%',
            background:'var(--blue-dim)', border:'1px solid var(--blue-border)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'16px', fontWeight:600, color:'var(--blue)', flexShrink:0,
          }}>{user.avatar||user.name?.slice(0,2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight:500 }}>{user.name}</div>
            <div style={{ fontSize:'12px', color:'var(--text2)' }}>{user.email}</div>
            <div style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'var(--mono)', marginTop:'2px' }}>{user.role}</div>
          </div>
        </div>

        {msg && <Alert message={msg.text} type={msg.type} onClose={()=>setMsg(null)}/>}

        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <Input label='Display name' value={name} onChange={setName} />
          <Divider label='Change password' />
          <Input label='New password'     value={pass}  onChange={setPass}  type='password' placeholder='Leave blank to keep current' />
          <Input label='Confirm password' value={pass2} onChange={setPass2} type='password' placeholder='Repeat new password' />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'4px' }}>
            <Btn onClick={saveProfile} disabled={busy}>{busy?<Spinner size={13}/>:'Save changes'}</Btn>
          </div>
        </div>
      </Card>

      {/* App info */}
      <Card style={{ maxWidth:'520px', marginBottom:'20px' }}>
        <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'14px' }}>System info</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
          <div style={{ color:'var(--text3)' }}>Assets</div>
          <div style={{ fontFamily:'var(--mono)' }}>{appData.assets?.length||0}</div>
          <div style={{ color:'var(--text3)' }}>Work orders</div>
          <div style={{ fontFamily:'var(--mono)' }}>{appData.workOrders?.length||0}</div>
          <div style={{ color:'var(--text3)' }}>Work requests</div>
          <div style={{ fontFamily:'var(--mono)' }}>{appData.workRequests?.length||0}</div>
          <div style={{ color:'var(--text3)' }}>Asset types</div>
          <div style={{ fontFamily:'var(--mono)' }}>{assetTypes.length}</div>
          <div style={{ color:'var(--text3)' }}>Schema fields</div>
          <div style={{ fontFamily:'var(--mono)' }}>{schemas.length}</div>
          <div style={{ color:'var(--text3)' }}>API</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:'11px', color:'var(--text3)', wordBreak:'break-all' }}>Apps Script</div>
        </div>
      </Card>

      {/* Sign out */}
      <Card style={{ maxWidth:'520px', borderColor:'rgba(248,81,73,.2)' }}>
        <div style={{ fontWeight:600, fontSize:'14px', marginBottom:'10px' }}>Session</div>
        <p style={{ fontSize:'13px', color:'var(--text2)', marginBottom:'14px' }}>Sign out of the current session. Your token will be invalidated.</p>
        <Btn variant='danger' onClick={onLogout}>Sign out</Btn>
      </Card>
    </div>
  )
}
