import React, { useState } from 'react'
import { apiPost } from '../api.js'
import { Badge, Btn, Modal, Input, Select, Textarea, Grid, PageHeader, Empty, Spinner, Table, SearchBar, FilterSelect, ConfirmModal, Alert } from '../components/UI.jsx'

const FREQUENCIES = ['Daily','Weekly','Monthly','Quarterly','Semi-Annual','Annual']
const SAFETY_OPTS = ['DE-ENERGIZED','LOCKOUT TAGOUT','RUNNING','HOT WORK']

function MTForm({ task, assetTypes, onSave, onClose }) {
  const editing = !!task?.task_id
  const [f,setF]=useState({ asset_type:'', description:'', frequency:'Monthly', safety:'DE-ENERGIZED', estimated_duration:'', ...(task||{}) })
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  async function save() {
    if (!f.asset_type)   return setErr('Asset type is required.')
    if (!f.description)  return setErr('Description is required.')
    setBusy(true); setErr('')
    const res = editing
      ? await apiPost({ action:'updateMaintenanceTask', task_id:task.task_id, updates:f })
      : await apiPost({ action:'createMaintenanceTask', ...f })
    setBusy(false)
    if (res.error) return setErr(res.error)
    onSave()
  }

  return (
    <Modal title={editing?`Edit — ${task.task_id}`:'New maintenance task'} onClose={onClose} width='520px'
      footer={<><Btn variant='secondary' onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy?<Spinner size={13}/>:editing?'Save changes':'Create task'}</Btn></>}
    >
      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <Select label='Asset type' value={f.asset_type} onChange={v=>set('asset_type',v)}
          options={assetTypes.map(t=>({value:t.type_code,label:`${t.type_code} — ${t.label}`}))} required />
        <Textarea label='Description' value={f.description} onChange={v=>set('description',v)} required placeholder='Describe the maintenance task…' rows={3}/>
        <Grid cols={2}>
          <Select label='Frequency'         value={f.frequency}          onChange={v=>set('frequency',v)}          options={FREQUENCIES} />
          <Select label='Safety condition'  value={f.safety}             onChange={v=>set('safety',v)}             options={SAFETY_OPTS} />
          <Input  label='Est. duration (min)' value={f.estimated_duration} onChange={v=>set('estimated_duration',v)} type='number' />
        </Grid>
      </div>
    </Modal>
  )
}

export default function MaintenancePage({ appData, user, onRefresh }) {
  const { maintenanceTasks=[], assetTypes=[] } = appData
  const [search,setSearch]=useState('')
  const [typeF,setTypeF]=useState('')
  const [freqF,setFreqF]=useState('')
  const [modal,setModal]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const [err,setErr]=useState('')

  const typeMap = Object.fromEntries(assetTypes.map(t=>[t.type_code,t.label]))

  const filtered = maintenanceTasks.filter(t=>{
    const q=search.toLowerCase()
    return(!q||t.task_id.toLowerCase().includes(q)||t.description.toLowerCase().includes(q))
      &&(!typeF||t.asset_type===typeF)
      &&(!freqF||t.frequency===freqF)
  })

  async function del(task) {
    const res = await apiPost({ action:'deleteMaintenanceTask', task_id:task.task_id })
    if (res.error){setErr(res.error);return}
    setConfirm(null); onRefresh()
  }

  const canEdit = user.role==='admin'||user.role==='supervisor'

  const cols = [
    { label:'Task ID',    key:'task_id',    style:{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--text2)'} },
    { label:'Asset type', render:r=><span><Badge label={r.asset_type}/></span> },
    { label:'Description',render:r=><span style={{fontSize:'13px',color:'var(--text)'}}>{r.description}</span>, wrap:true },
    { label:'Frequency',  render:r=><span style={{fontSize:'12px',color:'var(--text2)'}}>{r.frequency}</span> },
    { label:'Safety',     render:r=><Badge label={r.safety} color='#555'/> },
    { label:'Est.',       render:r=><span style={{fontSize:'12px',color:'var(--text2)',fontFamily:'var(--mono)'}}>{r.estimated_duration?`${r.estimated_duration}m`:'—'}</span> },
    { label:'', render:r=>(
      <div style={{display:'flex',gap:'5px'}} onClick={e=>e.stopPropagation()}>
        {canEdit&&<Btn size='sm' variant='secondary' onClick={()=>setModal({task:r})}>Edit</Btn>}
        {user.role==='admin'&&<Btn size='sm' variant='danger' onClick={()=>setConfirm(r)}>Del</Btn>}
      </div>
    )},
  ]

  return (
    <div className='fade-in'>
      <PageHeader title='Maintenance tasks' subtitle={`${maintenanceTasks.length} templates`}
        action={canEdit&&<Btn onClick={()=>setModal({})}>+ New task</Btn>} />

      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}

      <SearchBar value={search} onChange={setSearch} placeholder='Search task ID or description…'>
        <FilterSelect value={typeF} onChange={setTypeF} options={assetTypes.map(t=>({value:t.type_code,label:t.label}))} placeholder='All types' />
        <FilterSelect value={freqF} onChange={setFreqF} options={FREQUENCIES} placeholder='All frequencies' />
      </SearchBar>

      {filtered.length===0?<Empty icon='⊟' message='No maintenance tasks found'/>
        :<Table cols={cols} rows={filtered}/>}

      {modal&&<MTForm task={modal.task} assetTypes={assetTypes} onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)}/>}

      {confirm&&<ConfirmModal title='Delete maintenance task'
        message={`Delete "${confirm.task_id}"? This will fail if work order tasks reference this template.`}
        onConfirm={()=>del(confirm)} onClose={()=>setConfirm(null)}/>}
    </div>
  )
}
