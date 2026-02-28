'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/shared/Toaster'
import type { Tournament, Sport } from '@/types'

type TournamentForm = { name: string; sport: Sport; slug: string; season: string }

const SPORTS: Sport[] = ['cricket', 'football', 'basketball']
const EMPTY: TournamentForm = { name: '', sport: 'cricket', slug: '', season: '' }

export function AdminTournamentsClient({ tournaments: initial }: { tournaments: Tournament[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Tournament | null>(null)
  const [form, setForm] = useState<TournamentForm>({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  function openAdd()           { setEdit(null); setForm({ ...EMPTY }); setOpen(true) }
  function openEdit(t: Tournament) { setEdit(t); setForm({ name: t.name, sport: t.sport, slug: t.slug, season: t.season || '' }); setOpen(true) }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug are required'); return }
    setSaving(true)
    const payload = { name: form.name, sport: form.sport, slug: form.slug.toLowerCase(), season: form.season || null }
    const { error } = edit
      ? await supabase.from('tournaments').update(payload).eq('id', edit.id)
      : await supabase.from('tournaments').insert(payload)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success(edit ? 'Tournament updated' : 'Tournament added')
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f0f4ff]">Tournaments</h1>
          <p className="text-sm text-[#8892aa]">Manage available tournaments</p>
        </div>
        <Button onClick={openAdd}><Plus size={15} /> Add Tournament</Button>
      </div>

      <div className="card-glow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[#5a6478] text-xs border-b border-[#2a3347] uppercase tracking-wider">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Sport</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Season</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.map(t => (
              <tr key={t.id} className="border-b border-[#2a3347]/50 last:border-0 hover:bg-[#1e2535]/50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-[#f0f4ff]">{t.name}</td>
                <td className="px-4 py-2.5 text-[#8892aa] capitalize">{t.sport}</td>
                <td className="px-4 py-2.5 text-[#8892aa] font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-2.5 text-[#8892aa]">{t.season || '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-[#5a6478] hover:text-[#4f7cff] hover:bg-[#1e2535] transition-colors">
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit Tournament' : 'Add Tournament'}>
        <div className="flex flex-col gap-4">
          <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. IPL" />
          <Input label="Slug *" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="e.g. ipl-2025" hint="URL-safe identifier, lowercase" />
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8892aa]">Sport</label>
              <select value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value as Sport }))}
                className="rounded-xl bg-[#1e2535] border border-[#2a3347] text-[#f0f4ff] px-3 py-2.5 text-sm h-11 capitalize">
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Season" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="e.g. 2025" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Cancel</Button>
            <Button fullWidth loading={saving} onClick={handleSave}>{edit ? 'Update' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
