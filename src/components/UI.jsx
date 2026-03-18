import React from 'react'

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE = {
  ACTIVE:'#3fb950', INACTIVE:'#555', MAINTENANCE:'#d29922', DECOMMISSIONED:'#f85149',
  OPEN:'#388bfd', IN_PROGRESS:'#d29922', ASSIGNED:'#a371f7',
  COMPLETED:'#3fb950', CLOSED:'#444', CANCELLED:'#f85149',
  CRITICAL:'#f85149', HIGH:'#d29922', MEDIUM:'#388bfd', LOW:'#555',
  PENDING:'#d29922', REVIEWED:'#388bfd', CONVERTED:'#3fb950',
  CM:'#f85149', PM:'#3fb950', PRJ:'#a371f7',
  admin:'#f85149', supervisor:'#d29922', technician:'#388bfd',
}
export function Badge({ label, color }) {
  const c = color || BADGE[label] || '#555'
  return (
    <span style={{
      display:'inline-block', padding:'2px 7px', borderRadius:'3px',
      fontSize:'11px', fontWeight:500, letterSpacing:'.04em',
      background:`${c}1a`, color:c, border:`1px solid ${c}33`,
      fontFamily:'var(--mono)', textTransform:'uppercase', whiteSpace:'nowrap',
    }}>{label}</span>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant='primary', size='md', disabled, type='button', style={} }) {
  const sm = size === 'sm'
  const s = {
    primary:   { bg:'var(--blue)',                 color:'#fff',          border:'none' },
    secondary: { bg:'var(--bg4)',                  color:'var(--text)',   border:'1px solid var(--border2)' },
    danger:    { bg:'rgba(248,81,73,.12)',          color:'var(--red)',    border:'1px solid rgba(248,81,73,.3)' },
    ghost:     { bg:'transparent',                 color:'var(--text2)',  border:'none' },
    success:   { bg:'rgba(63,185,80,.12)',          color:'var(--green)',  border:'1px solid rgba(63,185,80,.3)' },
  }[variant]
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{
        display:'inline-flex', alignItems:'center', gap:'5px',
        padding: sm ? '4px 9px' : '6px 13px',
        fontSize: sm ? '12px' : '13px', fontWeight:500,
        borderRadius:'var(--radius)', background:s.bg, color:s.color, border:s.border,
        opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.filter='brightness(1.12)' }}
      onMouseLeave={e=>{ e.currentTarget.style.filter='' }}
    >{children}</button>
  )
}

// ── Input / Select / Textarea ─────────────────────────────────────────────────
export function Field({ label, required, unit, hint, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
      {label && (
        <label style={{ fontSize:'12px', color:'var(--text2)', fontWeight:500, display:'flex', gap:'4px' }}>
          {label}
          {required && <span style={{color:'var(--red)'}}>*</span>}
          {unit    && <span style={{color:'var(--text3)'}}>({unit})</span>}
        </label>
      )}
      {children}
      {hint && <span style={{ fontSize:'11px', color:'var(--text3)' }}>{hint}</span>}
    </div>
  )
}

const inputBase = {
  width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)',
  borderRadius:'var(--radius)', color:'var(--text)', padding:'7px 10px', fontSize:'13px',
}

export function Input({ label, value, onChange, type='text', placeholder, required, unit, hint, disabled, style={} }) {
  return (
    <Field label={label} required={required} unit={unit} hint={hint}>
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        style={{...inputBase,...style}}
        onFocus={e=>e.target.style.borderColor='var(--blue)'}
        onBlur={e=>e.target.style.borderColor='var(--border2)'}
      />
    </Field>
  )
}

