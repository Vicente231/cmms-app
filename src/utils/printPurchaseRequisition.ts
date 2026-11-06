import type { CostCode } from '@/data/costCodes'

export type PRLineItem = {
  description: string
  partNumber: string
  qty: number
  unit: string
  unitCost: number
}

export type PRPrintData = {
  prNumber: string
  date: string
  requestedBy: string
  department: string
  requiredBy: string
  vendorName: string
  vendorContact: string
  costCode: string
  costCodeMeta?: CostCode
  taxRate: number
  justification: string
  lineItems: PRLineItem[]
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

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d)
  return isNaN(dt.getTime()) ? d : `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`
}

function fmtMoney(n: number) {
  return n === 0 ? '' : `$${n.toFixed(2)}`
}

function esc(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function row(qty = '', unit = '', desc = '', price = '', cc = '', total = '') {
  return `<tr>
    <td></td>
    <td class="r">${qty}</td>
    <td class="c">${unit}</td>
    <td>${desc}</td>
    <td class="r">${price}</td>
    <td class="c">${cc}</td>
    <td class="r">${total}</td>
  </tr>`
}

export async function openPrintPurchaseRequisition(data: PRPrintData) {
  const logoSrc = await logoDataUrl()
  const dateStr = fmtDate(data.date || new Date().toISOString().slice(0, 10))

  // Same layout as the paper form: item line, part number line below it, then a blank line.
  // Each page holds ROWS_PER_PAGE grid lines; an item never splits across pages.
  const ROWS_PER_PAGE = 20
  const DESC_CHARS_PER_LINE = 40
  const lines = (s: string) => Math.max(1, Math.ceil((s || '').length / DESC_CHARS_PER_LINE))

  type Block = { rows: string[]; size: number }
  const blocks: Block[] = data.lineItems
    .filter(it => it.description?.trim() || it.partNumber?.trim())
    .map(it => {
      const ext = (Number(it.qty) || 0) * (Number(it.unitCost) || 0)
      const rows = [row(
        esc(String(it.qty || '')),
        esc(it.unit || ''),
        esc(it.description || ''),
        fmtMoney(Number(it.unitCost) || 0),
        esc(data.costCode || ''),
        fmtMoney(ext),
      )]
      let size = lines(it.description)
      if (it.partNumber?.trim()) { rows.push(row('', '', esc(it.partNumber))); size += lines(it.partNumber) }
      return { rows, size }
    })

  const justLines = (data.justification || '').split('\n').filter(l => l.trim())
  if (justLines.length) {
    blocks.push({
      rows: [row(), ...justLines.map(line => row('', '', esc(line)))],
      size: 1 + justLines.reduce((s, l) => s + lines(l), 0),
    })
  }

  // Pack blocks into pages; a blank separator row follows each block when room allows
  const pageRows: string[][] = []
  let cur: string[] = []
  let used = 0
  const closePage = () => {
    for (; used < ROWS_PER_PAGE; used++) cur.push(row())
    pageRows.push(cur); cur = []; used = 0
  }
  blocks.forEach(b => {
    if (used > 0 && used + b.size > ROWS_PER_PAGE) closePage()
    cur.push(...b.rows); used += b.size
    if (used < ROWS_PER_PAGE) { cur.push(row()); used++ }
  })
  closePage()

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="White River Forest Products">`
    : ''

  const colgroup = `<colgroup>
    <col style="width:3.1%"><col style="width:7.6%"><col style="width:6.8%">
    <col style="width:37.8%"><col style="width:8.9%"><col style="width:26.8%"><col style="width:9%">
  </colgroup>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Purchase Requisition ${esc(data.prNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Calibri, Carlito, Arial, sans-serif; font-size: 9pt; color: #000; background: #fff; padding: 24px 30px; }

  .header { width: 78%; text-align: center; }
  .header img { max-height: 120px; display: block; margin: 0 auto 8px; }
  .header h1 { font-family: Arial, sans-serif; font-size: 14pt; font-weight: bold; line-height: 1.3; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { font-size: 9pt; font-weight: normal; padding: 0 3px; overflow-wrap: anywhere; }
  th { white-space: nowrap; }

  .date-row { margin-top: 26px; margin-bottom: 14px; }
  .date-row td { border: none; }

  .grid th { border: 1px solid #000; height: 36px; vertical-align: bottom; text-align: center; }
  .grid th.l { text-align: left; }
  .grid td { border: 1px solid #000; height: 24px; vertical-align: bottom; }
  .grid tbody tr td { border-top: none; }
  .grid tbody tr + tr td { border-top: 1px solid #000; }
  .r { text-align: right; }
  .c { text-align: center; }

  .foot td { vertical-align: top; }
  .foot .total { border: 1px solid #000; border-top: none; height: 24px; vertical-align: bottom; }
  .foot .left  { border-left: 1px solid #000; border-bottom: 1px solid #000; }
  .foot .gap   { border-right: 1px solid #000; }
  .foot .mid   { border-right: 1px solid #000; border-bottom: 1px solid #000; }
  .foot .req   { border-right: 1px solid #000; border-bottom: 1px solid #000; padding-top: 37px; }
  .foot .appr  { height: 54px; padding-top: 12px; }
  .req-name    { text-align: center; padding-top: 18px; padding-bottom: 2px; }

  .page { page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .page + .page { margin-top: 40px; }

  .bottom { display: flex; justify-content: space-between; align-items: flex-end; }
  .contact { margin: 18px 0 0 30px; font-size: 9pt; line-height: 1.25; }
  .page-no { font-size: 9pt; }
  .contact a { color: #0563c1; }

  .no-print-bar { background: #1a1a1a; color: #fff; padding: 7px 12px; margin-bottom: 14px;
    display: flex; justify-content: space-between; align-items: center; border-radius: 4px;
    font-family: Arial, sans-serif; }
  .print-btn { background: #fff; color: #1a1a1a; border: none; padding: 6px 16px;
    font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 11px; }

  @media print {
    @page { size: letter portrait; margin: 0.4in; }
    body { padding: 0; }
    .page + .page { margin-top: 0; }
    .no-print-bar { display: none !important; }
  }
</style>
</head>
<body>

<div class="no-print-bar">
  <span style="font-size:11px;font-weight:bold;">Purchase Requisition — ${esc(data.prNumber)}</span>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save PDF</button>
</div>

${pageRows.map((rows, i) => pageHtml(rows, i + 1)).join('')}

</body>
</html>`

  function pageHtml(rows: string[], pageNo: number) {
    return `<div class="page">
<div class="header">
  ${logoHtml}
  <h1>PURCHASE REQUISITION<br>WHITE RIVER FOREST PRODUCTS</h1>
</div>

<table class="date-row">
  ${colgroup}
  <tr>
    <td></td><td></td><td></td><td></td>
    <td>DATE:</td>
    <td class="r">${dateStr}</td>
    <td></td>
  </tr>
</table>

<table class="grid">
  ${colgroup}
  <thead>
    <tr>
      <th class="l">#</th>
      <th>QUANTITY</th>
      <th>UNIT</th>
      <th>DESCRIPTION</th>
      <th>PRICE</th>
      <th>COST CENTER</th>
      <th>TOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join('')}
  </tbody>
</table>

<table class="foot">
  ${colgroup}
  <tr>
    <td colspan="2" class="total" style="border-right:1px solid #000;">TOTAL</td>
    <td class="gap" style="border-bottom:none;"></td>
    <td rowspan="2" class="mid"></td>
    <td rowspan="2" colspan="3" class="req">
      REQUISITIONER
      <div class="req-name">${esc(data.requestedBy || '')}</div>
    </td>
  </tr>
  <tr>
    <td colspan="3" class="left appr" style="border-right:1px solid #000;">APPROVAL PERSON</td>
  </tr>
</table>

<div class="bottom">
  <div class="contact">
    Jayne Kisch<br>
    <a href="mailto:jayne.kisch@wrfp.ca">jayne.kisch@wrfp.ca</a><br>
    315 Hwy 17, Box 520<br>
    White River,Ontario<br>
    807-822-1818 ext 224
  </div>
  <div class="page-no">Page ${pageNo} of ${pageRows.length}</div>
</div>
</div>`
  }

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
