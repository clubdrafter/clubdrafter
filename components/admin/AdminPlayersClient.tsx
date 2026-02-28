'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Toggle } from '@/components/ui/Toggle'
import { toast } from '@/components/shared/Toaster'
import { getRoleColor } from '@/lib/utils'
import type { Player, PlayerRole, Tournament } from '@/types'

type PlayerRow = Player & { tournament: { name: string; slug: string } }

type PlayerForm = { name: string; role: PlayerRole; club: string; nationality: string; is_foreign: boolean; base_price_cr: number; tournament_id: string }

const ROLES: PlayerRole[] = ['BAT', 'BOWL', 'WK', 'AR']
const EMPTY_FORM: PlayerForm = { name: '', role: 'BAT', club: '', nationality: '', is_foreign: false, base_price_cr: 0.10, tournament_id: '' }

interface Props { players: PlayerRow[]; tournaments: Tournament[] }

export function AdminPlayersClient({ players: initialPlayers, tournaments }: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const [players, setPlayers] = useState(initialPlayers)
  const [search, setSearch]   = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null)
  const [form, setForm] = useState<PlayerForm>({ ...EMPTY_FORM, tournament_id: tournaments[0]?.id || '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.club.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditPlayer(null)
    setForm({ ...EMPTY_FORM, tournament_id: tournaments[0]?.id || '' })
    setModalOpen(true)
  }

  function openEdit(p: PlayerRow) {
    setEditPlayer(p)
    setForm({ name: p.name, role: p.role, club: p.club, nationality: p.nationality, is_foreign: p.is_foreign, base_price_cr: p.base_price_cr, tournament_id: p.tournament_id })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.club.trim() || !form.nationality.trim() || !form.tournament_id) {
      toast.error('Fill in all required fields')
      return
    }
    setSaving(true)

    if (editPlayer) {
      const { error } = await supabase.from('players').update({ ...form }).eq('id', editPlayer.id)
      if (error) { toast.error('Update failed'); setSaving(false); return }
      toast.success('Player updated')
    } else {
      const { error } = await supabase.from('players').insert({ ...form })
      if (error) { toast.error('Insert failed'); setSaving(false); return }
      toast.success('Player added')
    }

    setSaving(false)
    setModalOpen(false)
    router.refresh()
  }

  async function handleDelete(playerId: string) {
    if (!confirm('Delete this player? This cannot be undone.')) return
    setDeleting(playerId)
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    setDeleting(null)
    if (error) { toast.error('Delete failed'); return }
    setPlayers(prev => prev.filter(p => p.id !== playerId))
    toast.success('Player deleted')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#f0f4ff]">Players</h1>
          <p className="text-sm text-[#8892aa]">{players.length} players in database</p>
        </div>
        <Button onClick={openAdd}><Plus size={15} /> Add Player</Button>
      </div>

      <Input
        placeholder="Search players…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        prefix={<Search size={14} />}
        suffix={search && <button onClick={() => setSearch('')}><X size={14} /></button>}
      />

      <div className="card-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#5a6478] text-xs border-b border-[#2a3347] uppercase tracking-wider">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Club</th>
                <th className="text-left px-4 py-3">Nationality</th>
                <th className="text-left px-4 py-3">Tournament</th>
                <th className="text-left px-4 py-3">Base Price</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-[#2a3347]/50 last:border-0 hover:bg-[#1e2535]/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[#f0f4ff]">
                    {p.name}
                    {p.is_foreign && <Badge variant="purple" className="ml-1.5">FOR</Badge>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getRoleColor(p.role)}`}>{p.role}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#8892aa]">{p.club}</td>
                  <td className="px-4 py-2.5 text-[#8892aa]">{p.nationality}</td>
                  <td className="px-4 py-2.5 text-[#8892aa]">{p.tournament?.name}</td>
                  <td className="px-4 py-2.5 text-[#8892aa]">₹{p.base_price_cr} Cr</td>
                  <td className="px-4 py-2.5 text-right flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-[#5a6478] hover:text-[#4f7cff] hover:bg-[#1e2535] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="p-1.5 rounded-lg text-[#5a6478] hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#5a6478]">No players found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editPlayer ? 'Edit Player' : 'Add Player'}>
        <div className="flex flex-col gap-4">
          <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Player name" />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8892aa]">Role *</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${form.role === r ? 'border-[#4f7cff] bg-[#4f7cff]/15 text-[#4f7cff]' : 'border-[#2a3347] text-[#8892aa] hover:border-[#3a4560]'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Club *"        value={form.club}        onChange={e => setForm(f => ({ ...f, club: e.target.value }))}        placeholder="e.g. MI" />
            <Input label="Nationality *" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. India" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8892aa]">Base Price (Cr)</label>
              <input type="number" min={0.10} step={0.10} value={form.base_price_cr}
                onChange={e => setForm(f => ({ ...f, base_price_cr: parseFloat(e.target.value) || 0.10 }))}
                className="rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] px-3 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8892aa]">Tournament</label>
              <select value={form.tournament_id} onChange={e => setForm(f => ({ ...f, tournament_id: e.target.value }))}
                className="rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] px-3 py-2.5 text-sm h-11 focus:border-[#4f7cff] transition-colors">
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name} {t.season}</option>)}
              </select>
            </div>
          </div>

          <Toggle checked={form.is_foreign} onChange={v => setForm(f => ({ ...f, is_foreign: v }))} label="Foreign player" />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{editPlayer ? 'Update' : 'Add'} Player</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
