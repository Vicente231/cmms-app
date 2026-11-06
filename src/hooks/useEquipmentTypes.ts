import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AppliesTo, GASAssetType, GASAssetTypeSchema } from '@/lib/api'

// Shares query keys with Settings → Equipment Types so edits there refresh these lists
export const KEY_TYPES   = 'asset-categories'
export const KEY_SCHEMAS = 'asset-type-schemas'

export type EquipmentScope = 'asset' | 'part'

/** Rows saved before the applies_to column existed count as 'both'. */
export function appliesTo(row: { applies_to?: AppliesTo | null }, scope: EquipmentScope) {
  const a = row.applies_to || 'both'
  return a === 'both' || a === scope
}

export const useAllEquipmentTypes = () =>
  useQuery({
    queryKey: [KEY_TYPES],
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_types').select('*')
      if (error) throw error
      return ((data ?? []) as GASAssetType[]).sort((a, b) => a.label.localeCompare(b.label))
    },
  })

export const useAllEquipmentFields = () =>
  useQuery({
    queryKey: [KEY_SCHEMAS],
    queryFn: async () => {
      const { data, error } = await supabase.from('asset_type_schemas').select('*')
      if (error) throw error
      return ((data ?? []) as GASAssetTypeSchema[])
        .map(s => ({ ...s, options: Array.isArray(s.options) ? s.options : [] }))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label))
    },
  })

/** Types and fields that apply to assets or to parts. */
export function useEquipmentTypes(scope: EquipmentScope) {
  const types  = useAllEquipmentTypes()
  const fields = useAllEquipmentFields()
  const scopedTypes  = (types.data  ?? []).filter(t => appliesTo(t, scope))
  const scopedFields = (fields.data ?? []).filter(f => appliesTo(f, scope))
  return {
    types:  scopedTypes,
    fieldsFor: (typeCode: string) => scopedFields.filter(f => f.type_code === typeCode),
    isLoading: types.isLoading || fields.isLoading,
  }
}
