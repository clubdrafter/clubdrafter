import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { auctionId, emails } = await request.json()
  if (!auctionId || !Array.isArray(emails)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Verify requester is the host
  const { data: auction } = await serviceClient
    .from('auctions')
    .select('*, league_name, host:user_profiles!auctions_host_id_fkey(display_name)')
    .eq('id', auctionId)
    .eq('host_id', user.id)
    .single()

  if (!auction) return NextResponse.json({ error: 'Not found or not host' }, { status: 403 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results = []

  for (const email of emails) {
    const normalised = email.toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)) continue

    // Look up if user exists
    const { data: existingProfile } = await serviceClient
      .from('user_profiles')
      .select('id')
      .eq('email', normalised)
      .maybeSingle()

    if (existingProfile) {
      // Upsert participation record
      const { error } = await serviceClient.from('auction_participants').upsert({
        auction_id: auctionId,
        user_id: existingProfile.id,
        invite_status: 'pending',
        wallet_cr: auction.rules?.wallet_cr ?? 100,
      }, { onConflict: 'auction_id,user_id', ignoreDuplicates: true })

      if (!error) results.push({ email, status: 'invited' })
    }

    // Send email regardless (invite link works for new users too)
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@clubdrafter.com',
        to: normalised,
        subject: `You've been invited to ${auction.league_name} on Clubdrafter`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1117;color:#f0f4ff;padding:32px;border-radius:12px">
            <h2 style="margin:0 0 8px;color:#4f7cff">Clubdrafter</h2>
            <p style="margin:0 0 16px;color:#8892aa">Fantasy IPL Auction</p>
            <h3 style="margin:0 0 8px">${(auction.host as {display_name:string})?.display_name} invited you to join</h3>
            <p style="font-size:1.25rem;font-weight:700;color:#4f7cff;margin:0 0 24px">${auction.league_name}</p>
            <a href="${appUrl}/login" style="display:inline-block;background:#4f7cff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
              Accept Invitation
            </a>
            <p style="margin:24px 0 0;font-size:0.75rem;color:#5a6478">
              Log in or create an account to accept. The invitation will appear on your dashboard.
            </p>
          </div>
        `,
      })
    } catch {
      // Email failure is non-fatal
    }
  }

  return NextResponse.json({ results })
}
