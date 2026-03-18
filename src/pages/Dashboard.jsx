import React from 'react'
import { Stat, Card, Badge, PageHeader } from '../components/UI.jsx'
import { useRouter } from '../router/index.jsx'

export default function Dashboard({ appData, user }) {
  const { navigate } = useRouter()
  const { assets=[], workOrders=[], workRequests=[] } = appData

  const openWOs     = workOrders.filter(w => !['COMPLETED','CANCELLED','CLOSED'].includes(w.status))
  const critical    = openWOs.filter(w => w.priority === 'CRITICAL')
  const overdue     = openWOs.filter(w => w.due_date && new Date(w.due_date) < new Date())
  const pendingWRs  = workRequests.filter(r => r.status === 'PENDING')
  const activeAssets= assets.filter(a => a.status === 'ACTIVE')
  const assetById   = Object.fromEntries(assets.map(a=>[a.asset_id,a]))

  const recentWOs = [...workOrders].sort((a,b)=>b.wo_id>a.wo_id?1:-1).slice(0,7)
  const recentWRs = workRequests.filter(r=>r.status==='PENDING').slice(0,7)

  const today = new Date().toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  return (
    <div className='fade-in'>
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0]}`}
        subtitle={today}
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'10px', marginBottom:'24px' }}>
        <Stat label='Active assets'    value={activeAssets.length} onClick={()=>navigate('assets')} />
        <Stat label='Open WOs'         value={openWOs.length}      color='var(--blue)'  onClick={()=>navigate('work-orders')} />
        <Stat label='Critical'         value={critical.length}     color={critical.length>0?'var(--red)':'var(--text)'}   onClick={()=>navigate('work-orders')} />
        <Stat label='Overdue'          value={overdue.length}      color={overdue.length>0?'var(--amber)':'var(--text)'}  onClick={()=>navigate('work-orders')} />
        <Stat label='Pending requests' value={pendingWRs.length}   color={pendingWRs.length>0?'var(--amber)':'var(--text)'} onClick={()=>navigate('work-requests')} />
      </div>

      {/* Alerts */}
      {(critical.length > 0 || overdue.length > 0) && (
        <Card style={{ marginBottom:'20px', borderColor:'rgba(248,81,73,.25)', background:'rgba(248,81,73,.04)' }}>
          <div style={{ fontSize:'12px', fontWeight:600, color:'var(--red)', marginBottom:'10px', fontFamily:'var(--mono)', letterSpacing:'.04em' }}>⚠ ATTENTION REQUIRED</div>
          {critical.map(wo=>(
            <div key={wo.wo_id} style={{ display:'flex', gap:'10px', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:'13px' }}>
              <span style={{ fontFamily:'var(--mono)', color:'var(--text3)', fontSize:'12px' }}>{wo.wo_id}</span>
              <span style={{ flex:1 }}>{assetById[wo.asset_id]?.asset_name || wo.asset_id}</span>
              <Badge label='CRITICAL'/>
            </div>
          ))}
          {overdue.filter(w=>w.priority!=='CRITICAL').map(wo=>(
            <div key={wo.wo_id} style={{ display:'flex', gap:'10px', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:'13px' }}>
              <span style={{ fontFamily:'var(--mono)', color:'var(--text3)', fontSize:'12px' }}>{wo.wo_id}</span>
              <span style={{ flex:1 }}>{assetById[wo.asset_id]?.asset_name || wo.asset_id}</span>
              <Badge label='OVERDUE' color='var(--amber)'/>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
        {/* Recent WOs */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <span style={{ fontWeight:600, fontSize:'13px' }}>Recent work orders</span>
            <button onClick={()=>navigate('work-orders')} style={{ background:'none', color:'var(--blue)', fontSize:'12px', cursor:'pointer' }}>View all →</button>
          </div>
          {recentWOs.length === 0
            ? <p style={{ color:'var(--text3)', fontSize:'13px' }}>No work orders yet</p>
            : recentWOs.map(wo=>(
              <div key={wo.wo_id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                <Badge label={wo.wo_type}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'11px', fontFamily:'var(--mono)', color:'var(--text3)' }}>{wo.wo_id}</div>
                  <div style={{ fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{assetById[wo.asset_id]?.asset_name||wo.asset_id}</div>
                </div>
                <Badge label={wo.status}/>
              </div>
            ))
          }
        </Card>

        {/* Pending WRs */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
            <span style={{ fontWeight:600, fontSize:'13px' }}>Pending requests</span>
            <button onClick={()=>navigate('work-requests')} style={{ background:'none', color:'var(--blue)', fontSize:'12px', cursor:'pointer' }}>View all →</button>
          </div>
          {recentWRs.length === 0
            ? <p style={{ color:'var(--text3)', fontSize:'13px' }}>No pending requests</p>
            : recentWRs.map(wr=>(
              <div key={wr.wr_id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                <Badge label={wr.priority}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'11px', fontFamily:'var(--mono)', color:'var(--text3)' }}>{wr.wr_id}</div>
                  <div style={{ fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{wr.asset_name||wr.description}</div>
                </div>
                <Badge label={wr.status}/>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  )
}
