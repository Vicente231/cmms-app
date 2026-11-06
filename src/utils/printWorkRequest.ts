import type { WorkRequest, WorkRequestItem } from '@/types'

const DEPT_LABELS: Record<string, string> = {
  sawmill: 'Sawmill', planer: 'Planer', electrical: 'Electrical',
  mechanical: 'Mechanical', utilities: 'Utilities', shipping: 'Shipping',
  administration: 'Administration', other: 'Other',
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  corrective: 'Corrective Maintenance', emergency: 'Emergency / Breakdown',
  safety: 'Safety Concern', improvement: 'Improvement Request', other: 'Other',
}

const FAILURE_LABELS: Record<string, string> = {
  mechanical: 'Mechanical', electrical: 'Electrical',
  hydraulic: 'Hydraulic / Pneumatic', structural: 'Structural',
  instrumentation: 'Instrumentation', other: 'Other',
}

const IMPACT_LABELS: Record<string, string> = {
  none: 'No Impact', minor: 'Minor Impact', major: 'Major Impact',
  full_stoppage: 'Full Production Stoppage',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#cc0000', high: '#c45000', medium: '#1a6b1a', low: '#555',
}

function logoDataUrl(): Promise<string> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return fetch(`${base}/wrfp-logo.png`)
    .then(r => r.blob())
    .then(blob => new Promise<string>((res, rej) => {
      const reader = new FileReader()
      reader.onload  = () => res(reader.result as string)
      reader.onerror = rej
      reader.readAsDataURL(blob)
    }))
    .catch(() => '')
}

