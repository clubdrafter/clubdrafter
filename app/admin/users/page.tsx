import { createServiceClient } from "@/lib/supabase/server"
import type { UserProfile } from '@/types'

export default async function AdminUsersPage() {
  const supabase = createServiceClient()
  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-[#f0f4ff]">Users</h1>
        <p className="text-sm text-[#8892aa]">{users?.length || 0} registered users</p>
      </div>

      <div className="card-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#5a6478] text-xs border-b border-[#2a3347] uppercase tracking-wider">
                <th className="text-left px-4 py-3">Display Name</th>
                <th className="text-left px-4 py-3">Username</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Admin</th>
                <th className="text-left px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(users as UserProfile[] || []).map(u => (
                <tr key={u.id} className="border-b border-[#2a3347]/50 last:border-0 hover:bg-[#1e2535]/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[#f0f4ff]">{u.display_name}</td>
                  <td className="px-4 py-2.5 text-[#8892aa]">@{u.username}</td>
                  <td className="px-4 py-2.5 text-[#8892aa]">{u.email}</td>
                  <td className="px-4 py-2.5">
                    {u.is_admin ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#4f7cff]/15 text-[#4f7cff] border border-[#4f7cff]/20">Admin</span>
                    ) : (
                      <span className="text-xs text-[#5a6478]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[#5a6478] text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!users?.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5a6478]">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
