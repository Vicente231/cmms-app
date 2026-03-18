import React, { useState } from 'react'
import { apiPost } from '../api.js'
import { Badge, Btn, Modal, Input, Select, Textarea, Grid, Divider, PageHeader, Empty, Spinner, Table, SearchBar, FilterSelect, ConfirmModal, Alert } from '../components/UI.jsx'

const STATUSES  = ['ACTIVE','INACTIVE','MAINTENANCE','DECOMMISSIONED']
const CRITS     = ['CRITICAL','HIGH','MEDIUM','LOW']

function AssetForm({ asset, assetTypes, schemas, assets, onSave, onClose }) {
  const editing = !!asset?.asset_id
  const init = {
    asset_name:'', asset_type:'', parent_asset:'', location:'',
    criticality:'MEDIUM', status:'ACTIVE', manufacturer:'', vendor:'',
    part_number:'', serial_number:'', install_date:'', warranty_expiry:'',
    notes:'', attrs:{}, ...(asset||{}),
  }
  if (asset?.attrs && typeof asset.attrs === 'object') init.attrs = asset.attrs
  const [f, setF] = useState(init)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  const typeSchemas = schemas.filter(s => s.type_code === f.asset_type)
  const parentOpts  = assets.filter(a=>a.asset_id!==asset?.asset_id).map(a=>({value:a.asset_id,label:`${a.asset_id} — ${a.asset_name}`}))

  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const setAttr = (k,v) => setF(p=>({...p,attrs:{...p.attrs,[k]:v}}))

  async function save() {
    if (!f.asset_name) return setErr('Asset name is required.')
    if (!f.asset_type) return setErr('Asset type is required.')
    setBusy(true); setErr('')
    const res = editing
      ? await apiPost({ action:'updateAsset', asset_id:asset.asset_id, updates:f })
      : await apiPost({ action:'createAsset', ...f })
    setBusy(false)
    if (res.error) return setErr(res.error)
    onSave()
  }

  return (
    <Modal title={editing?`Edit — ${asset.asset_id}`:'New asset'} onClose={onClose} width='660px'
      footer={<><Btn variant='secondary' onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy?<Spinner size={13}/>:editing?'Save changes':'Create asset'}</Btn></>}
    >
      {err && <Alert message={err} type='error' onClose={()=>setErr('')}/>}
      <Grid cols={2}>
        <Input  label='Asset name' value={f.asset_name} onChange={v=>set('asset_name',v)} required />
        <Select label='Asset type' value={f.asset_type} onChange={v=>{set('asset_type',v);setF(p=>({...p,attrs:{}}))}}
          options={assetTypes.map(t=>({value:t.type_code,label:`${t.type_code} — ${t.label}`}))} required />
        <Select label='Parent asset' value={f.parent_asset} onChange={v=>set('parent_asset',v)} options={parentOpts} />
        <Input  label='Location'    value={f.location}    onChange={v=>set('location',v)} />
        <Select label='Criticality' value={f.criticality} onChange={v=>set('criticality',v)} options={CRITS} />
        <Select label='Status'      value={f.status}      onChange={v=>set('status',v)} options={STATUSES} />
      </Grid>

      <Divider label='Identification' />
      <Grid cols={2}>
        <Input label='Manufacturer'  value={f.manufacturer}  onChange={v=>set('manufacturer',v)} />
        <Input label='Vendor'        value={f.vendor}        onChange={v=>set('vendor',v)} />
        <Input label='Part number'   value={f.part_number}   onChange={v=>set('part_number',v)} />
        <Input label='Serial number' value={f.serial_number} onChange={v=>set('serial_number',v)} />
        <Input label='Install date'  value={f.install_date}  onChange={v=>set('install_date',v)}  type='date' />
        <Input label='Warranty expiry' value={f.warranty_expiry} onChange={v=>set('warranty_expiry',v)} type='date' />
      </Grid>

      {typeSchemas.length > 0 && (
        <>
          <Divider label='Technical attributes' />
          <Grid cols={2}>
            {typeSchemas.map(s=>(
              s.data_type==='select'
                ? <Select key={s.field_key} label={s.label} unit={s.unit} required={s.required}
                    value={String(f.attrs[s.field_key]||'')} onChange={v=>setAttr(s.field_key,v)}
                    options={(s.options||[]).map(o=>({value:o,label:o}))} />
                : <Input  key={s.field_key} label={s.label} unit={s.unit} required={s.required}
                    type={s.data_type==='number'?'number':'text'}
                    value={String(f.attrs[s.field_key]||'')}
                    onChange={v=>setAttr(s.field_key, s.data_type==='number'?parseFloat(v)||'':v)} />
            ))}
          </Grid>
        </>
      )}

      <Divider />
      <Textarea label='Notes' value={f.notes} onChange={v=>set('notes',v)} rows={2} />
    </Modal>
  )
}

