export interface BearingEntry {
  id: string
  code: string
  grams: number
  notes?: string
}

const STORAGE_KEY = 'cmms_bearing_reference'

const DEFAULT_BEARINGS: BearingEntry[] = [
  { id: '1',  code: '6209C3',  grams: 9,  notes: 'Calculated from dimensions (45×85×19mm)' },
  { id: '2',  code: '6309C3',  grams: 20, notes: 'Direct Toshiba match' },
  { id: '3',  code: '6312ZC3', grams: 30, notes: 'Same chamber volume as 6312C3' },
  { id: '4',  code: '6313C3',  grams: 20, notes: 'Direct Toshiba match' },
  { id: '5',  code: '6314C3',  grams: 50, notes: 'Direct Toshiba match' },
  { id: '6',  code: '6314ZC3', grams: 50, notes: 'Same size as 6314C3 — shield does not change volume' },
  { id: '7',  code: '6316C3',  grams: 57, notes: 'Interpolated (80×170×39mm), between 6314 and 6317/NU322 brackets' },
  { id: '8',  code: '6317C3',  grams: 50, notes: 'Direct Toshiba match' },
  { id: '9',  code: '6318C3',  grams: 50, notes: 'Direct Toshiba match' },
  { id: '10', code: 'NU319C3', grams: 30, notes: 'Falls in NU318/NU320 bore-size bracket' },
  { id: '11', code: 'NU322C3', grams: 80, notes: 'Direct Toshiba match' },
]

export function loadBearings(): BearingEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as BearingEntry[]) : DEFAULT_BEARINGS
  } catch { return DEFAULT_BEARINGS }
}

export function saveBearings(entries: BearingEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)) } catch {}
}

export function lookupBearing(code: string): BearingEntry | null {
  if (!code) return null
  const key = code.toLowerCase().replace(/\s+/g, '')
  return loadBearings().find(e => e.code.toLowerCase().replace(/\s+/g, '') === key) ?? null
}
