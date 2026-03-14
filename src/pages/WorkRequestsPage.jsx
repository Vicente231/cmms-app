import React, { useState } from 'react'
import { apiPost } from '../api.js'
import { Badge, Btn, Modal, Input, Select, Textarea, Grid, Divider, PageHeader, Empty, Spinner, Table, SearchBar, FilterSelect, ConfirmModal, Alert } from '../components/UI.jsx'

const PRIORITIES = ['CRITICAL','HIGH','MEDIUM','LOW']
const STATUSES   = ['PENDING','REVIEWED','CONVERTED','CLOSED']

function WRForm({ wr, assets, user, onSave, onClose }) {
  const editing = !!wr?.wr_id
  const [f,setF]=useState({
    asset_id:'', asset_name:'', description:'', priority:'MEDIUM',
    ...(wr||{}),
  })
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  async function save() {
    if (!f.description) return setErr('Description is required.')
    setBusy(true); setErr('')
    const res = editing
      ? await apiPost({ action:'updateWorkRequest', wr_id:wr.wr_id, updates:f })
      : await apiPost({ action:'createWorkRequest', ...f })
    setBusy(false)
    if (res.error) return setErr(res.error)
    onSave()
  }

  return (
    <Modal title={editing?`Edit — ${wr.wr_id}`:'New work request'} onClose={onClose} width='520px'
      footer={<><Btn variant='secondary' onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy?<Spinner size={13}/>:editing?'Save':'Submit request'}</Btn></>}
    >
      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <Select label='Asset' value={f.asset_id}
          onChange={v=>{
            set('asset_id',v)
            const a=assets.find(x=>x.asset_id===v)
            if(a) set('asset_name',a.asset_name)
          }}
          options={assets.map(a=>({value:a.asset_id,label:`${a.asset_id} — ${a.asset_name}`}))} />
        <Select label='Priority' value={f.priority} onChange={v=>set('priority',v)} options={PRIORITIES} />
        <Textarea label='Description' value={f.description} onChange={v=>set('description',v)} required placeholder='Describe the issue…' rows={4}/>
      </div>
    </Modal>
  )
}

function ConvertModal({ wr, onSave, onClose }) {
  const [woId,setWoId]=useState('')
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')

  async function convert() {
    if (!woId.trim()) return setErr('WO ID is required.')
    setBusy(true)
    const res = await apiPost({ action:'updateWorkRequest', wr_id:wr.wr_id, updates:{ converted_to_wo:woId.trim(), status:'CONVERTED' }})
    setBusy(false)
    if (res.error) return setErr(res.error)
    onSave()
  }

  return (
    <Modal title={`Convert ${wr.wr_id} to WO`} onClose={onClose} width='400px'
      footer={<><Btn variant='secondary' onClick={onClose}>Cancel</Btn><Btn variant='success' onClick={convert} disabled={busy}>{busy?<Spinner size={13}/>:'Convert'}</Btn></>}
    >
      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}
      <p style={{fontSize:'13px',color:'var(--text2)',marginBottom:'14px',lineHeight:1.6}}>
        Enter the work order ID that was created from this request.
      </p>
      <Input label='Work order ID' value={woId} onChange={setWoId} placeholder='WO-000001' required />
    </Modal>
  )
}

export default function WorkRequestsPage({ appData, user, onRefresh }) {
  const { assets=[], users=[], workRequests=[] } = appData
  const [search,setSearch]=useState('')
  const [statF,setStatF]=useState('')
  const [modal,setModal]=useState(null)  // null | {mode:'create'|'edit'|'convert', wr?}
  const [confirm,setConfirm]=useState(null)
  const [err,setErr]=useState('')

  const userById = Object.fromEntries(users.map(u=>[u.id,u]))

  const filtered = workRequests.filter(wr=>{
    const q=search.toLowerCase()
    return(!q||wr.wr_id.toLowerCase().includes(q)||(wr.asset_name||'').toLowerCase().includes(q)||(wr.description||'').toLowerCase().includes(q))
      &&(!statF||wr.status===statF)
  }).sort((a,b)=>b.wr_id>a.wr_id?1:-1)

  async function del(wr) {
    const res = await apiPost({ action:'deleteWorkRequest', wr_id:wr.wr_id })
    if (res.error){setErr(res.error);return}
    setConfirm(null); onRefresh()
  }

  const cols = [
    { label:'WR ID',      key:'wr_id',      style:{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--text2)'} },
    { label:'Asset',      render:r=><span style={{fontSize:'13px'}}>{r.asset_name||'—'}</span> },
    { label:'Description',render:r=><span style={{fontSize:'13px',color:'var(--text2)',maxWidth:'260px',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description}</span>, wrap:true },
    { label:'Priority',   render:r=><Badge label={r.priority}/> },
    { label:'Requested by',render:r=><span style={{fontSize:'12px',color:'var(--text2)'}}>{userById[r.requested_by]?.name||r.requested_by||'—'}</span> },
    { label:'Date',       render:r=><span style={{fontSize:'12px',color:'var(--text2)'}}>{r.request_date||'—'}</span> },
    { label:'Status',     render:r=><Badge label={r.status}/> },
    { label:'WO',         render:r=><span style={{fontSize:'11px',fontFamily:'var(--mono)',color:'var(--text3)'}}>{r.converted_to_wo||'—'}</span> },
    { label:'', render:r=>(
      <div style={{display:'flex',gap:'5px'}} onClick={e=>e.stopPropagation()}>
        {(user.role==='admin'||user.role==='supervisor')&&r.status!=='CONVERTED'&&(
          <Btn size='sm' variant='success' onClick={()=>setModal({mode:'convert',wr:r})}>→ WO</Btn>
        )}
        {(user.role==='admin'||user.role==='supervisor')&&<Btn size='sm' variant='secondary' onClick={()=>setModal({mode:'edit',wr:r})}>Edit</Btn>}
        {(user.role==='admin'||user.role==='supervisor')&&r.status!=='CONVERTED'&&<Btn size='sm' variant='danger' onClick={()=>setConfirm(r)}>Del</Btn>}
      </div>
    )},
  ]

  return (
    <div className='fade-in'>
      <PageHeader title='Work requests' subtitle={`${workRequests.length} total`}
        action={<Btn onClick={()=>setModal({mode:'create'})}>+ New request</Btn>} />

      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}

      <SearchBar value={search} onChange={setSearch} placeholder='Search ID, asset, description…'>
        <FilterSelect value={statF} onChange={setStatF} options={STATUSES} placeholder='All statuses' />
      </SearchBar>

      {filtered.length===0?<Empty icon='◈' message='No work requests found'/>
        :<Table cols={cols} rows={filtered}/>}

      {modal?.mode==='create'&&<WRForm assets={assets} user={user} onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)}/>}
      {modal?.mode==='edit'  &&<WRForm wr={modal.wr} assets={assets} user={user} onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)}/>}
      {modal?.mode==='convert'&&<ConvertModal wr={modal.wr} onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)}/>}

      {confirm&&<ConfirmModal title='Delete work request'
        message={`Delete ${confirm.wr_id}? This cannot be undone.`}
        onConfirm={()=>del(confirm)} onClose={()=>setConfirm(null)}/>}
    </div>
  )
}
