import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { inviteExistingUserEmail, inviteNewUserEmail } from '@/lib/email-templates'

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { auctionId, emails } = await request.json()
  if (!auctionId || !Array.isArray(emails)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const service = createServiceClient()

  // Verify requester is the host
  const { data: auction } = await service
    .from('auctions')
    .select('*, league_name, host:user_profiles!auctions_host_id_fkey(display_name)')
    .eq('id', auctionId)
    .eq('host_id', user.id)
    .single()

  if (!auction) return NextResponse.json({ error: 'Not found or not host' }, { status: 403 })

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const from     = process.env.RESEND_FROM_EMAIL || 'Clubdrafter <onboarding@resend.dev>'
  const hostName = (auction.host as { display_name: string })?.display_name || 'Someone'
  const results  = []

  for (const email of emails) {
    const normalised = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) continue

    // Check if user already has an account
    const { data: existingProfile } = await service
      .from('user_profiles')
      .select('id')
      .eq('email', normalised)
      .maybeSingle()

    if (existingProfile) {
      // ── Existing user: create participation row + send direct league link ──
      const { error } = await service.from('auction_participants').upsert({
        auction_id: auctionId,
        user_id: existingProfile.id,
        invite_status: 'pending',
        wallet_cr: auction.rules?.wallet_cr ?? 100,
      }, { onConflict: 'auction_id,user_id', ignoreDuplicates: true })

      if (!error) {
        results.push({ email: normalised, status: 'invited' })
        resend.emails.send({
          from,
          to: normalised,
          subject: `You've been invited to ${auction.league_name} on Clubdrafter`,
          html: inviteExistingUserEmail({
            hostName,
            leagueName: auction.league_name,
            leagueUrl: `${appUrl}/auction/${auctionId}/league`,
          }),
        }).catch(() => {/* non-fatal */})
      }
    } else {
      // ── New user: store pending invite + send signup email ──
      // When they register, /api/auth/signup will claim this row automatically.
      await service.from('pending_invites').upsert({
        email: normalised,
        auction_id: auctionId,
        wallet_cr: auction.rules?.wallet_cr ?? 100,
      }, { onConflict: 'email,auction_id', ignoreDuplicates: true })

      results.push({ email: normalised, status: 'pending_signup' })

      // Signup link pre-fills their email for a smoother experience
      const signupUrl = `${appUrl}/signup?email=${encodeURIComponent(normalised)}&auction_id=${auctionId}`

      resend.emails.send({
        from,
        to: normalised,
        subject: `You've been invited to ${auction.league_name} on Clubdrafter`,
        html: inviteNewUserEmail({
          hostName,
          leagueName: auction.league_name,
          signupUrl,
        }),
      }).catch(() => {/* non-fatal */})
    }
  }

  return NextResponse.json({ results })
}
