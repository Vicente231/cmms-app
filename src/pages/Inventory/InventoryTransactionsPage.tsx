import { useState } from 'react'
import { useInventoryTransactions } from '@/hooks/useInventoryTransactions'
import { useParts } from '@/hooks/useParts'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, RotateCcw, ExternalLink } from 'lucide-react'

const TX_CONFIG = {
  RECEIVED: { label: 'Received',  icon: ArrowDownToLine,   cls: 'bg-green-100 text-green-700',     sign: '+' },
  ISSUED:   { label: 'Issued',    icon: ArrowUpFromLine,   cls: 'bg-red-100 text-red-700',         sign: '−' },
  ADJUSTED: { label: 'Adjusted',  icon: SlidersHorizontal, cls: 'bg-blue-100 text-blue-700',       sign: '→' },
  RETURNED: { label: 'Returned',  icon: RotateCcw,         cls: 'bg-yellow-100 text-yellow-700',   sign: '+' },
} as const

type TxType = keyof typeof TX_CONFIG

export function InventoryTransactionsPage() {
  const navigate = useNavigate()
  const [search, setSearch]   = useState('')
  const [typeFilter, setType] = useState<'' | TxType>('')

  const { data: txs = [], isLoading } = useInventoryTransactions()
  const { data: partsPage } = useParts({ limit: 9999 })
  const allParts = partsPage?.data ?? []

  const filtered = txs.filter(t => {
    const matchSearch = !search ||
      t.partName?.toLowerCase().includes(search.toLowerCase()) ||
      t.partNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.reference?.toLowerCase().includes(search.toLowerCase()) ||
      t.notes?.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || t.txType === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory Transactions</h1>
        <p className="text-muted-foreground text-sm">Full ledger of all stock movements</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          className="max-w-xs"
          placeholder="Search by part, reference..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center rounded-md border bg-muted/30 p-0.5">
          {(['', 'RECEIVED', 'ISSUED', 'ADJUSTED', 'RETURNED'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                typeFilter === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">Loading transactions...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {['Date', 'Part', 'Type', 'Qty', 'Balance', 'Cost', 'Reference / WO', 'Notes'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No transactions found
                    </td>
                  </tr>
                ) : filtered.map(t => {
                  const cfg  = TX_CONFIG[t.txType] ?? TX_CONFIG.ADJUSTED
                  const Icon = cfg.icon
                  const part = allParts.find(p => 'PRT-' + String(p.id).padStart(6, '0') === t.partId)
                  return (
                    <tr key={t.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {t.createdAt ? format(new Date(t.createdAt), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.partName || part?.name || t.partId}</div>
                        {(t.partNumber || part?.partNumber) && (
                          <div className="text-xs text-muted-foreground font-mono">{t.partNumber || part?.partNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.cls)}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">
                        <span className={t.txType === 'ISSUED' ? 'text-red-600' : 'text-green-600'}>
                          {cfg.sign}{Math.abs(t.qty)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium">{t.balanceAfter}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {t.unitCost > 0 ? `$${t.unitCost.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {t.woId ? (
                          <button
                            onClick={() => navigate(`/work-orders/${t.woId.replace('WO-', '')}`)}
                            className="flex items-center gap-1 text-primary hover:underline text-xs font-mono"
                          >
                            {t.woId} <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">{t.reference || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{t.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== txs.length && ` (filtered from ${txs.length})`}
          </div>
        </Card>
      )}
    </div>
  )
}
