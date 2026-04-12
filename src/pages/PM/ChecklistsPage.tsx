import { useState } from 'react'
import { useAssets } from '@/hooks/useAssets'
import { useMaintenanceTasks } from '@/hooks/usePMSchedules'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/ui/use-toast'
import { useForm, Controller } from 'react-hook-form'
import { Plus, Pencil, Trash2, FileText, ClipboardList } from 'lucide-react'
import type { GASMaintenanceTask } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface ChecklistConfig {
  id: string
  name: string
  location: string
  assetType: string
  operationMode: 'ALL' | 'RUNNING' | 'LOCKOUT'
  description?: string
  createdAt: string
}

// ── LocalStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'cmms_checklist_configs'

function loadConfigs(): ChecklistConfig[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveConfigs(configs: ChecklistConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

// ── Logo loader ─────────────────────────────────────────────────────────────

function loadLogo(): Promise<string> {
  return fetch('/cmms-app/wrfp-logo.png')
    .then(r => r.blob())
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    }))
    .catch(() => '')
}

// ── HP extractor ─────────────────────────────────────────────────────────────

function getHP(asset: Record<string, unknown>): number | null {
  const hp = (asset.attrs as Record<string, unknown>)?.horsepower
  return hp != null ? Number(hp) : null
}

// ── Safety badge helper ──────────────────────────────────────────────────────

function safetyStyle(safety: string | undefined) {
  const s = (safety ?? '').toUpperCase()
  if (s.includes('RUNNING'))  return { bg: '#1a6b1a', color: '#fff', label: 'RUNNING' }
  if (s.includes('LOCKOUT'))  return { bg: '#c45000', color: '#fff', label: 'LOTO' }
  if (s.includes('HOT WORK')) return { bg: '#cc0000', color: '#fff', label: 'HOT' }
  if (s.includes('CONFINED')) return { bg: '#7700cc', color: '#fff', label: 'CS' }
  return { bg: '#555', color: '#fff', label: safety ?? '' }
}

// ── HTML generation ──────────────────────────────────────────────────────────

