import { useState, useMemo } from 'react'
import { ChevronRight, ChevronLeft, Plus, Pencil, Network, GitBranch, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Asset } from '@/types'

type TreeMode = 'parent' | 'feedFrom'

interface TreeNode {
  asset: Asset
  children: TreeNode[]
}

const STATUS_DOT: Record<string, string> = {
  active:            'bg-green-500',
  inactive:          'bg-gray-400',
  under_maintenance: 'bg-yellow-500',
  decommissioned:    'bg-red-400',
}

const FEED_ROOT_TYPES = ['TXh', 'TXl', 'MCC', 'SWGR', 'VFD', 'UPS', 'PDU', 'PDC']

function hasFeedRef(asset: Asset): boolean {
  const tag  = asset.feedFrom?.assetTag?.trim()
  const name = asset.feedFrom?.name?.trim()
  return !!(tag || name)
}

function buildTree(assets: Asset[], mode: TreeMode): TreeNode[] {
  const byTag  = new Map(assets.filter(a => a.assetTag).map(a => [a.assetTag!.trim().toLowerCase(), a]))
  const byName = new Map(assets.map(a => [a.name.trim().toLowerCase(), a]))

  const childMap = new Map<number, Asset[]>()
  const roots: Asset[] = []

  for (const asset of assets) {
    const ref = mode === 'parent'
      ? asset.parentAsset?.assetTag || asset.parentAsset?.name
      : asset.feedFrom?.assetTag   || asset.feedFrom?.name

    if (ref) {
      const key    = ref.trim().toLowerCase()
      const parent = byTag.get(key) ?? byName.get(key)
      if (parent && parent.id !== asset.id) {
        if (!childMap.has(parent.id)) childMap.set(parent.id, [])
        childMap.get(parent.id)!.push(asset)
        continue
      }
    }
    roots.push(asset)
  }

  function toNode(a: Asset): TreeNode {
    return {
      asset: a,
      children: (childMap.get(a.id) ?? [])
        .sort((x, y) => x.name.localeCompare(y.name))
        .map(toNode),
    }
  }

  return roots.sort((a, b) => a.name.localeCompare(b.name)).map(toNode)
}

// ─── Drill-down row ──────────────────────────────────────────────────────────

interface DrillRowProps {
  node: TreeNode
  onDrillIn: () => void
  onView: () => void
  onEdit: () => void
  onAddChild: () => void
  mode: TreeMode
}

