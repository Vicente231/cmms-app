import type { Asset } from '@/types'
import type { GASMaintenanceTask } from '@/lib/api'

export type OperationMode = 'RUNNING' | 'LOCKOUT' | 'ALL'

export interface ChecklistConfig {
  id: string
  name: string
  location: string
  assetType: string
  operationMode: OperationMode
  description?: string
  createdAt: string
}

const STORAGE_KEY = 'cmms_checklist_configs'

export function loadConfigs(): ChecklistConfig[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

export function saveConfigs(configs: ChecklistConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

function hp(asset: Asset): number | null {
  const v = asset.attrs?.['horsepower']
  return v != null ? Number(v) : null
}

function logoDataUrl(): Promise<string> {
  return fetch('/cmms-app/wrfp-logo.png')
    .then(r => r.blob())
    .then(blob => new Promise<string>((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.onerror = rej
      reader.readAsDataURL(blob)
    }))
    .catch(() => '')
}

export async function openPrintChecklist(
  config: ChecklistConfig,
  assets: Asset[],
  tasks: GASMaintenanceTask[]
) {
  const logoSrc = await logoDataUrl()

  const filtered = assets.filter(a => {
    const loc = (a.location as { name?: string })?.name ?? ''
    return loc.trim().toLowerCase() === config.location.trim().toLowerCase()
      && (a.model ?? '') === config.assetType
  })

  const active   = filtered.filter(a => String(a.status).toUpperCase() !== 'INACTIVE')
  const inactive = filtered.filter(a => String(a.status).toUpperCase() === 'INACTIVE')

  const byType = tasks.filter(t => t.asset_type === config.assetType)
  const taskCols = byType.filter(t => {
    if (config.operationMode === 'ALL') return true
    const s = (t.safety ?? '').toUpperCase()
    if (config.operationMode === 'RUNNING') return s.includes('RUNNING')
    if (config.operationMode === 'LOCKOUT') return s.includes('LOCKOUT') || s.includes('LOTO')
    return true
  })

  // Safety color coding
  function safetyStyle(safety: string | undefined): { bg: string; color: string; label: string } {
    const s = (safety ?? '').toUpperCase()
    if (s.includes('RUNNING'))  return { bg: '#1a6b1a', color: '#fff', label: 'RUNNING' }
    if (s.includes('LOCKOUT'))  return { bg: '#c45000', color: '#fff', label: 'LOTO' }
    if (s.includes('HOT WORK')) return { bg: '#cc0000', color: '#fff', label: 'HOT' }
    if (s.includes('CONFINED')) return { bg: '#7700cc', color: '#fff', label: 'CS' }
    return { bg: '#555', color: '#fff', label: safety ?? '' }
  }

  // Column headers: task numbers with safety color
  const colW = Math.floor(48 / Math.max(taskCols.length, 1))
  const thCols = taskCols.map((t, i) => {
    const s = safetyStyle(t.safety)
    return `<th style="width:${colW}%;text-align:center;padding:3px 1px;font-size:9px;border:1px solid #999;font-weight:bold;background:${s.bg};color:${s.color};">${i + 1}</th>`
  }).join('')

  // Legend rows — 2 per line to save space
  const legendItems = taskCols.map((t, i) => {
    const s = safetyStyle(t.safety)
    const badge = `<span style="background:${s.bg};color:${s.color};font-size:6px;padding:1px 3px;border-radius:2px;font-weight:bold;margin-left:2px;">${s.label}</span>`
    const meas  = t.measurement_unit ? ` <span style="color:#1a6b1a;font-size:7px;">(${t.measurement_unit}${t.pass_condition ? ` ${t.pass_condition}` : ''})</span>` : ''
    return `<span style="margin-right:12px;white-space:nowrap;"><strong>${i + 1}.</strong> ${t.description}${badge}${meas}</span>`
  })

  // Split legend into rows of 2
  const legendRows: string[] = []
  for (let i = 0; i < legendItems.length; i += 2) {
    legendRows.push(`<div style="display:flex;margin-bottom:2px;">${legendItems.slice(i, i + 2).join('')}</div>`)
  }

  function motorRow(a: Asset, isInactive = false): string {
    const hpVal = hp(a)
    const hpStr = hpVal != null ? `${hpVal} HP` : '—'
    const tag   = a.assetTag ?? ''
    const name  = a.name ?? ''

    const cbCols = isInactive
      ? taskCols.map(() => `<td style="text-align:center;border:1px solid #ddd;color:#bbb;font-size:8px;">—</td>`).join('')
      : taskCols.map(t => {
          const isGrease = t.description.toLowerCase().includes('grease') || t.description.toLowerCase().includes('lubric')
          if (isGrease && hpVal != null && hpVal <= 30) {
            return `<td style="text-align:center;border:1px solid #ddd;font-size:7px;color:#aaa;background:#f8f8f8;">N/A</td>`
          }
          const s = safetyStyle(t.safety)
          const cellBg = (t.safety ?? '').toUpperCase().includes('RUNNING') ? '#f0faf0' : '#fff8f4'
          if (t.measurement_unit) {
            return `<td style="text-align:center;border:1px solid #ddd;padding:3px 2px;background:${cellBg};vertical-align:bottom;">
              <div style="border-bottom:1px solid #999;min-height:18px;margin-bottom:1px;"></div>
              <div style="font-size:6px;color:${s.bg};font-weight:bold;white-space:nowrap;">${t.measurement_unit}</div>
            </td>`
          }
          return `<td style="text-align:center;border:1px solid #ddd;padding:2px;background:${cellBg};">
            <div style="width:12px;height:12px;border:1.5px solid ${s.bg};border-radius:2px;margin:auto;"></div>
          </td>`
        }).join('')

    const rowBg = isInactive ? 'background:#f5f5f5;' : ''

    return `
      <tr style="${rowBg}page-break-inside:avoid;">
        <td style="padding:3px 5px;border:1px solid #ddd;${isInactive ? 'color:#aaa;font-style:italic;' : ''}">
          <div style="font-size:7px;color:#999;font-family:monospace;line-height:1.2;">${tag}</div>
          <div style="font-weight:bold;font-size:9px;line-height:1.3;">${name}</div>
          ${isInactive ? '<span style="font-size:7px;background:#fcc;color:#c00;padding:1px 3px;border-radius:2px;font-weight:bold;">INACTIVE</span>' : ''}
        </td>
        <td style="text-align:center;border:1px solid #ddd;font-size:9px;font-weight:bold;color:#1a6b1a;white-space:nowrap;">${hpStr}</td>
        ${cbCols}
        <td style="border:1px solid #ddd;min-width:50px;"></td>
      </tr>`
  }

  const activeRows   = active.map(a => motorRow(a, false)).join('')
  const inactiveRows = inactive.length
    ? `<tr style="background:#333;">
        <td colspan="${taskCols.length + 3}" style="padding:3px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#fff;">
          Inactive / Out of Service — Do Not Perform
        </td>
       </tr>
       ${inactive.map(a => motorRow(a, true)).join('')}`
    : ''

  const today = new Date().toLocaleDateString('en-CA')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${config.name} — PM Checklist</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:10px; color:#111; background:#fff; padding:10px 14px; }

  .header { display:flex; align-items:center; justify-content:space-between; border-bottom:4px solid #1a6b1a; padding-bottom:8px; margin-bottom:8px; }
  .header img { height:55px; }
  .header-title h1 { font-size:15px; font-weight:900; color:#1a6b1a; text-transform:uppercase; letter-spacing:1px; }
  .header-title h2 { font-size:11px; font-weight:bold; margin-top:2px; }
  .header-title p  { font-size:8px; color:#555; margin-top:2px; font-style:italic; }

  .info-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; background:#1a6b1a; padding:6px 10px; border-radius:3px; margin-bottom:7px; }
  .info-bar label { color:#fff; font-size:7px; font-weight:bold; text-transform:uppercase; display:block; margin-bottom:2px; }
  .info-bar .field { background:#fff; border-radius:2px; height:16px; }

  .legend { font-size:8px; color:#333; margin-bottom:6px; padding:5px 8px; border:1px solid #ddd; border-radius:3px; background:#fafafa; line-height:1.6; }
  .legend strong { color:#1a6b1a; }

  table { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:9px; }
  thead tr { background:#1a1a1a; color:#fff; }
  thead th { padding:4px 2px; text-align:center; font-size:8px; text-transform:uppercase; border:1px solid #555; vertical-align:bottom; }
  thead th.left { text-align:left; padding-left:5px; }
  tbody tr:nth-child(even) { background:#f8f8f8; }

  .notes-box { margin-bottom:8px; }
  .notes-box .label { background:#111; color:#fff; font-size:8px; font-weight:bold; text-transform:uppercase; padding:3px 6px; border-radius:3px 3px 0 0; }
  .notes-box .lines { border:1px solid #ccc; border-top:none; height:36px; border-radius:0 0 3px 3px; }

  .signatures { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:8px; padding-top:8px; border-top:2px solid #1a6b1a; }
  .sig-block label { font-size:7px; font-weight:bold; text-transform:uppercase; color:#555; display:block; margin-bottom:16px; }
  .sig-line { border-bottom:1px solid #444; margin-bottom:3px; }
  .sig-caption { font-size:7px; color:#888; text-align:center; }

  .footer { margin-top:8px; text-align:center; font-size:7px; color:#bbb; border-top:1px solid #eee; padding-top:5px; }
  .footer strong { color:#1a6b1a; }

  .print-btn { background:#1a6b1a; color:#fff; padding:7px 18px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:11px; }

  @media print {
    @page { size:letter portrait; margin:0.4in; }
    body { padding:0; font-size:9px; }
    thead { display:table-header-group; }
    tr { page-break-inside:avoid; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>

<div class="no-print" style="background:#1a6b1a;color:#fff;padding:7px 12px;border-radius:4px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
  <span style="font-size:11px;font-weight:bold;">Preview — ${config.name}</span>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
</div>

<!-- HEADER -->
<div class="header">
  ${logoSrc
    ? `<img src="${logoSrc}" alt="White River Forest Products">`
    : `<div style="background:#1a6b1a;color:#fff;font-size:9px;font-weight:900;padding:7px 10px;border-radius:3px;text-align:center;line-height:1.5;">WHITE RIVER<br>FOREST<br>PRODUCTS</div>`}
  <div class="header-title" style="text-align:right;">
    <h1>Preventive Maintenance Checklist</h1>
    <h2>${config.name}</h2>
    <p>${config.location} &nbsp;|&nbsp; Type: ${config.assetType} &nbsp;|&nbsp; Mode: ${config.operationMode === 'RUNNING' ? 'Machine Running' : config.operationMode === 'LOCKOUT' ? 'Lockout / Tagout' : 'All Tasks'} &nbsp;|&nbsp; ${config.description || 'Growing Our Future — A Community Based Venture'}</p>
  </div>
</div>

<!-- OPERATION MODE BANNER -->
${config.operationMode !== 'ALL' ? `
<div style="margin-bottom:6px;padding:4px 10px;border-radius:3px;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;
  background:${config.operationMode === 'RUNNING' ? '#1a6b1a' : '#c45000'};color:#fff;display:flex;align-items:center;gap:8px;">
  ${config.operationMode === 'RUNNING'
    ? '&#9889; MACHINE RUNNING — Tasks in this checklist are performed while the machine is energized'
    : '&#128274; LOCKOUT / TAGOUT REQUIRED — De-energize and lock out equipment before beginning any task'}
</div>` : ''}

<!-- INFO BAR -->
<div class="info-bar">
  <div><label>Date</label><div class="field"></div></div>
  <div><label>Work Order #</label><div class="field"></div></div>
  <div><label>Technician</label><div class="field"></div></div>
  <div><label>Shift</label><div class="field"></div></div>
</div>

<!-- TASK LEGEND -->
${taskCols.length > 0 ? `
<div class="legend">
  <strong>Task Reference</strong> &nbsp;|&nbsp; &#9744; Check &amp; initial &nbsp;|&nbsp; <span style="color:#aaa;font-size:7px;">N/A</span> = Not applicable &nbsp;|&nbsp;
  <span style="background:#1a6b1a;color:#fff;font-size:7px;padding:1px 4px;border-radius:2px;font-weight:bold;">RUNNING</span> Machine energized &nbsp;
  <span style="background:#c45000;color:#fff;font-size:7px;padding:1px 4px;border-radius:2px;font-weight:bold;">LOTO</span> Lockout Tagout required<br>
  ${legendRows.join('')}
</div>` : ''}

<!-- TABLE -->
<table>
  <thead>
    <tr>
      <th class="left" style="width:${taskCols.length > 8 ? 24 : 28}%;">Equipment</th>
      <th style="width:5%;">HP</th>
      ${thCols}
      <th class="left" style="min-width:45px;">Notes</th>
    </tr>
  </thead>
  <tbody>
    ${activeRows || `<tr><td colspan="${taskCols.length + 3}" style="text-align:center;padding:10px;color:#888;">No active assets found for ${config.location} / ${config.assetType}</td></tr>`}
    ${inactiveRows}
  </tbody>
</table>

<!-- GENERAL NOTES -->
<div class="notes-box">
  <div class="label">General Notes / Observations</div>
  <div class="lines"></div>
</div>

<!-- SIGNATURES -->
<div class="signatures">
  <div class="sig-block"><label>Technician Signature</label><div class="sig-line"></div><div class="sig-caption">Signature &amp; Date</div></div>
  <div class="sig-block"><label>Reviewed By (Supervisor)</label><div class="sig-line"></div><div class="sig-caption">Signature &amp; Date</div></div>
  <div class="sig-block"><label>Next PM Due Date</label><div class="sig-line"></div><div class="sig-caption">Date</div></div>
</div>

<!-- FOOTER -->
<div class="footer">
  <strong>White River Forest Products</strong> — ${config.name} &nbsp;|&nbsp; Generated: ${today} &nbsp;|&nbsp; ${filtered.length} equipment listed
</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
