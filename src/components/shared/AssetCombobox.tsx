import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Asset {
  id: number
  name: string
  assetTag?: string
}

interface AssetComboboxProps {
  assets: Asset[]
  value?: number
  onChange: (value: number | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function AssetCombobox({
  assets,
  value,
  onChange,
  placeholder = 'Select asset...',
  disabled,
}: AssetComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = assets.find((a) => a.id === value)

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.name.toLowerCase().includes(q) ||
      (a.assetTag && a.assetTag.toLowerCase().includes(q))
    )
  })

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setSearch('')
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full justify-between font-normal"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Results */}
          <div className="max-h-56 overflow-y-auto p-1">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => { onChange(undefined); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                !value && 'text-foreground font-medium'
              )}
            >
              <Check className={cn('h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
              None
            </button>

            {filtered.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">No assets found.</p>
            ) : (
              filtered.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => { onChange(asset.id); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
                    value === asset.id && 'bg-accent'
                  )}
                >
                  <Check className={cn('h-4 w-4 shrink-0', value === asset.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 text-left truncate">{asset.name}</span>
                  {asset.assetTag && (
                    <span className="text-xs text-muted-foreground shrink-0">{asset.assetTag}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
