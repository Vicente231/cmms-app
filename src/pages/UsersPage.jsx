import React, { useState } from 'react'
import { apiPost } from '../api.js'
import { Badge, Btn, Modal, Input, Select, Grid, PageHeader, Empty, Spinner, Table, SearchBar, FilterSelect, ConfirmModal, Alert } from '../components/UI.jsx'

const ROLES = ['admin','supervisor','technician']

function UserForm({ editUser, currentUser, onSave, onClose }) {
  const editing = !!editUser?.id
  const [f,setF]=useState({
    name:'', email:'', password:'', role:'technician', avatar:'',
    ...(editUser||{}),
  })
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  async function save() {
    if (!f.name)  return setErr('Name is required.')
    if (!f.email) return setErr('Email is required.')
    if (!editing && !f.password) return setErr('Password is required.')
    setBusy(true); setErr('')
    let res
    if (editing) {
      const updates = { name:f.name, role:f.role, avatar:f.avatar }
      if (f.password) updates.password = f.password
      res = await apiPost({ action:'updateUser', id:editUser.id, updates })
    } else {
      res = await apiPost({ action:'createUser', ...f })
    }
    setBusy(false)
    if (res.error) return setErr(res.error)
    onSave()
  }

  return (
    <Modal title={editing?`Edit — ${editUser.id}`:'New user'} onClose={onClose} width='460px'
      footer={<><Btn variant='secondary' onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy?<Spinner size={13}/>:editing?'Save changes':'Create user'}</Btn></>}
    >
      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <Input  label='Full name' value={f.name}  onChange={v=>set('name',v)}  required />
        <Input  label='Email'     value={f.email} onChange={v=>set('email',v)} type='email' required disabled={editing} />
        <Input  label={editing?'New password (leave blank to keep)':'Password'} value={f.password} onChange={v=>set('password',v)} type='password' required={!editing} />
        {currentUser.role==='admin'&&(
          <Select label='Role' value={f.role} onChange={v=>set('role',v)} options={ROLES} />
        )}
        <Input label='Avatar initials' value={f.avatar} onChange={v=>set('avatar',v)} placeholder='VC' hint='2 characters shown in the sidebar' />
      </div>
    </Modal>
  )
}

export default function UsersPage({ appData, user, onRefresh }) {
  const { users=[] } = appData
  const [search,setSearch]=useState('')
  const [roleF,setRoleF]=useState('')
  const [modal,setModal]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const [err,setErr]=useState('')

  const filtered = users.filter(u=>{
    const q=search.toLowerCase()
    return(!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q))
      &&(!roleF||u.role===roleF)
  })

  async function del(u) {
    const res = await apiPost({ action:'deleteUser', id:u.id })
    if (res.error){setErr(res.error);return}
    setConfirm(null); onRefresh()
  }

  const cols = [
    { label:'ID',    key:'id',    style:{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--text2)'} },
    { label:'Name',  key:'name',  style:{fontWeight:500} },
    { label:'Email', key:'email', style:{fontSize:'12px',color:'var(--text2)'} },
    { label:'Role',  render:r=><Badge label={r.role}/> },
    { label:'Avatar',render:r=>(
      <div style={{width:26,height:26,borderRadius:'50%',background:'var(--blue-dim)',border:'1px solid var(--blue-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:600,color:'var(--blue)'}}>
        {r.avatar||r.name?.slice(0,2).toUpperCase()}
      </div>
    )},
    { label:'', render:r=>(
      <div style={{display:'flex',gap:'5px'}} onClick={e=>e.stopPropagation()}>
        <Btn size='sm' variant='secondary' onClick={()=>setModal({editUser:r})}>Edit</Btn>
        {user.role==='admin'&&r.id!==user.id&&<Btn size='sm' variant='danger' onClick={()=>setConfirm(r)}>Del</Btn>}
      </div>
    )},
  ]

  return (
    <div className='fade-in'>
      <PageHeader title='Users' subtitle={`${users.length} total`}
        action={user.role==='admin'&&<Btn onClick={()=>setModal({})}>+ New user</Btn>} />

      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}

      <SearchBar value={search} onChange={setSearch} placeholder='Search name or email…'>
        <FilterSelect value={roleF} onChange={setRoleF} options={ROLES} placeholder='All roles' />
      </SearchBar>

      {filtered.length===0?<Empty icon='◎' message='No users found'/>
        :<Table cols={cols} rows={filtered}/>}

      {modal&&<UserForm editUser={modal.editUser} currentUser={user} onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)}/>}

      {confirm&&<ConfirmModal title='Delete user'
        message={`Delete "${confirm.name}"? Their open work orders will be unassigned.`}
        onConfirm={()=>del(confirm)} onClose={()=>setConfirm(null)}/>}
    </div>
  )
}
