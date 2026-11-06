import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/api'
import type { AssetMeasurement, AssetThreshold, AssetHealth, ParamHealth, HealthStatus } from '@/types'

const MEAS_KEY  = (assetId: string) => ['assetMeasurements', assetId]
const LATEST_KEY = ['allMeasurementsLatest']
const THRESH_KEY = ['assetThresholds']

// ── Known parameters (used as suggestions in forms) ──────────────────────
export const KNOWN_PARAMS: { name: string; unit: string; direction: 'above' | 'below' }[] = [
  { name: 'vibration',            unit: 'mm/s', direction: 'above'  },
  { name: 'temperature',          unit: '°C',   direction: 'above'  },
  { name: 'insulation_resistance',unit: 'MΩ',   direction: 'below'  },
  { name: 'oil_condition_score',  unit: 'score',direction: 'below'  },
]

// ── GAS interface types ───────────────────────────────────────────────────
interface GASMeasurement {
  measurement_id: string
  asset_id: string
  param_name: string
  value: string | number
  unit: string
  notes: string
  recorded_by: string
  recorded_at: string
}

interface GASThreshold {
  threshold_id: string
  asset_type: string
  param_name: string
  warning_value: string | number
  critical_value: string | number
  unit: string
  direction: string
}

// ── Mappers ───────────────────────────────────────────────────────────────
function mapMeasurement(r: GASMeasurement): AssetMeasurement {
  return {
    measurementId: r.measurement_id || '',
    assetId:       r.asset_id       || '',
    paramName:     r.param_name     || '',
    value:         parseFloat(String(r.value)) || 0,
    unit:          r.unit           || '',
    notes:         r.notes          || '',
    recordedBy:    r.recorded_by    || '',
    recordedAt:    r.recorded_at    || '',
  }
}

function mapThreshold(r: GASThreshold): AssetThreshold {
  return {
    thresholdId:   r.threshold_id                                        || '',
    assetType:     r.asset_type                                          || '',
    paramName:     r.param_name                                          || '',
    warningValue:  parseFloat(String(r.warning_value))                  || 0,
    criticalValue: parseFloat(String(r.critical_value))                 || 0,
    unit:          r.unit                                                || '',
    direction:     (r.direction === 'below' ? 'below' : 'above') as 'above' | 'below',
  }
}

// ── Health evaluation ─────────────────────────────────────────────────────
export function evaluateHealth(
  value: number,
  threshold: AssetThreshold | undefined
): HealthStatus {
  if (!threshold) return 'unknown'
  const { warningValue, criticalValue, direction } = threshold
  if (direction === 'above') {
    if (value >= criticalValue) return 'critical'
    if (value >= warningValue)  return 'warning'
    return 'ok'
  } else {
    if (value <= criticalValue) return 'critical'
    if (value <= warningValue)  return 'warning'
    return 'ok'
  }
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('warning'))  return 'warning'
  if (statuses.includes('ok'))       return 'ok'
  return 'unknown'
}

// ── Measurement hooks ─────────────────────────────────────────────────────
export function useAssetMeasurements(assetId: string) {
  return useQuery({
    queryKey: MEAS_KEY(assetId),
    queryFn: async () => {
      try {
        const res = await gasGet<{ data: GASMeasurement[] }>('assetMeasurements', { asset_id: assetId })
        return (res.data ?? []).map(mapMeasurement)
      } catch { return [] }
    },
    enabled: !!assetId,
  })
}

export function useAllLatestMeasurements() {
  return useQuery({
    queryKey: LATEST_KEY,
    queryFn: async () => {
      try {
        const res = await gasGet<{ data: GASMeasurement[] }>('allMeasurementsLatest')
        return (res.data ?? []).map(mapMeasurement)
      } catch { return [] }
    },
  })
}

export function useCreateMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      assetId: string
      paramName: string
      value: number
      unit: string
      notes: string
      recordedBy: string
    }) =>
      gasPost<{ success: boolean; measurement_id: string; health_status?: string }>(
        'createAssetMeasurement',
        {
          asset_id:    params.assetId,
          param_name:  params.paramName,
          value:       params.value,
          unit:        params.unit,
          notes:       params.notes,
          recorded_by: params.recordedBy,
        }
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: MEAS_KEY(vars.assetId) })
      qc.invalidateQueries({ queryKey: LATEST_KEY })
    },
  })
}

export function useDeleteMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { measurementId: string; assetId: string }) =>
      gasPost<{ success: boolean }>('deleteAssetMeasurement', { measurement_id: params.measurementId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: MEAS_KEY(vars.assetId) })
      qc.invalidateQueries({ queryKey: LATEST_KEY })
    },
  })
}

// ── Threshold hooks ───────────────────────────────────────────────────────
export function useAssetThresholds() {
  return useQuery({
    queryKey: THRESH_KEY,
    queryFn: async () => {
      try {
        const res = await gasGet<{ data: GASThreshold[] }>('assetThresholds')
        return (res.data ?? []).map(mapThreshold)
      } catch { return [] }
    },
  })
}

export function useCreateThreshold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: Omit<AssetThreshold, 'thresholdId'>) =>
      gasPost<{ success: boolean; threshold_id: string }>('createAssetThreshold', {
        asset_type:     params.assetType,
        param_name:     params.paramName,
        warning_value:  params.warningValue,
        critical_value: params.criticalValue,
        unit:           params.unit,
        direction:      params.direction,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: THRESH_KEY }),
  })
}

export function useUpdateThreshold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: AssetThreshold) =>
      gasPost<{ success: boolean }>('updateAssetThreshold', {
        threshold_id:   params.thresholdId,
        asset_type:     params.assetType,
        param_name:     params.paramName,
        warning_value:  params.warningValue,
        critical_value: params.criticalValue,
        unit:           params.unit,
        direction:      params.direction,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: THRESH_KEY }),
  })
}

export function useDeleteThreshold() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (thresholdId: string) =>
      gasPost<{ success: boolean }>('deleteAssetThreshold', { threshold_id: thresholdId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: THRESH_KEY }),
  })
}

// ── Computed health (used by dashboard) ──────────────────────────────────
export function usePdMHealth() {
  const { data: latestMeasurements = [], isLoading: mLoading } = useAllLatestMeasurements()
  const { data: thresholds = [],         isLoading: tLoading } = useAssetThresholds()

  // Build threshold lookup: "assetType::paramName" → AssetThreshold
  const threshMap = new Map<string, AssetThreshold>()
  thresholds.forEach(t => threshMap.set(`${t.assetType}::${t.paramName}`, t))

  // We need asset type per assetId — passed in from caller
  return {
    isLoading: mLoading || tLoading,
    latestMeasurements,
    thresholds,
    threshMap,
    /**
     * Compute health for a single asset given its type code and its measurements.
     */
    computeHealth(assetId: string, assetType: string, measurements: AssetMeasurement[]): AssetHealth {
      if (measurements.length === 0) return { assetId, overallStatus: 'unknown', params: [] }
      const params: ParamHealth[] = measurements.map(m => {
        const t = threshMap.get(`${assetType}::${m.paramName}`)
        const status = evaluateHealth(m.value, t)
        return {
          paramName:     m.paramName,
          value:         m.value,
          unit:          m.unit,
          recordedAt:    m.recordedAt,
          status,
          warningValue:  t?.warningValue,
          criticalValue: t?.criticalValue,
          direction:     t?.direction,
        }
      })
      return { assetId, overallStatus: worstStatus(params.map(p => p.status)), params }
    },
  }
}