function DrillRow({ node, onDrillIn, onView, onEdit, onAddChild, mode }: DrillRowProps) {
  const { asset, children } = node
  const hasChildren = children.length > 0
  const statusKey   = asset.status?.toLowerCase().replace(/ /g, '_') ?? 'inactive'
  const dotCls      = STATUS_DOT[statusKey] ?? 'bg-gray-300'

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 border-b border-border/40 hover:bg-accent/40 active:bg-accent/60 transition-colors cursor-pointer"
      onClick={hasChildren ? onDrillIn : onView}
    >
      {/* Status dot */}
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotCls)} />

      {/* Name + tag */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug break-words">{asset.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {asset.assetTag && (
            <span className="text-[11px] font-mono text-muted-foreground">{asset.assetTag}</span>
          )}
          {mode !== 'feedFrom' && asset.location?.name && (
            <span className="text-[11px] text-muted-foreground">{asset.location.name}</span>
          )}
          {asset.model && (
            <span className="text-[11px] text-muted-foreground">{asset.model}</span>
          )}
        </div>
      </div>

      {/* Children count */}
      {hasChildren && (
        <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 shrink-0">
          {children.length}
        </span>
      )}

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
          onClick={e => { e.stopPropagation(); onView() }}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={e => { e.stopPropagation(); onEdit() }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
          onClick={e => { e.stopPropagation(); onAddChild() }}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Drill arrow */}
      {hasChildren && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AssetTreeViewProps {
  assets: Asset[]
  onEdit: (asset: Asset) => void
  onAddChild: (asset: Asset, mode: TreeMode) => void
  onViewAsset: (id: number) => void
}

export function AssetTreeView({ assets, onEdit, onAddChild, onViewAsset }: AssetTreeViewProps) {
  const [mode,  setMode]  = useState<TreeMode>('feedFrom')
  const [stack, setStack] = useState<TreeNode[]>([])   // navigation stack (breadcrumb path)

  const relevantAssets = useMemo(() => {
    if (mode !== 'feedFrom') return assets
    return assets.filter(a =>
      FEED_ROOT_TYPES.includes(a.model ?? '') || hasFeedRef(a)
    )
  }, [assets, mode])

  const tree = useMemo(() => buildTree(relevantAssets, mode), [relevantAssets, mode])

  const currentNodes  = stack.length === 0 ? tree : stack[stack.length - 1].children
  const currentParent = stack.length > 0 ? stack[stack.length - 1].asset : null

  const drillInto = (node: TreeNode) => setStack(prev => [...prev, node])
  const goBack    = () => setStack(prev => prev.slice(0, -1))
  const goToLevel = (idx: number) => setStack(prev => prev.slice(0, idx + 1))
  const goToRoot  = () => setStack([])

  const switchMode = (m: TreeMode) => { setMode(m); setStack([]) }

  return (
    <div className="rounded-lg border bg-card flex flex-col">

      {/* ── Toolbar ── */}
      <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md overflow-hidden border text-xs font-medium shrink-0">
            <button
              onClick={() => switchMode('feedFrom')}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 transition-colors',
                mode === 'feedFrom' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
            >
              <Network className="h-3.5 w-3.5" /> Power Feed
            </button>
            <button
              onClick={() => switchMode('parent')}
              className={cn('flex items-center gap-1 px-2.5 py-1.5 transition-colors border-l',
                mode === 'parent' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
            >
              <GitBranch className="h-3.5 w-3.5" /> Physical
            </button>
          </div>

          <span className="text-xs text-muted-foreground flex-1 truncate">
            {tree.length} roots · {relevantAssets.length} assets
          </span>
        </div>

        {mode === 'feedFrom' && stack.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
            Showing transformers (TXh/TXl) and equipment with a Feed From value.
          </p>
        )}
      </div>

      {/* ── Breadcrumb ── */}
      {stack.length > 0 && (
        <div className="px-3 py-2 border-b bg-muted/10 shrink-0">
          <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
            <button
              onClick={goToRoot}
              className="hover:text-foreground transition-colors"
            >
              Root
            </button>
            {stack.map((node, i) => (
              <span key={node.asset.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  onClick={() => goToLevel(i)}
                  className={cn(
                    'hover:text-foreground transition-colors max-w-[120px] truncate',
                    i === stack.length - 1 ? 'text-foreground font-medium' : ''
                  )}
                  title={node.asset.name}
                >
                  {node.asset.name}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Current-level header + back button ── */}
      {currentParent && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-muted/20 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">{currentParent.name}</p>
            {currentParent.assetTag && (
              <p className="text-[11px] font-mono text-muted-foreground">{currentParent.assetTag}</p>
            )}
          </div>
          {/* Mobile actions for the current parent */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
              onClick={() => onViewAsset(currentParent.id)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => onEdit(currentParent)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground border-b bg-muted/10 flex-wrap shrink-0">
        {[
          ['bg-green-500',  'Active'],
          ['bg-yellow-500', 'Maintenance'],
          ['bg-gray-400',   'Inactive'],
          ['bg-red-400',    'Decommissioned'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full shrink-0', cls)} /> {label}
          </span>
        ))}
      </div>

      {/* ── Asset list ── */}
      <div className="overflow-y-auto max-h-[calc(100dvh-300px)]">
        {currentNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {stack.length === 0 && mode === 'feedFrom'
              ? 'No transformers or feed connections found.'
              : 'No sub-assets at this level.'}
          </p>
        ) : (
          currentNodes.map(node => (
            <DrillRow
              key={node.asset.id}
              node={node}
              onDrillIn={() => drillInto(node)}
              onView={() => onViewAsset(node.asset.id)}
              onEdit={() => onEdit(node.asset)}
              onAddChild={() => onAddChild(node.asset, mode)}
              mode={mode}
            />
          ))
        )}
      </div>

    </div>
  )
}
