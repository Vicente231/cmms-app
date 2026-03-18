import React, { useState } from 'react'
import { apiPost } from '../api.js'
import { Badge, Btn, Modal, Input, Select, Textarea, Grid, Divider, PageHeader, Empty, Spinner, Table, SearchBar, FilterSelect, ConfirmModal, Alert, Card } from '../components/UI.jsx'

const WO_TYPES   = ['CM','PM','PRJ']
const PRIORITIES = ['CRITICAL','HIGH','MEDIUM','LOW']
const STATUSES   = ['OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','CLOSED','CANCELLED']
const SAFETY     = ['DE-ENERGIZED','LOCKOUT TAGOUT','RUNNING','HOT WORK']

function WOForm({ wo, assets, users, maintenanceTasks, onSave, onClose }) {
  const editing = !!wo?.wo_id
  const [f, setF] = useState({
    wo_type:'CM', asset_id:'', assigned_to:'', priority:'MEDIUM', status:'OPEN',
    due_date:'', estimated_duration:'', safety_condition:'', description:'',
    problem_description:'', diagnosis:'', corrective_action:'', completion_notes:'',
    ...(wo||{}),
  })
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')
  const set=(k,v)=>setF(p=>({...p,[k]:v}))

  const selectedAsset   = assets.find(a=>a.asset_id===f.asset_id)
  const suggestedTasks  = maintenanceTasks.filter(t=>t.asset_type===selectedAsset?.asset_type)

  async function save() {
    if (!f.asset_id) return setErr('Asset is required.')
    setBusy(true); setErr('')
    const res = editing
      ? await apiPost({ action:'updateWorkOrder', wo_id:wo.wo_id, updates:f })
      : await apiPost({ action:'createWorkOrder', ...f })
    setBusy(false)
    if (res.error) return setErr(res.error)
    onSave()
  }

  return (
    <Modal title={editing?`Edit — ${wo.wo_id}`:'New work order'} onClose={onClose} width='660px'
      footer={<><Btn variant='secondary' onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy?<Spinner size={13}/>:editing?'Save changes':'Create WO'}</Btn></>}
    >
      {err && <Alert message={err} type='error' onClose={()=>setErr('')}/>}
      <Grid cols={2}>
        <Select label='Type'     value={f.wo_type}    onChange={v=>set('wo_type',v)}    options={WO_TYPES} required />
        <Select label='Asset'    value={f.asset_id}   onChange={v=>set('asset_id',v)}
          options={assets.map(a=>({value:a.asset_id,label:`${a.asset_id} — ${a.asset_name}`}))} required />
        <Select label='Assign to' value={f.assigned_to} onChange={v=>set('assigned_to',v)}
          options={users.map(u=>({value:u.id,label:`${u.name} (${u.role})`}))} />
        <Select label='Priority'  value={f.priority}  onChange={v=>set('priority',v)}  options={PRIORITIES} />
        <Select label='Status'    value={f.status}    onChange={v=>set('status',v)}    options={STATUSES} />
        <Input  label='Due date'  value={f.due_date}  onChange={v=>set('due_date',v)}  type='date' />
        <Input  label='Est. duration (min)' value={f.estimated_duration} onChange={v=>set('estimated_duration',v)} type='number' />
        <Select label='Safety condition' value={f.safety_condition} onChange={v=>set('safety_condition',v)} options={SAFETY} />
      </Grid>

      <Divider />
      <Textarea label='Description' value={f.description} onChange={v=>set('description',v)} />

      {f.wo_type==='CM' && <>
        <Divider label='Corrective maintenance' />
        <Textarea label='Problem description' value={f.problem_description} onChange={v=>set('problem_description',v)} />
        <Grid cols={2} style={{marginTop:'10px'}}>
          <Textarea label='Diagnosis'         value={f.diagnosis}         onChange={v=>set('diagnosis',v)} />
          <Textarea label='Corrective action' value={f.corrective_action} onChange={v=>set('corrective_action',v)} />
        </Grid>
      </>}

      {f.status==='COMPLETED' && <>
        <Divider label='Completion' />
        <Textarea label='Completion notes' value={f.completion_notes} onChange={v=>set('completion_notes',v)} />
      </>}

      {suggestedTasks.length>0 && !editing && (
        <div style={{ marginTop:'12px', background:'var(--blue-dim)', border:'1px solid var(--blue-border)', borderRadius:'var(--radius)', padding:'10px 12px', fontSize:'12px', color:'var(--text2)' }}>
          <div style={{ fontWeight:500, color:'var(--blue)', marginBottom:'5px' }}>Suggested PM tasks for {selectedAsset?.asset_type}</div>
          {suggestedTasks.map(t=><div key={t.task_id} style={{padding:'2px 0'}}>• {t.description} <span style={{color:'var(--text3)'}}>({t.frequency})</span></div>)}
          <div style={{marginTop:'5px',color:'var(--text3)'}}>Add tasks after creating the work order.</div>
        </div>
      )}
    </Modal>
  )
}

