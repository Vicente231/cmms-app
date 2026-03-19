import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { GASAssetType, GASAssetTypeSchema } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Table2 } from 'lucide-react'
import { useForm, Controller, useWatch } from 'react-hook-form'

const KEY_TYPES   = 'asset-categories'
const KEY_SCHEMAS = 'asset-type-schemas'

const DATA_TYPES = ['number', 'text', 'select', 'date', 'boolean']

// ── Types page ────────────────────────────────────────────────────────────────

export function AssetCategoriesPage() {
  const { toast } = useToast()
  const qc = useQueryClient()

  // Asset Type state
  const [typeModalOpen,  setTypeModalOpen]  = useState(false)
  const [deleteCode,     setDeleteCode]     = useState<string | null>(null)
  const [editType,       setEditType]       = useState<GASAssetType | null>(null)

  // Schema manager state
  const [schemaType,     setSchemaType]     = useState<GASAssetType | null>(null)
  const [schemaModalOpen,setSchemaModalOpen]= useState(false)
  const [editSchema,     setEditSchema]     = useState<GASAssetTypeSchema | null>(null)
  const [deleteSchema,   setDeleteSchema]   = useState<GASAssetTypeSchema | null>(null)

  // ── Asset Types queries ──────────────────────────────────────────────────
  const { data: types, isLoading } = useQuery({
    queryKey: [KEY_TYPES],
    queryFn: () => gasGet<GASAssetType[]>('assetTypes'),
  })

  const createType = useMutation({
    mutationFn: (body: Partial<GASAssetType>) =>
      gasPost<{ success: boolean }>('createAssetType', body as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY_TYPES] }),
  })

  const updateType = useMutation({
    mutationFn: ({ type_code, ...updates }: Partial<GASAssetType> & { type_code: string }) =>
      gasPost<{ success: boolean }>('updateAssetType', { type_code, updates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY_TYPES] }),
  })

  const removeType = useMutation({
    mutationFn: (type_code: string) =>
      gasPost<{ success: boolean }>('deleteAssetType', { type_code }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY_TYPES] })
      qc.invalidateQueries({ queryKey: [KEY_SCHEMAS] })
    },
  })

  // ── Schema queries ───────────────────────────────────────────────────────
  const { data: allSchemas } = useQuery({
    queryKey: [KEY_SCHEMAS],
    queryFn: () => gasGet<GASAssetTypeSchema[]>('assetTypeSchemas'),
  })

  const schemasForType = (allSchemas || []).filter(
    (s) => s.type_code === schemaType?.type_code
  )

  const createSchema = useMutation({
    mutationFn: (body: Partial<GASAssetTypeSchema>) =>
      gasPost<{ success: boolean }>('createAssetTypeSchema', {
        ...body,
        options: Array.isArray(body.options) ? body.options.join(',') : body.options || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY_SCHEMAS] }),
  })

  const updateSchema = useMutation({
    mutationFn: ({ type_code, field_key, ...updates }: Partial<GASAssetTypeSchema> & { type_code: string; field_key: string }) =>
      gasPost<{ success: boolean }>('updateAssetTypeSchema', {
        type_code,
        field_key,
        updates: {
          ...updates,
          options: Array.isArray(updates.options) ? updates.options.join(',') : updates.options || '',
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY_SCHEMAS] }),
  })

  const removeSchema = useMutation({
    mutationFn: (s: GASAssetTypeSchema) =>
      gasPost<{ success: boolean }>('deleteAssetTypeSchema', {
        type_code: s.type_code,
        field_key: s.field_key,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY_SCHEMAS] }),
  })

  // ── Type form ────────────────────────────────────────────────────────────
  const typeForm = useForm<Partial<GASAssetType>>()

  const openCreateType = () => { setEditType(null); typeForm.reset({}); setTypeModalOpen(true) }
  const openEditType   = (t: GASAssetType) => { setEditType(t); typeForm.reset(t); setTypeModalOpen(true) }

  const onSubmitType = typeForm.handleSubmit(async (data) => {
    try {
      if (editType) {
        await updateType.mutateAsync({ type_code: editType.type_code, ...data })
        toast({ title: 'Asset type updated' })
      } else {
        await createType.mutateAsync(data)
        toast({ title: 'Asset type created' })
      }
      setTypeModalOpen(false)
    } catch (err) {
      toast({ title: (err as Error).message || 'Error', variant: 'destructive' })
    }
  })

  // ── Schema form ──────────────────────────────────────────────────────────
  const schemaForm = useForm<Partial<GASAssetTypeSchema>>()
  const watchedDataType = useWatch({ control: schemaForm.control, name: 'data_type' })

  const openCreateSchema = () => {
    setEditSchema(null)
    schemaForm.reset({ type_code: schemaType?.type_code, required: false, data_type: 'text' })
    setSchemaModalOpen(true)
  }

  const openEditSchema = (s: GASAssetTypeSchema) => {
    setEditSchema(s)
    schemaForm.reset({
      ...s,
      options: Array.isArray(s.options) ? s.options.join(',') as unknown as string[] : s.options,
    })
    setSchemaModalOpen(true)
  }

  const onSubmitSchema = schemaForm.handleSubmit(async (data) => {
    try {
      const options = typeof data.options === 'string'
        ? (data.options as string).split(',').map((o) => o.trim()).filter(Boolean)
        : data.options || []

      if (editSchema) {
        await updateSchema.mutateAsync({
          type_code: editSchema.type_code,
          field_key: editSchema.field_key,
          ...data,
          options,
        })
        toast({ title: 'Field updated' })
      } else {
        await createSchema.mutateAsync({ ...data, type_code: schemaType?.type_code, options })
        toast({ title: 'Field added' })
      }
      setSchemaModalOpen(false)
    } catch (err) {
      toast({ title: (err as Error).message || 'Error', variant: 'destructive' })
    }
  })

  // ── Table columns ────────────────────────────────────────────────────────
  const typeColumns: ColumnDef<GASAssetType>[] = [
    {
      accessorKey: 'type_code',
      header: 'Code',
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.type_code}</span>,
    },
    {
      accessorKey: 'label',
      header: 'Label',
      cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
    },
    {
      accessorKey: 'icon',
      header: 'Icon',
      cell: ({ row }) => <span className="text-xl">{row.original.icon || '-'}</span>,
    },
    {
      accessorKey: 'color',
      header: 'Color',
      cell: ({ row }) => row.original.color
        ? <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize">{row.original.color}</span>
        : '-',
    },
    {
      accessorKey: 'schemas',
      header: 'Schema Fields',
      cell: ({ row }) => {
        const count = (allSchemas || []).filter((s) => s.type_code === row.original.type_code).length
        return (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => { setSchemaType(row.original); setSchemaModalOpen(false); setEditSchema(null) }}
          >
            <Table2 className="h-3.5 w-3.5" />
            {count} field{count !== 1 ? 's' : ''}
          </Button>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditType(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteCode(row.original.type_code)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  const schemaColumns: ColumnDef<GASAssetTypeSchema>[] = [
    { accessorKey: 'field_key', header: 'Key',       cell: ({ row }) => <span className="font-mono text-sm">{row.original.field_key}</span> },
    { accessorKey: 'label',     header: 'Label',     cell: ({ row }) => row.original.label },
    { accessorKey: 'data_type', header: 'Type',      cell: ({ row }) => <span className="capitalize">{row.original.data_type}</span> },
    { accessorKey: 'unit',      header: 'Unit',      cell: ({ row }) => row.original.unit || '-' },
    {
      accessorKey: 'required',
      header: 'Required',
      cell: ({ row }) => row.original.required
        ? <span className="text-xs font-medium text-green-600">Yes</span>
        : <span className="text-xs text-muted-foreground">No</span>,
    },
    {
      accessorKey: 'options',
      header: 'Options',
      cell: ({ row }) => {
        const opts = Array.isArray(row.original.options) ? row.original.options : []
        return opts.length ? <span className="text-xs text-muted-foreground">{opts.join(', ')}</span> : '-'
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditSchema(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteSchema(row.original)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Asset Types</h1>
        <p className="text-muted-foreground">Manage asset type classifications and their schema fields</p>
      </div>

      {/* ── Asset Types table ── */}
      <DataTable
        columns={typeColumns}
        data={types || []}
        isLoading={isLoading}
        onAddNew={openCreateType}
        addNewLabel="Add Asset Type"
      />

      {/* ── Schema manager panel (shown below table when a type is selected) ── */}
      {schemaType && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                <span className="text-xl mr-2">{schemaType.icon}</span>
                {schemaType.label} — Schema Fields
              </h2>
              <p className="text-sm text-muted-foreground">Fields collected for every asset of this type</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={openCreateSchema}>Add Field</Button>
              <Button size="sm" variant="ghost" onClick={() => setSchemaType(null)}>Close</Button>
            </div>
          </div>

          <DataTable
            columns={schemaColumns}
            data={schemasForType}
            isLoading={false}
          />
        </div>
      )}

      {/* ── Create / Edit Asset Type modal ── */}
      <CRUDModal
        open={typeModalOpen}
        onOpenChange={setTypeModalOpen}
        title={editType ? 'Edit Asset Type' : 'Add Asset Type'}
        onSubmit={onSubmitType}
        isLoading={createType.isPending || updateType.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type Code *</Label>
            <Input {...typeForm.register('type_code', { required: true })} placeholder="e.g. PUMP" disabled={!!editType} className="uppercase" />
          </div>
          <div className="space-y-2">
            <Label>Label *</Label>
            <Input {...typeForm.register('label', { required: true })} placeholder="e.g. Pump" />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <Input {...typeForm.register('icon')} placeholder="⚙" />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input {...typeForm.register('color')} placeholder="e.g. amber, red, blue" />
          </div>
        </div>
      </CRUDModal>

      {/* ── Create / Edit Schema Field modal ── */}
      <CRUDModal
        open={schemaModalOpen}
        onOpenChange={setSchemaModalOpen}
        title={editSchema ? 'Edit Field' : `Add Field — ${schemaType?.label}`}
        onSubmit={onSubmitSchema}
        isLoading={createSchema.isPending || updateSchema.isPending}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Key *</Label>
              <Input
                {...schemaForm.register('field_key', { required: true })}
                placeholder="e.g. voltage"
                disabled={!!editSchema}
              />
            </div>
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input {...schemaForm.register('label', { required: true })} placeholder="e.g. Voltage" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Type *</Label>
              <Controller
                control={schemaForm.control}
                name="data_type"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'text'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input {...schemaForm.register('unit')} placeholder="e.g. V, HP, RPM" />
            </div>
          </div>

          {watchedDataType === 'select' && (
            <div className="space-y-2">
              <Label>Options <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
              <Input
                {...schemaForm.register('options' as never)}
                placeholder="e.g. TEFC,ODP,TENV"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Controller
              control={schemaForm.control}
              name="required"
              render={({ field }) => (
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  id="required-switch"
                />
              )}
            />
            <Label htmlFor="required-switch">Required field</Label>
          </div>
        </div>
      </CRUDModal>

      {/* ── Delete Asset Type confirm ── */}
      <ConfirmDialog
        open={!!deleteCode}
        onOpenChange={(open) => !open && setDeleteCode(null)}
        onConfirm={async () => {
          try { await removeType.mutateAsync(deleteCode!); toast({ title: 'Deleted' }); setDeleteCode(null) }
          catch (err) { toast({ title: (err as Error).message || 'Error', variant: 'destructive' }) }
        }}
        isLoading={removeType.isPending}
        description="This will delete the asset type and all its schema fields. Assets of this type must be removed first."
      />

      {/* ── Delete Schema Field confirm ── */}
      <ConfirmDialog
        open={!!deleteSchema}
        onOpenChange={(open) => !open && setDeleteSchema(null)}
        onConfirm={async () => {
          try { await removeSchema.mutateAsync(deleteSchema!); toast({ title: 'Field deleted' }); setDeleteSchema(null) }
          catch (err) { toast({ title: (err as Error).message || 'Error', variant: 'destructive' }) }
        }}
        isLoading={removeSchema.isPending}
        description="This will permanently delete this schema field."
      />
    </div>
  )
}