function thumbUrl(url: string): string {
  const match = url.match(/[?&]id=([^&]+)/)
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w300` : url
}

export async function openPrintWorkRequest(wr: WorkRequest, items: WorkRequestItem[]) {
  const logoSrc = await logoDataUrl()
  const today   = new Date().toLocaleDateString('en-CA')
  const priorityColor = PRIORITY_COLORS[wr.priority] ?? '#555'

  const photoBlock = wr.imageUrls.length > 0
    ? `<div class="section">
        <div class="section-header">Attached Photos</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:8px;">
          ${wr.imageUrls.map(u =>
            `<img src="${thumbUrl(u)}" style="height:120px;width:120px;object-fit:cover;border:1px solid #ddd;border-radius:4px;" />`
          ).join('')}
        </div>
      </div>`
    : ''

  const itemRows = items.length > 0
    ? items.map(it => `
        <tr>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:8px;text-align:center;">
            <span style="background:${it.itemType === 'part' ? '#dbeafe' : '#ffedd5'};color:${it.itemType === 'part' ? '#1d4ed8' : '#c2410c'};padding:1px 4px;border-radius:2px;font-size:7px;font-weight:bold;">${it.itemType.toUpperCase()}</span>
          </td>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:8px;">${it.description}</td>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:8px;text-align:center;">${it.quantity || '—'}</td>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:8px;text-align:center;">${it.unit || '—'}</td>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:8px;">${it.supplier || '—'}</td>
          <td style="padding:3px 6px;border:1px solid #ddd;font-size:8px;text-align:center;font-weight:bold;">${it.status.toUpperCase()}</td>
        </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;padding:8px;font-size:8px;color:#888;border:1px solid #ddd;">No materials or services listed</td></tr>`

  const safetyRow = wr.safetyConcern
    ? `<div style="grid-column:1/-1;background:#fff3cd;border:1px solid #ffc107;border-radius:3px;padding:4px 8px;font-size:8px;">
        <strong style="color:#856404;">&#9888; SAFETY CONCERN:</strong> ${wr.safetyDetail || 'Yes — see description'}
      </div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Work Request ${wr.id}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:10px; color:#111; background:#fff; padding:10px 14px; }

  .header { display:flex; align-items:center; justify-content:space-between; border-bottom:4px solid #1a6b1a; padding-bottom:8px; margin-bottom:8px; }
  .header img { height:55px; }
  .header-right { text-align:right; }
  .header-right h1 { font-size:15px; font-weight:900; color:#1a6b1a; text-transform:uppercase; letter-spacing:1px; }
  .header-right .wr-num { font-size:13px; font-weight:bold; margin-top:2px; }
  .header-right .wr-date { font-size:8px; color:#555; margin-top:2px; }

  .status-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; background:#1a6b1a; padding:6px 10px; border-radius:3px; margin-bottom:7px; }
  .status-bar .item label { color:#fff; font-size:7px; font-weight:bold; text-transform:uppercase; display:block; margin-bottom:2px; }
  .status-bar .item .val { background:#fff; border-radius:2px; padding:2px 5px; font-size:9px; font-weight:bold; min-height:16px; }

  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:7px; }

  .section { margin-bottom:7px; }
  .section-header { background:#1a1a1a; color:#fff; font-size:8px; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; padding:3px 6px; border-radius:3px 3px 0 0; }
  .section-body { border:1px solid #ddd; border-top:none; padding:6px 8px; border-radius:0 0 3px 3px; }

  .info-table { width:100%; border-collapse:collapse; font-size:8px; }
  .info-table td { padding:2px 4px; vertical-align:top; }
  .info-table td:first-child { font-weight:bold; color:#555; white-space:nowrap; width:35%; }

  .classif-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; font-size:8px; }
  .classif-item label { font-weight:bold; color:#555; text-transform:uppercase; font-size:7px; display:block; margin-bottom:2px; }
  .classif-item .val { font-size:9px; }

  .badge { display:inline-block; padding:1px 6px; border-radius:3px; font-weight:bold; font-size:8px; }
  .badge-yes  { background:#fee2e2; color:#dc2626; }
  .badge-no   { background:#dcfce7; color:#16a34a; }
  .badge-prio { color:#fff; }

  .description-text { font-size:9px; line-height:1.6; white-space:pre-wrap; padding:8px; border:1px solid #ddd; border-radius:3px; min-height:60px; }

  .notes-lines { border:1px solid #ddd; border-radius:3px; }
  .notes-line  { border-bottom:1px solid #eee; height:20px; }
  .notes-line:last-child { border-bottom:none; }

  .signatures { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:10px; padding-top:8px; border-top:2px solid #1a6b1a; }
  .sig-block label { font-size:7px; font-weight:bold; text-transform:uppercase; color:#555; display:block; margin-bottom:16px; }
  .sig-name  { font-size:8px; color:#333; font-weight:bold; margin-bottom:2px; }
  .sig-line  { border-bottom:1px solid #444; margin-bottom:3px; }
  .sig-caption { font-size:7px; color:#888; text-align:center; }

  .footer { margin-top:8px; text-align:center; font-size:7px; color:#bbb; border-top:1px solid #eee; padding-top:5px; }
  .footer strong { color:#1a6b1a; }

  .print-btn { background:#1a6b1a; color:#fff; padding:7px 18px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:11px; }

  @media print {
    @page { size:letter portrait; margin:0.5in; }
    body { padding:0; font-size:9px; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>

<div class="no-print" style="background:#1a6b1a;color:#fff;padding:7px 12px;border-radius:4px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
  <span style="font-size:11px;font-weight:bold;">Work Request — ${wr.id}</span>
  <button class="print-btn" onclick="window.print()">&#128424; Print / Save PDF</button>
</div>

<!-- HEADER -->
<div class="header">
  ${logoSrc
    ? `<img src="${logoSrc}" alt="White River Forest Products">`
    : `<div style="background:#1a6b1a;color:#fff;font-size:9px;font-weight:900;padding:7px 10px;border-radius:3px;text-align:center;line-height:1.5;">WHITE RIVER<br>FOREST<br>PRODUCTS</div>`}
  <div class="header-right">
    <h1>Maintenance Work Request</h1>
    <div class="wr-num">${wr.id}</div>
    <div class="wr-date">Date Submitted: ${wr.requestDate ? new Date(wr.requestDate).toLocaleDateString('en-CA') : today} &nbsp;|&nbsp; Generated: ${today}</div>
  </div>
</div>

<!-- STATUS BAR -->
<div class="status-bar">
  <div class="item">
    <label>Priority</label>
    <div class="val"><span class="badge badge-prio" style="background:${priorityColor};">${wr.priority.toUpperCase()}</span></div>
  </div>
  <div class="item">
    <label>Status</label>
    <div class="val">${wr.status.charAt(0).toUpperCase() + wr.status.slice(1)}</div>
  </div>
  <div class="item">
    <label>Request Type</label>
    <div class="val">${REQUEST_TYPE_LABELS[wr.requestType] || wr.requestType || '—'}</div>
  </div>
  <div class="item">
    <label>Preferred Completion</label>
    <div class="val">${wr.preferredDate ? new Date(wr.preferredDate).toLocaleDateString('en-CA') : '—'}</div>
  </div>
</div>

<!-- REQUESTOR + ASSET -->
<div class="two-col">
  <div class="section">
    <div class="section-header">Requestor Information</div>
    <div class="section-body">
      <table class="info-table">
        <tr><td>Name:</td><td>${wr.requestedBy || '—'}</td></tr>
        <tr><td>Department:</td><td>${DEPT_LABELS[wr.department] || wr.department || '—'}</td></tr>
        <tr><td>Contact / Radio:</td><td>${wr.contactPhone || '—'}</td></tr>
      </table>
    </div>
  </div>
  <div class="section">
    <div class="section-header">Equipment / Asset</div>
    <div class="section-body">
      <table class="info-table">
        <tr><td>Name:</td><td><strong>${wr.assetName || '—'}</strong></td></tr>
        <tr><td>Asset Tag:</td><td style="font-family:monospace;">${wr.assetId || '—'}</td></tr>
        <tr><td>Location:</td><td>${wr.assetLocation || '—'}</td></tr>
      </table>
    </div>
  </div>
</div>

<!-- PROBLEM CLASSIFICATION -->
<div class="section">
  <div class="section-header">Problem Classification</div>
  <div class="section-body">
    <div class="classif-grid">
      <div class="classif-item">
        <label>Failure Mode</label>
        <div class="val">${FAILURE_LABELS[wr.failureMode] || wr.failureMode || '—'}</div>
      </div>
      <div class="classif-item">
        <label>Machine / Equipment Down</label>
        <div class="val">
          <span class="badge ${wr.machineDown ? 'badge-yes' : 'badge-no'}">${wr.machineDown ? 'YES — Out of Service' : 'NO — Still Running'}</span>
        </div>
      </div>
      <div class="classif-item">
        <label>Production Impact</label>
        <div class="val">${IMPACT_LABELS[wr.productionImpact] || wr.productionImpact || '—'}</div>
      </div>
      <div class="classif-item">
        <label>Safety Concern</label>
        <div class="val">
          <span class="badge ${wr.safetyConcern ? 'badge-yes' : 'badge-no'}">${wr.safetyConcern ? 'YES' : 'NO'}</span>
        </div>
      </div>
      ${safetyRow}
    </div>
  </div>
</div>

<!-- PROBLEM DESCRIPTION -->
<div class="section">
  <div class="section-header">Problem Description</div>
  <div class="section-body">
    <div class="description-text">${wr.description || '—'}</div>
  </div>
</div>

${photoBlock}

<!-- MATERIALS & SERVICES -->
<div class="section">
  <div class="section-header">Materials &amp; Services Required</div>
  <div style="border:1px solid #ddd;border-top:none;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:4px 6px;border:1px solid #ddd;font-size:8px;text-transform:uppercase;width:10%;">Type</th>
          <th style="padding:4px 6px;border:1px solid #ddd;font-size:8px;text-transform:uppercase;width:35%;">Description</th>
          <th style="padding:4px 6px;border:1px solid #ddd;font-size:8px;text-transform:uppercase;width:8%;">Qty</th>
          <th style="padding:4px 6px;border:1px solid #ddd;font-size:8px;text-transform:uppercase;width:8%;">Unit</th>
          <th style="padding:4px 6px;border:1px solid #ddd;font-size:8px;text-transform:uppercase;width:22%;">Supplier / Contractor</th>
          <th style="padding:4px 6px;border:1px solid #ddd;font-size:8px;text-transform:uppercase;width:12%;">Status</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>
</div>

<!-- PLANNING NOTES -->
<div class="section">
  <div class="section-header">Planning Notes / Scope of Work</div>
  <div class="section-body">
    ${wr.notes
      ? `<div style="font-size:9px;white-space:pre-wrap;line-height:1.6;">${wr.notes}</div>`
      : `<div class="notes-lines">${Array(5).fill('<div class="notes-line"></div>').join('')}</div>`}
  </div>
</div>

<!-- SIGNATURES -->
<div class="signatures">
  <div class="sig-block">
    <label>Requested By</label>
    <div class="sig-name">${wr.requestedBy || ''}</div>
    <div class="sig-line"></div>
    <div class="sig-caption">Signature &amp; Date</div>
  </div>
  <div class="sig-block">
    <label>Supervisor Approval</label>
    <div class="sig-line"></div>
    <div class="sig-caption">Name / Signature / Date</div>
  </div>
  <div class="sig-block">
    <label>Work Order # Assigned</label>
    <div class="val" style="font-family:monospace;font-size:11px;font-weight:bold;margin-bottom:8px;">${wr.convertedToWo || '___________________'}</div>
    <div class="sig-line"></div>
    <div class="sig-caption">Maintenance Supervisor</div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <strong>White River Forest Products</strong> — Maintenance Work Request ${wr.id} &nbsp;|&nbsp; Generated: ${today}
</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