export default function AssetsPage({ appData, user, onRefresh }) {
  const { assets=[], assetTypes=[], schemas=[] } = appData
  const [search, setSearch]     = useState('')
  const [typeF,  setTypeF]      = useState('')
  const [statusF,setStatusF]    = useState('')
  const [modal,  setModal]      = useState(null)
  const [confirm,setConfirm]    = useState(null)
  const [err,    setErr]        = useState('')

  const assetById = Object.fromEntries(assets.map(a=>[a.asset_id,a]))

  const filtered = assets.filter(a=>{
    const q = search.toLowerCase()
    return (!q || a.asset_name.toLowerCase().includes(q) || a.asset_id.toLowerCase().includes(q) || (a.location||'').toLowerCase().includes(q))
      && (!typeF   || a.asset_type === typeF)
      && (!statusF || a.status === statusF)
  })

  async function del(asset) {
    const res = await apiPost({ action:'deleteAsset', asset_id:asset.asset_id })
    if (res.error) { setErr(res.error); return }
    setConfirm(null); onRefresh()
  }

  const cols = [
    { label:'ID',          key:'asset_id',    style:{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--text2)'} },
    { label:'Name',        key:'asset_name',  style:{fontWeight:500} },
    { label:'Type',        render:r=><Badge label={r.asset_type}/> },
    { label:'Parent',      render:r=><span style={{fontSize:'12px',color:'var(--text2)'}}>{assetById[r.parent_asset]?.asset_name||'—'}</span> },
    { label:'Location',    render:r=><span style={{fontSize:'12px',color:'var(--text2)'}}>{r.location||'—'}</span> },
    { label:'Criticality', render:r=><Badge label={r.criticality}/> },
    { label:'Status',      render:r=><Badge label={r.status}/> },
    { label:'', render:r=>(
      <div style={{display:'flex',gap:'5px'}} onClick={e=>e.stopPropagation()}>
        {user.role!=='technician' && <Btn size='sm' variant='secondary' onClick={()=>setModal({asset:r})}>Edit</Btn>}
        {user.role==='admin' && <Btn size='sm' variant='danger' onClick={()=>setConfirm(r)}>Del</Btn>}
      </div>
    )},
  ]

  return (
    <div className='fade-in'>
      <PageHeader title='Assets' subtitle={`${assets.length} total`}
        action={user.role!=='technician' && <Btn onClick={()=>setModal({})}>+ New asset</Btn>} />

      {err && <Alert message={err} type='error' onClose={()=>setErr('')}/>}

      <SearchBar value={search} onChange={setSearch} placeholder='Search name, ID, location…'>
        <FilterSelect value={typeF}   onChange={setTypeF}   options={assetTypes.map(t=>({value:t.type_code,label:t.label}))} placeholder='All types' />
        <FilterSelect value={statusF} onChange={setStatusF} options={STATUSES} placeholder='All statuses' />
      </SearchBar>

      {filtered.length===0 ? <Empty icon='⚙' message='No assets found' /> : <Table cols={cols} rows={filtered} />}

      {modal && <AssetForm asset={modal.asset} assetTypes={assetTypes} schemas={schemas} assets={assets}
        onSave={()=>{setModal(null);onRefresh()}} onClose={()=>setModal(null)} />}

      {confirm && <ConfirmModal title='Delete asset'
        message={`Delete "${confirm.asset_name}"? Child assets must be removed first. This cannot be undone.`}
        onConfirm={()=>del(confirm)} onClose={()=>setConfirm(null)} />}
    </div>
  )
}
