import { useState } from 'react'
import { Pencil, Trash2, Plus, TrendingUp, TrendingDown, Sliders } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/ui/use-toast'
import { useAssets } from '@/hooks/useAssets'
import {
  useAssetThresholds,
  useCreateThreshold,
  useUpdateThreshold,
  useDeleteThreshold,
  KNOWN_PARAMS,
} from '@/hooks/usePdM'
import type { AssetThreshold } from '@/types'
import { cn } from '@/lib/utils'

const PARAM_LABEL: Record<string, string> = {
  vibration:             'Vibration',
  temperature:           'Temperature',
  insulation_resistance: 'Insulation Resistance',
  oil_condition_score:   'Oil Condition Score',
}

function pLabel(name: string) {
  return PARAM_LABEL[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const emptyForm: Omit<AssetThreshold, 'thresholdId'> = {
  assetType: '',
  paramName: '',
  warningValue: 0,
  criticalValue: 0,
  unit: '',
  direction: 'above',
}

export function ThresholdsPage() {
  const { toast } = useToast()
  const [modalOpen,   setModalOpen]   = useState(false)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [editItem,    setEditItem]    = useState<AssetThreshold | null>(null)
  const [form,        setForm]        = useState<Omit<AssetThreshold, 'thresholdId'>>(emptyForm)
  const [customParam, setCustomParam] = useState('')
  const [filterType,  setFilterType]  = useState('__all__')

  const { data: thresholds = [], isLoading } = useAssetThresholds()
  const { data: assetsData }                  = useAssets('', 1, 9999)
  const createT = useCreateThreshold()
  const updateT = useUpdateThreshold()
  const deleteT = useDeleteThreshold()

  const allAssets  = assetsData?.data ?? []
  const assetTypes = [...new Set(allAssets.map(a => a.model).filter(Boolean))] as string[]

  const openCreate = () => {
    setEditItem(null)
    setForm(emptyForm)
    setCustomParam('')
    setModalOpen(true)
  }

  const openEdit = (t: AssetThreshold) => {
    setEditItem(t)
    setForm({ assetType: t.assetType, paramName: t.paramName, warningValue: t.warningValue, criticalValue: t.criticalValue, unit: t.unit, direction: t.direction })
    setCustomParam(KNOWN_PARAMS.find(p => p.name === t.paramName) ? '' : t.paramName)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      ...form,
      paramName: form.paramName === '__custom__' ? customParam.trim() : form.paramName,
    }
    if (!payload.assetType || !payload.paramName || !payload.unit) {
      toast({ title: 'Fill in all required fields', variant: 'destructive' }); return
    }
    try {
      if (editItem) {
        await updateT.mutateAsync({ ...payload, thresholdId: editItem.thresholdId })
        toast({ title: 'Threshold updated' })
      } else {
        await createT.mutateAsync(payload)
        toast({ title: 'Threshold created' })
      }
      setModalOpen(false)
    } catch {
      toast({ title: 'Error saving threshold', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteT.mutateAsync(deleteId)
      toast({ title: 'Threshold deleted' })
      setDeleteId(null)
    } catch {
      toast({ title: 'Error deleting threshold', variant: 'destructive' })
    }
  }

  // Pre-fill unit when selecting a known param
  const handleParamChange = (val: string) => {
    setForm(prev => {
      const known = KNOWN_PARAMS.find(p => p.name === val)
      return {
        ...prev,
        paramName: val,
        unit: known ? known.unit : prev.unit,
        direction: known ? known.direction : prev.direction,
      }
    })
  }

  const filtered = filterType !== '__all__'
    ? thresholds.filter(t => t.assetType === filterType)
    : thresholds

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            PdM Thresholds
          </h1>
          <p className="text-muted-foreground">Warning and critical limits per asset type and parameter</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Threshold
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All asset types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All asset types</SelectItem>
            {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} threshold{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <Sliders className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No thresholds defined yet</p>
          <p className="text-sm mt-1">Add a threshold to start monitoring asset health.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add First Threshold
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Asset Type</th>
                <th className="text-left px-4 py-3 font-medium">Parameter</th>
                <th className="text-left px-4 py-3 font-medium">Direction</th>
                <th className="text-right px-4 py-3 font-medium text-yellow-600">Warning</th>
                <th className="text-right px-4 py-3 font-medium text-red-600">Critical</th>
                <th className="text-left px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(t => (
                <tr key={t.thresholdId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{t.assetType}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{pLabel(t.paramName)}</td>
                  <td className="px-4 py-3">
                    {t.direction === 'above'
                      ? <span className="flex items-center gap-1 text-orange-600 text-xs"><TrendingUp className="h-3 w-3" /> Trigger if above</span>
                      : <span className="flex items-center gap-1 text-blue-600 text-xs"><TrendingDown className="h-3 w-3" /> Trigger if below</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-yellow-600">{t.warningValue}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{t.criticalValue}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(t.thresholdId)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editItem ? 'Edit Threshold' : 'New Threshold'}
        onSubmit={handleSave}
        isLoading={createT.isPending || updateT.isPending}
      >
        <div className="space-y-4">

          <div className="space-y-2">
            <Label>Asset Type *</Label>
            <Select value={form.assetType} onValueChange={v => setForm(p => ({ ...p, assetType: v }))}>
              <SelectTrigger><SelectValue placeholder="Select asset type" /></SelectTrigger>
              <SelectContent>
                {assetTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Parameter *</Label>
            <Select value={form.paramName} onValueChange={handleParamChange}>
              <SelectTrigger><SelectValue placeholder="Select parameter" /></SelectTrigger>
              <SelectContent>
                {KNOWN_PARAMS.map(p => (
                  <SelectItem key={p.name} value={p.name}>{pLabel(p.name)} ({p.unit})</SelectItem>
                ))}
                <SelectItem value="__custom__">Other (custom)…</SelectItem>
              </SelectContent>
            </Select>
            {form.paramName === '__custom__' && (
              <Input
                placeholder="e.g. pressure, noise_level..."
                value={customParam}
                onChange={e => setCustomParam(e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Input
                placeholder="e.g. °C, mm/s, MΩ"
                value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Direction *</Label>
              <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v as 'above' | 'below' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Trigger if ABOVE threshold (e.g. temperature, vibration)</SelectItem>
                  <SelectItem value="below">Trigger if BELOW threshold (e.g. insulation, oil score)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-yellow-600">Warning Value</Label>
              <Input
                type="number"
                step="any"
                value={form.warningValue}
                onChange={e => setForm(p => ({ ...p, warningValue: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {form.direction === 'above' ? 'Alert when ≥ this value' : 'Alert when ≤ this value'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-red-600">Critical Value</Label>
              <Input
                type="number"
                step="any"
                value={form.criticalValue}
                onChange={e => setForm(p => ({ ...p, criticalValue: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {form.direction === 'above' ? 'Critical when ≥ this value' : 'Critical when ≤ this value'}
              </p>
            </div>
          </div>

        </div>
      </CRUDModal>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteT.isPending}
        description="This will delete the threshold. Existing readings will not be affected."
      />
    </div>
  )
}