function TasksPanel({ wo, woTasks, maintenanceTasks, onRefresh, user }) {
  const tasks  = woTasks.filter(t=>t.wo_id===wo.wo_id)
  const done   = tasks.filter(t=>t.is_completed===true||t.is_completed==='TRUE'||t.is_completed==='true').length
  const [adding,setAdding]=useState(false)
  const [desc,setDesc]=useState('')
  const [tmpl,setTmpl]=useState('')
  const [busy,setBusy]=useState(false)

  async function add() {
    if (!desc && !tmpl) return
    setBusy(true)
    const template = maintenanceTasks.find(t=>t.task_id===tmpl)
    await apiPost({ action:'createWorkOrderTask', wo_id:wo.wo_id, template_task_id:tmpl||'', task_description:desc||template?.description||'' })
    setBusy(false); setAdding(false); setDesc(''); setTmpl(''); onRefresh()
  }

  async function toggle(task) {
    const was = task.is_completed===true||task.is_completed==='TRUE'||task.is_completed==='true'
    await apiPost({ action:'updateWorkOrderTask', task_id:task.task_id, updates:{ is_completed:!was }})
    onRefresh()
  }

  async function del(task) {
    await apiPost({ action:'deleteWorkOrderTask', task_id:task.task_id })
    onRefresh()
  }

  return (
    <div style={{marginTop:'14px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
        <span style={{fontSize:'13px',fontWeight:500}}>Tasks {tasks.length>0&&`(${done}/${tasks.length})`}</span>
        {wo.status!=='COMPLETED' && <Btn size='sm' onClick={()=>setAdding(v=>!v)}>+ Add task</Btn>}
      </div>
      {tasks.map(t=>{
        const isDone = t.is_completed===true||t.is_completed==='TRUE'||t.is_completed==='true'
        return (
          <div key={t.task_id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <input type='checkbox' checked={isDone} onChange={()=>toggle(t)} style={{accentColor:'var(--blue)',flexShrink:0}}/>
            <span style={{flex:1,fontSize:'13px',color:isDone?'var(--text3)':'var(--text)',textDecoration:isDone?'line-through':''}}>{t.task_description}</span>
            {t.template_task_id&&<span style={{fontSize:'11px',fontFamily:'var(--mono)',color:'var(--text3)'}}>{t.template_task_id}</span>}
            <button onClick={()=>del(t)} style={{background:'none',color:'var(--text3)',fontSize:'16px',lineHeight:1,padding:'0 2px'}}>×</button>
          </div>
        )
      })}
      {tasks.length===0&&<p style={{fontSize:'13px',color:'var(--text3)',padding:'6px 0'}}>No tasks yet</p>}

      {adding && (
        <div style={{marginTop:'8px',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--radius)',padding:'12px',display:'flex',flexDirection:'column',gap:'8px'}}>
          <Select label='From maintenance template' value={tmpl}
            onChange={v=>{setTmpl(v);if(v){const t=maintenanceTasks.find(x=>x.task_id===v);if(t)setDesc(t.description)}}}
            options={maintenanceTasks.map(t=>({value:t.task_id,label:`${t.task_id} — ${t.description.slice(0,50)}`}))} />
          <Input label='Or custom description' value={desc} onChange={setDesc} placeholder='Describe the task…'/>
          <div style={{display:'flex',gap:'6px'}}>
            <Btn size='sm' variant='secondary' onClick={()=>setAdding(false)}>Cancel</Btn>
            <Btn size='sm' onClick={add} disabled={busy}>{busy?<Spinner size={12}/>:'Add'}</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function WODetail({ wo, assets, users, woTasks, maintenanceTasks, user, onRefresh, onEdit, onClose }) {
  const asset    = assets.find(a=>a.asset_id===wo.asset_id)
  const assignee = users.find(u=>u.id===wo.assigned_to)
  const creator  = users.find(u=>u.id===wo.created_by)
  const tasks    = woTasks.filter(t=>t.wo_id===wo.wo_id)
  const doneCount= tasks.filter(t=>t.is_completed===true||t.is_completed==='TRUE'||t.is_completed==='true').length

  return (
    <Modal title={wo.wo_id} onClose={onClose} width='580px'>
      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
          <Badge label={wo.wo_type}/><Badge label={wo.status}/><Badge label={wo.priority}/>
          {wo.safety_condition&&<Badge label={wo.safety_condition} color='#555'/>}
        </div>
        {wo.description&&<p style={{fontSize:'13px',color:'var(--text2)',lineHeight:1.6}}>{wo.description}</p>}
        <Grid cols={2}>
          <div style={{fontSize:'13px'}}><span style={{color:'var(--text3)'}}>Asset: </span>{asset?.asset_name||wo.asset_id}</div>
          <div style={{fontSize:'13px'}}><span style={{color:'var(--text3)'}}>Assigned: </span>{assignee?.name||'—'}</div>
          <div style={{fontSize:'13px'}}><span style={{color:'var(--text3)'}}>Created by: </span>{creator?.name||'—'}</div>
          <div style={{fontSize:'13px'}}><span style={{color:'var(--text3)'}}>Due: </span>{wo.due_date||'—'}</div>
          {wo.estimated_duration&&<div style={{fontSize:'13px'}}><span style={{color:'var(--text3)'}}>Est.: </span>{wo.estimated_duration} min</div>}
          {wo.actual_duration   &&<div style={{fontSize:'13px'}}><span style={{color:'var(--text3)'}}>Actual: </span>{wo.actual_duration} min</div>}
        </Grid>
        {wo.problem_description&&<><Divider label='Problem'/><p style={{fontSize:'13px',color:'var(--text2)'}}>{wo.problem_description}</p></>}
        {wo.diagnosis&&<><Divider label='Diagnosis'/><p style={{fontSize:'13px',color:'var(--text2)'}}>{wo.diagnosis}</p></>}
        {wo.corrective_action&&<><Divider label='Corrective action'/><p style={{fontSize:'13px',color:'var(--text2)'}}>{wo.corrective_action}</p></>}
        {wo.completion_notes&&<><Divider label='Completion notes'/><p style={{fontSize:'13px',color:'var(--text2)'}}>{wo.completion_notes}</p></>}
        <TasksPanel wo={wo} woTasks={woTasks} maintenanceTasks={maintenanceTasks} onRefresh={onRefresh} user={user}/>
        {user.role!=='technician'&&(
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:'4px'}}>
            <Btn variant='secondary' onClick={()=>onEdit(wo)}>Edit work order</Btn>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function WorkOrdersPage({ appData, user, onRefresh }) {
  const { assets=[], users=[], workOrders=[], workOrderTasks=[], maintenanceTasks=[] } = appData
  const [search,setSearch]=useState('')
  const [typeF,setTypeF]=useState('')
  const [statF,setStatF]=useState('')
  const [modal,setModal]=useState(null)
  const [detail,setDetail]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const [err,setErr]=useState('')

  const assetById = Object.fromEntries(assets.map(a=>[a.asset_id,a]))
  const userById  = Object.fromEntries(users.map(u=>[u.id,u]))

  const filtered = workOrders.filter(wo=>{
    const q=search.toLowerCase()
    const a=assetById[wo.asset_id]
    return(!q||wo.wo_id.toLowerCase().includes(q)||a?.asset_name?.toLowerCase().includes(q)||(wo.description||'').toLowerCase().includes(q))
      &&(!typeF||wo.wo_type===typeF)
      &&(!statF||wo.status===statF)
  }).sort((a,b)=>b.wo_id>a.wo_id?1:-1)

  async function del(wo) {
    const res = await apiPost({ action:'deleteWorkOrder', wo_id:wo.wo_id })
    if (res.error){setErr(res.error);return}
    setConfirm(null); onRefresh()
  }

  const cols = [
    { label:'WO ID',    key:'wo_id',     style:{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--text2)'} },
    { label:'Type',     render:r=><Badge label={r.wo_type}/> },
    { label:'Asset',    render:r=><span>{assetById[r.asset_id]?.asset_name||r.asset_id}</span> },
    { label:'Assigned', render:r=><span style={{fontSize:'12px',color:'var(--text2)'}}>{userById[r.assigned_to]?.name||'—'}</span> },
    { label:'Priority', render:r=><Badge label={r.priority}/> },
    { label:'Status',   render:r=><Badge label={r.status}/> },
    { label:'Due',      render:r=>{
      const over = r.due_date && new Date(r.due_date)<new Date() && r.status!=='COMPLETED'
      return <span style={{fontSize:'12px',color:over?'var(--red)':'var(--text2)'}}>{r.due_date||'—'}</span>
    }},
    { label:'', render:r=>(
      <div style={{display:'flex',gap:'5px'}} onClick={e=>e.stopPropagation()}>
        {user.role!=='technician'&&<Btn size='sm' variant='secondary' onClick={()=>setModal({wo:r})}>Edit</Btn>}
        {(user.role==='admin'||user.role==='supervisor')&&<Btn size='sm' variant='danger' onClick={()=>setConfirm(r)}>Del</Btn>}
      </div>
    )},
  ]

  return (
    <div className='fade-in'>
      <PageHeader title='Work orders' subtitle={`${workOrders.length} total`}
        action={user.role!=='technician'&&<Btn onClick={()=>setModal({})}>+ New WO</Btn>} />

      {err&&<Alert message={err} type='error' onClose={()=>setErr('')}/>}

      <SearchBar value={search} onChange={setSearch} placeholder='Search ID, asset, description…'>
        <FilterSelect value={typeF} onChange={setTypeF} options={WO_TYPES} placeholder='All types' />
        <FilterSelect value={statF} onChange={setStatF} options={STATUSES} placeholder='All statuses' />
      </SearchBar>

      {filtered.length===0?<Empty icon='◫' message='No work orders found'/>
        :<Table cols={cols} rows={filtered} onRowClick={setDetail}/>}

      {modal&&<WOForm wo={modal.wo} assets={assets} users={users} maintenanceTasks={maintenanceTasks}
        onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)}/>}

      {detail&&<WODetail wo={detail} assets={assets} users={users} woTasks={workOrderTasks}
        maintenanceTasks={maintenanceTasks} user={user} onRefresh={onRefresh}
        onEdit={wo=>{setDetail(null);setModal({wo})}} onClose={()=>setDetail(null)}/>}

      {confirm&&<ConfirmModal title='Delete work order'
        message={`Delete ${confirm.wo_id}? All tasks will also be deleted. This cannot be undone.`}
        onConfirm={()=>del(confirm)} onClose={()=>setConfirm(null)}/>}
    </div>
  )
}