export function Select({ label, value, onChange, options=[], required, hint, disabled }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <select value={value||''} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={inputBase}
        onFocus={e=>e.target.style.borderColor='var(--blue)'}
        onBlur={e=>e.target.style.borderColor='var(--border2)'}
      >
        <option value=''>— select —</option>
        {options.map(o => {
          const v = typeof o === 'object' ? o.value : o
          const l = typeof o === 'object' ? o.label : o
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </Field>
  )
}

export function Textarea({ label, value, onChange, placeholder, required, rows=3, hint }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <textarea value={value||''} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{...inputBase, resize:'vertical'}}
        onFocus={e=>e.target.style.borderColor='var(--blue)'}
        onBlur={e=>e.target.style.borderColor='var(--border2)'}
      />
    </Field>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width='520px', footer }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className='fade-in' style={{
        background:'var(--bg2)', border:'1px solid var(--border2)',
        borderRadius:'var(--radius-lg)', width:'100%', maxWidth:width,
        maxHeight:'92vh', display:'flex', flexDirection:'column',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <span style={{ fontWeight:600, fontSize:'14px' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', color:'var(--text3)', fontSize:'20px', lineHeight:1, padding:'0 4px' }}>×</button>
        </div>
        <div style={{ padding:'18px', overflowY:'auto', flex:1 }}>{children}</div>
        {footer && <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:'8px', flexShrink:0 }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style={}, onClick }) {
  return (
    <div style={{
      background:'var(--bg2)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:'16px',
      cursor: onClick?'pointer':'default', transition:'var(--trans)', ...style,
    }}
      onMouseEnter={e=>{ if(onClick){e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.background='var(--bg3)'}}}
      onMouseLeave={e=>{ if(onClick){e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg2)'}}}
      onClick={onClick}
    >{children}</div>
  )
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'22px' }}>
      <div>
        <h1 style={{ fontSize:'20px', fontWeight:600, letterSpacing:'-.02em' }}>{title}</h1>
        {subtitle && <p style={{ color:'var(--text2)', fontSize:'13px', marginTop:'3px' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function Stat({ label, value, color='var(--text)', onClick }) {
  return (
    <Card onClick={onClick} style={{ cursor: onClick?'pointer':'default' }}>
      <div style={{ fontSize:'11px', color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase', fontFamily:'var(--mono)', marginBottom:'8px' }}>{label}</div>
      <div style={{ fontSize:'26px', fontWeight:600, fontFamily:'var(--mono)', color }}>{value}</div>
    </Card>
  )
}

// ── Grid ──────────────────────────────────────────────────────────────────────
export function Grid({ children, cols=2, gap=14 }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap }}>
      {children}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'14px 0 10px' }}>
      {label && <span style={{ fontSize:'11px', color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>{label}</span>}
      <div style={{ flex:1, height:'1px', background:'var(--border)' }}/>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size=16 }) {
  return <div style={{ width:size, height:size, border:'2px solid var(--border2)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin .65s linear infinite', flexShrink:0 }}/>
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon='◫', message='Nothing here yet' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', padding:'52px 20px', color:'var(--text3)' }}>
      <span style={{ fontSize:'28px', opacity:.4 }}>{icon}</span>
      <span style={{ fontSize:'13px' }}>{message}</span>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ cols, rows, onRowClick }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {cols.map(c => (
              <th key={c.key||c.label} style={{ padding:'9px 14px', textAlign:'left', fontSize:'11px', color:'var(--text3)', fontWeight:500, letterSpacing:'.05em', textTransform:'uppercase', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid var(--border)', cursor: onRowClick?'pointer':'default' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
              onMouseLeave={e=>e.currentTarget.style.background=''}
              onClick={()=>onRowClick?.(row)}
            >
              {cols.map(c => (
                <td key={c.key||c.label} style={{ padding:'9px 14px', fontSize:'13px', whiteSpace: c.wrap?'normal':'nowrap', ...c.style }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ message, type='error', onClose }) {
  const colors = { error:'var(--red)', warning:'var(--amber)', success:'var(--green)', info:'var(--blue)' }
  const c = colors[type]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:`${c}15`, border:`1px solid ${c}33`, borderRadius:'var(--radius)', fontSize:'13px', color:c, marginBottom:'12px' }}>
      <span style={{ flex:1 }}>{message}</span>
      {onClose && <button onClick={onClose} style={{ background:'none', color:c, fontSize:'16px', lineHeight:1 }}>×</button>}
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder='Search…', children }) {
  return (
    <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ flex:1, minWidth:'180px', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', color:'var(--text)', padding:'7px 12px', fontSize:'13px' }}
        onFocus={e=>e.target.style.borderColor='var(--blue)'}
        onBlur={e=>e.target.style.borderColor='var(--border2)'}
      />
      {children}
    </div>
  )
}

// ── FilterSelect ──────────────────────────────────────────────────────────────
export function FilterSelect({ value, onChange, options, placeholder='All' }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', color: value?'var(--text)':'var(--text2)', padding:'7px 10px', fontSize:'13px' }}>
      <option value=''>{placeholder}</option>
      {options.map(o=>{
        const v = typeof o==='object'?o.value:o
        const l = typeof o==='object'?o.label:o
        return <option key={v} value={v}>{l}</option>
      })}
    </select>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
export function ConfirmModal({ title, message, onConfirm, onClose, danger=true }) {
  return (
    <Modal title={title} onClose={onClose} width='380px'
      footer={<>
        <Btn variant='secondary' onClick={onClose}>Cancel</Btn>
        <Btn variant={danger?'danger':'primary'} onClick={onConfirm}>Confirm</Btn>
      </>}
    >
      <p style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.6 }}>{message}</p>
    </Modal>
  )
}