async function generateChecklist(
  config: ChecklistConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assets: any[],
  tasks: GASMaintenanceTask[]
) {
  const logo = await loadLogo()

  const allMatching = assets.filter(a => {
    const loc = (a.location?.name ?? a.location ?? '').toString().trim().toLowerCase()
    return loc === config.location.trim().toLowerCase() && (a.model ?? '') === config.assetType
  })
  const activeAssets   = allMatching.filter(a => String(a.status).toUpperCase() !== 'INACTIVE')
  const inactiveAssets = allMatching.filter(a => String(a.status).toUpperCase() === 'INACTIVE')

  const filteredTasks = tasks
    .filter(t => t.asset_type === config.assetType)
    .filter(t => {
      if (config.operationMode === 'ALL') return true
      const s = (t.safety ?? '').toUpperCase()
      return config.operationMode === 'RUNNING'
        ? s.includes('RUNNING')
        : s.includes('LOCKOUT') || s.includes('LOTO')
    })

  const taskColWidth = Math.floor(48 / Math.max(filteredTasks.length, 1))

  // Table header cells (numbered columns)
  const headerCells = filteredTasks.map((t, i) => {
    const st = safetyStyle(t.safety)
    return `<th style="width:${taskColWidth}%;text-align:center;padding:3px 1px;font-size:9px;border:1px solid #999;font-weight:bold;background:${st.bg};color:${st.color};">${i + 1}</th>`
  }).join('')

  // Legend items — HORIZONTAL: all in one flex-wrap row
  const legendItems = filteredTasks.map((t, i) => {
    const st = safetyStyle(t.safety)
    const badge = `<span style="background:${st.bg};color:${st.color};font-size:6px;padding:1px 3px;border-radius:2px;font-weight:bold;margin-left:2px;">${st.label}</span>`
    const unit  = t.measurement_unit
      ? ` <span style="color:#1a6b1a;font-size:7px;">(${t.measurement_unit}${t.pass_condition ? ` ${t.pass_condition}` : ''})</span>`
      : ''
    return `<span style="margin-right:16px;white-space:nowrap;"><strong>${i + 1}.</strong> ${t.description}${badge}${unit}</span>`
  })

  // Single horizontal flex row (was: pairs stacked vertically)
  const legendBody = `<div style="display:flex;flex-wrap:wrap;gap:3px 0;">${legendItems.join('')}</div>`

  // Asset row renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function assetRow(asset: any, inactive = false): string {
    const hp  = getHP(asset)
    const hpLabel = hp != null ? `${hp} HP` : '—'
    const tag  = asset.assetTag ?? ''
    const name = asset.name ?? ''

    const cells = inactive
      ? filteredTasks.map(() => '<td style="text-align:center;border:1px solid #ddd;color:#bbb;font-size:8px;">—</td>').join('')
      : filteredTasks.map(t => {
          if ((t.description.toLowerCase().includes('grease') || t.description.toLowerCase().includes('lubric')) && hp != null && hp <= 30) {
            return '<td style="text-align:center;border:1px solid #ddd;font-size:7px;color:#aaa;background:#f8f8f8;">N/A</td>'
          }
          const st  = safetyStyle(t.safety)
          const bg  = (t.safety ?? '').toUpperCase().includes('RUNNING') ? '#f0faf0' : '#fff8f4'
          if (t.measurement_unit) {
            return `<td style="text-align:center;border:1px solid #ddd;padding:3px 2px;background:${bg};vertical-align:bottom;">
              <div style="border-bottom:1px solid #999;min-height:18px;margin-bottom:1px;"></div>
              <div style="font-size:6px;color:${st.bg};font-weight:bold;white-space:nowrap;">${t.measurement_unit}</div>
            </td>`
          }
          return `<td style="text-align:center;border:1px solid #ddd;padding:2px;background:${bg};">
            <div style="width:12px;height:12px;border:1.5px solid ${st.bg};border-radius:2px;margin:auto;"></div>
          </td>`
        }).join('')

    return `
      <tr style="${inactive ? 'background:#f5f5f5;' : ''}page-break-inside:avoid;">
        <td style="padding:3px 5px;border:1px solid #ddd;${inactive ? 'color:#aaa;font-style:italic;' : ''}">
          <div style="font-size:7px;color:#999;font-family:monospace;line-height:1.2;">${tag}</div>
          <div style="font-weight:bold;font-size:9px;line-height:1.3;">${name}</div>
          ${inactive ? '<span style="font-size:7px;background:#fcc;color:#c00;padding:1px 3px;border-radius:2px;font-weight:bold;">INACTIVE</span>' : ''}
        </td>
        <td style="text-align:center;border:1px solid #ddd;font-size:9px;font-weight:bold;color:#1a6b1a;white-space:nowrap;">${hpLabel}</td>
        ${cells}
        <td style="border:1px solid #ddd;min-width:50px;"></td>
      </tr>`
  }

  const activeRows   = activeAssets.map(a => assetRow(a, false)).join('')
  const inactiveRows = inactiveAssets.length
    ? `<tr style="background:#333;">
         <td colspan="${filteredTasks.length + 3}" style="padding:3px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#fff;">
           Inactive / Out of Service — Do Not Perform
         </td>
       </tr>
       ${inactiveAssets.map(a => assetRow(a, true)).join('')}`
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

  .legend { font-size:8px; color:#333; margin-bottom:6px; padding:5px 8px; border:1px solid #ddd; border-radius:3px; background:#fafafa; line-height:1.8; }
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

<div class="header">
  ${logo ? `<img src="${logo}" alt="White River Forest Products">` : '<div style="background:#1a6b1a;color:#fff;font-size:9px;font-weight:900;padding:7px 10px;border-radius:3px;text-align:center;line-height:1.5;">WHITE RIVER<br>FOREST<br>PRODUCTS</div>'}
  <div class="header-title" style="text-align:right;">
    <h1>Preventive Maintenance Checklist</h1>
    <h2>${config.name}</h2>
    <p>${config.location} &nbsp;|&nbsp; Type: ${config.assetType} &nbsp;|&nbsp; Mode: ${config.operationMode === 'RUNNING' ? 'Machine Running' : config.operationMode === 'LOCKOUT' ? 'Lockout / Tagout' : 'All Tasks'} &nbsp;|&nbsp; ${config.description || 'Growing Our Future — A Community Based Venture'}</p>
  </div>
</div>

${config.operationMode !== 'ALL' ? `
<div style="margin-bottom:6px;padding:4px 10px;border-radius:3px;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;background:${config.operationMode === 'RUNNING' ? '#1a6b1a' : '#c45000'};color:#fff;display:flex;align-items:center;gap:8px;">
  ${config.operationMode === 'RUNNING' ? '&#9889; MACHINE RUNNING — Tasks in this checklist are performed while the machine is energized' : '&#128274; LOCKOUT / TAGOUT REQUIRED — De-energize and lock out equipment before beginning any task'}
</div>` : ''}

<div class="info-bar">
  <div><label>Date</label><div class="field"></div></div>
  <div><label>Work Order #</label><div class="field"></div></div>
  <div><label>Technician</label><div class="field"></div></div>
  <div><label>Shift</label><div class="field"></div></div>
</div>

${filteredTasks.length > 0 ? `
<div class="legend">
  <strong>Task Reference</strong> &nbsp;|&nbsp; &#9744; Check &amp; initial &nbsp;|&nbsp; <span style="color:#aaa;font-size:7px;">N/A</span> = Not applicable &nbsp;|&nbsp;
  <span style="background:#1a6b1a;color:#fff;font-size:7px;padding:1px 4px;border-radius:2px;font-weight:bold;">RUNNING</span> Machine energized &nbsp;
  <span style="background:#c45000;color:#fff;font-size:7px;padding:1px 4px;border-radius:2px;font-weight:bold;">LOTO</span> Lockout Tagout required<br>
  ${legendBody}
</div>` : ''}

<table>
  <thead>
    <tr>
      <th class="left" style="width:${filteredTasks.length > 8 ? 24 : 28}%;">Equipment</th>
      <th style="width:5%;">HP</th>
      ${headerCells}
      <th class="left" style="min-width:45px;">Notes</th>
    </tr>
  </thead>
  <tbody>
    ${activeRows || `<tr><td colspan="${filteredTasks.length + 3}" style="text-align:center;padding:10px;color:#888;">No active assets found for ${config.location} / ${config.assetType}</td></tr>`}
    ${inactiveRows}
  </tbody>
</table>

<div class="notes-box">
  <div class="label">General Notes / Observations</div>
  <div class="lines"></div>
</div>

<div class="signatures">
  <div class="sig-block"><label>Technician Signature</label><div class="sig-line"></div><div class="sig-caption">Signature &amp; Date</div></div>
  <div class="sig-block"><label>Reviewed By (Supervisor)</label><div class="sig-line"></div><div class="sig-caption">Signature &amp; Date</div></div>
  <div class="sig-block"><label>Next PM Due Date</label><div class="sig-line"></div><div class="sig-caption">Date</div></div>
</div>

<div class="footer">
  <strong>White River Forest Products</strong> — ${config.name} &nbsp;|&nbsp; Generated: ${today} &nbsp;|&nbsp; ${allMatching.length} equipment listed
</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// ── Page component ───────────────────────────────────────────────────────────

export function ChecklistsPage() {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<ChecklistConfig[]>(loadConfigs)
  const [modalOpen, setModalOpen]   = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [editItem, setEditItem]     = useState<ChecklistConfig | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  const { data: assetsData } = useAssets('', 1, 9999)
  const { data: tasks = [] } = useMaintenanceTasks()

  const allAssets  = assetsData?.data ?? []
  const locations  = [...new Set(allAssets.map(a => a.location?.name ?? '').filter((x): x is string => Boolean(x)))].sort()
  const assetTypes = [...new Set(allAssets.map(a => a.model).filter((x): x is string => Boolean(x)))].sort()

  const { register, handleSubmit, control, reset, watch } = useForm<Omit<ChecklistConfig, 'id' | 'createdAt'>>()
  const watchedType = watch('assetType')
  const watchedMode = watch('operationMode')
  const taskCount = tasks.filter(t => {
    if (t.asset_type !== watchedType) return false
    if (!watchedMode || watchedMode === 'ALL') return true
    const s = (t.safety ?? '').toUpperCase()
    return watchedMode === 'RUNNING' ? s.includes('RUNNING') : s.includes('LOCKOUT') || s.includes('LOTO')
  }).length

  const persist = (updated: ChecklistConfig[]) => {
    setConfigs(updated)
    saveConfigs(updated)
  }

  const openCreate = () => {
    setEditItem(null)
    reset({ name: '', location: '', assetType: '', operationMode: 'ALL', description: '' })
    setModalOpen(true)
  }

  const openEdit = (cfg: ChecklistConfig) => {
    setEditItem(cfg)
    reset({ name: cfg.name, location: cfg.location, assetType: cfg.assetType, operationMode: cfg.operationMode, description: cfg.description })
    setModalOpen(true)
  }

  const onSubmit = handleSubmit(data => {
    if (editItem) {
      persist(configs.map(c => c.id === editItem.id ? { ...c, ...data } : c))
      toast({ title: 'Checklist updated' })
    } else {
      persist([...configs, { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() }])
      toast({ title: 'Checklist created' })
    }
    setModalOpen(false)
  })

  const handleDelete = () => {
    if (!deleteId) return
    persist(configs.filter(c => c.id !== deleteId))
    setDeleteId(null)
    toast({ title: 'Deleted' })
  }

  const handleGenerate = async (cfg: ChecklistConfig) => {
    setGenerating(cfg.id)
    try {
      await generateChecklist(cfg, allAssets, tasks)
    } catch {
      toast({ title: 'Error generating checklist', variant: 'destructive' })
    } finally {
      setGenerating(null)
    }
  }

  const assetCount = (cfg: ChecklistConfig) =>
    allAssets.filter(a => {
      const loc = (a.location?.name ?? '').trim().toLowerCase()
      return loc === cfg.location.trim().toLowerCase() && a.model === cfg.assetType
    }).length

  const taskCountFor = (cfg: ChecklistConfig) =>
    tasks.filter(t => {
      if (t.asset_type !== cfg.assetType) return false
      const mode = cfg.operationMode ?? 'ALL'
      if (mode === 'ALL') return true
      const s = (t.safety ?? '').toUpperCase()
      return mode === 'RUNNING' ? s.includes('RUNNING') : s.includes('LOCKOUT') || s.includes('LOTO')
    }).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">PM Checklists</h1>
          <p className="text-muted-foreground">Printable preventive maintenance checklists — tasks come from Maintenance Tasks sheet</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />New Checklist
        </Button>
      </div>

      {configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">No checklists yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create your first checklist template to get started</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Checklist</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map(cfg => (
            <div key={cfg.id} className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{cfg.name}</h3>
                  {cfg.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{cfg.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cfg)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(cfg.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">{cfg.location}</Badge>
                <Badge variant="outline" className="text-xs">{cfg.assetType}</Badge>
                {cfg.operationMode !== 'ALL' && (
                  <Badge className="text-xs" style={{ background: cfg.operationMode === 'RUNNING' ? '#1a6b1a' : '#c45000' }}>
                    {cfg.operationMode === 'RUNNING' ? 'Running' : 'LOTO'}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {assetCount(cfg)} asset{assetCount(cfg) !== 1 ? 's' : ''} &nbsp;·&nbsp; {taskCountFor(cfg)} task{taskCountFor(cfg) !== 1 ? 's' : ''}
              </div>

              <Button
                className="w-full gap-2"
                size="sm"
                onClick={() => handleGenerate(cfg)}
                disabled={generating === cfg.id}
              >
                <FileText className="h-3.5 w-3.5" />
                {generating === cfg.id ? 'Generating…' : 'Generate PDF'}
              </Button>
            </div>
          ))}
        </div>
      )}

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editItem ? 'Edit Checklist' : 'New Checklist'}
        onSubmit={onSubmit}
        isLoading={false}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Checklist Name *</Label>
            <Input {...register('name', { required: true })} placeholder="e.g. MCC 1 — Motor PM" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location *</Label>
              <Controller control={control} name="location" rules={{ required: true }} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>{locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>

            <div className="space-y-2">
              <Label>Asset Type *</Label>
              <Controller control={control} name="assetType" rules={{ required: true }} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Operation Mode</Label>
            <Controller control={control} name="operationMode" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? 'ALL'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tasks</SelectItem>
                  <SelectItem value="RUNNING">Running (machine energized)</SelectItem>
                  <SelectItem value="LOCKOUT">Lockout / Tagout</SelectItem>
                </SelectContent>
              </Select>
            )} />
            {watchedType && (
              <p className="text-xs text-muted-foreground">
                {taskCount} task{taskCount !== 1 ? 's' : ''} will appear on this checklist
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input {...register('description')} placeholder="e.g. Debarker Area — Monthly inspection" />
          </div>
        </div>
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={false}
      />
    </div>
  )
}
