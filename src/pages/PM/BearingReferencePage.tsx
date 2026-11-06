import { useState } from 'react'
import { Plus, Pencil, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { CRUDModal } from '@/components/shared/CRUDModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { loadBearings, saveBearings, type BearingEntry } from '@/utils/bearingReference'

const GUN_G_PER_SHOT = 1.25

function shots(grams: number) {
  return Math.ceil(grams / GUN_G_PER_SHOT)
}

export function BearingReferencePage() {
  const { toast } = useToast()
  const [bearings, setBearings] = useState<BearingEntry[]>(loadBearings)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<BearingEntry | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formGrams, setFormGrams] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const persist = (updated: BearingEntry[]) => { setBearings(updated); saveBearings(updated) }

  const openCreate = () => {
    setEditEntry(null); setFormCode(''); setFormGrams(''); setFormNotes('')
    setModalOpen(true)
  }

  const openEdit = (e: BearingEntry) => {
    setEditEntry(e); setFormCode(e.code); setFormGrams(String(e.grams)); setFormNotes(e.notes ?? '')
    setModalOpen(true)
  }

  const handleSave = () => {
    const g = parseFloat(formGrams)
    if (!formCode.trim() || isNaN(g) || g <= 0) {
      toast({ title: 'Bearing code and a valid gram amount are required', variant: 'destructive' })
      return
    }
    const entry: BearingEntry = { id: editEntry?.id ?? Date.now().toString(), code: formCode.trim().toUpperCase(), grams: g, notes: formNotes.trim() || undefined }
    persist(editEntry ? bearings.map(b => b.id === editEntry.id ? entry : b) : [...bearings, entry])
    toast({ title: editEntry ? 'Bearing updated' : 'Bearing added' })
    setModalOpen(false)
  }

  const handleDelete = () => {
    if (!deleteId) return
    persist(bearings.filter(b => b.id !== deleteId))
    setDeleteId(null)
    toast({ title: 'Deleted' })
  }

  const gramsNum = parseFloat(formGrams)
  const previewShots = !isNaN(gramsNum) && gramsNum > 0 ? shots(gramsNum) : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bearing Grease Reference</h1>
          <p className="text-muted-foreground">
            Toshiba bearing data · Milwaukee gun @ {GUN_G_PER_SHOT} g/pump · used automatically in PM checklists
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Add Bearing</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left p-3 font-medium">Bearing Code</th>
              <th className="text-right p-3 font-medium">Grease (g)</th>
              <th className="text-right p-3 font-medium">
                <span className="flex items-center justify-end gap-1">
                  <Zap className="h-3.5 w-3.5 text-blue-600" />Milwaukee Shots
                </span>
              </th>
              <th className="text-left p-3 font-medium">Notes</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {bearings.map((b, i) => (
              <tr key={b.id} className={`border-t hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <td className="p-3 font-mono font-semibold tracking-wide">{b.code}</td>
                <td className="p-3 text-right font-medium">{b.grams} g</td>
                <td className="p-3 text-right font-semibold text-blue-700">{shots(b.grams)} shots</td>
                <td className="p-3 text-muted-foreground text-xs">{b.notes}</td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {bearings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  No bearings yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CRUDModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editEntry ? 'Edit Bearing' : 'Add Bearing'}
        onSubmit={handleSave}
        isLoading={false}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Bearing Code *</Label>
            <Input
              value={formCode}
              onChange={e => setFormCode(e.target.value)}
              placeholder="e.g. 6314C3"
            />
          </div>
          <div className="space-y-2">
            <Label>Grease Amount (grams) *</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={formGrams}
              onChange={e => setFormGrams(e.target.value)}
              placeholder="e.g. 50"
            />
            {previewShots !== null && (
              <p className="text-xs text-muted-foreground">
                Milwaukee gun: <span className="font-semibold text-blue-700">{previewShots} shots</span> at {GUN_G_PER_SHOT} g/pump
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Direct Toshiba match"
            />
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
