import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GASAssetTypeSchema } from '@/lib/api'

/** Group fields by their section, keeping the configured order. */
export function groupBySection(fields: GASAssetTypeSchema[]) {
  const groups: { section: string; fields: GASAssetTypeSchema[] }[] = []
  fields.forEach(f => {
    const section = f.section?.trim() || 'Specifications'
    const g = groups.find(x => x.section === section)
    if (g) g.fields.push(f)
    else groups.push({ section, fields: [f] })
  })
  return groups
}

/** Required spec fields that are still empty. */
export function missingRequired(fields: GASAssetTypeSchema[], values: Record<string, string>) {
  return fields.filter(f => f.required && !String(values[f.field_key] ?? '').trim()).map(f => f.label)
}

export function SpecFieldsEditor({ fields, values, onChange }: {
  fields: GASAssetTypeSchema[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}) {
  const set = (key: string, v: string) => onChange({ ...values, [key]: v })

  return (
    <div className="space-y-4">
      {groupBySection(fields).map(g => (
        <div key={g.section} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">{g.section}</p>
          <div className="grid grid-cols-2 gap-4">
            {g.fields.map(f => (
              <div key={f.field_key} className="space-y-2">
                <Label>
                  {f.label}
                  {f.unit && <span className="text-muted-foreground ml-1 font-normal">({f.unit})</span>}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {f.data_type === 'select' && f.options.length > 0 ? (
                  <Select value={values[f.field_key] ?? ''} onValueChange={v => set(f.field_key, v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {f.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.data_type === 'boolean' ? (
                  <Select value={values[f.field_key] ?? ''} onValueChange={v => set(f.field_key, v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.data_type === 'number' ? 'number' : f.data_type === 'date' ? 'date' : 'text'}
                    step={f.data_type === 'number' ? 'any' : undefined}
                    value={values[f.field_key] ?? ''}
                    onChange={e => set(f.field_key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Read-only spec list, grouped by section. Values without a matching field are shown under "Other". */
export function SpecFieldsView({ fields, values }: {
  fields: GASAssetTypeSchema[]
  values: Record<string, string>
}) {
  const known = new Set(fields.map(f => f.field_key))
  const extra = Object.entries(values).filter(([k, v]) => !known.has(k) && String(v).trim())
  const groups = groupBySection(fields.filter(f => String(values[f.field_key] ?? '').trim()))

  if (!groups.length && !extra.length) {
    return <p className="text-sm text-muted-foreground">No specifications entered.</p>
  }

  const row = (label: string, value: string, unit?: string) => (
    <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}{unit ? ` ${unit}` : ''}</span>
    </div>
  )

  return (
    <div className="space-y-5">
      {groups.map(g => (
        <div key={g.section}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{g.section}</p>
          {g.fields.map(f => row(f.label, values[f.field_key], f.unit))}
        </div>
      ))}
      {extra.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Other</p>
          {extra.map(([k, v]) => row(k, v))}
        </div>
      )}
    </div>
  )
}
