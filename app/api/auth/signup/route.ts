import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { confirmationEmail } from '@/lib/email-templates'

export async function POST(request: Request) {
  const { email, password, username, display_name } = await request.json()

  if (!email || !password || !username || !display_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const service = createServiceClient()

  // generateLink creates the unconfirmed user AND returns the confirmation URL
  // without Supabase sending its own default email — giving us full control
  // over email delivery via Resend.
  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase(),
        display_name,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (linkError || !linkData?.user) {
    return NextResponse.json(
      { error: linkError?.message || 'Signup failed — please try again.' },
      { status: 400 }
    )
  }

  const userId = linkData.user.id

  // Upsert profile via service role (bypasses RLS, works even if trigger ran first)
  const { error: profileError } = await service
    .from('user_profiles')
    .upsert(
      { id: userId, email, username: username.toLowerCase(), display_name },
      { onConflict: 'id' }
    )

  if (profileError) {
    await service.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { error: 'Account setup failed. Please try again.' },
      { status: 500 }
    )
  }

  // Claim any pending invites stored for this email address
  const { data: pendingInvites } = await service
    .from('pending_invites')
    .select('auction_id, wallet_cr')
    .eq('email', email.toLowerCase())

  if (pendingInvites?.length) {
    await service.from('auction_participants').upsert(
      pendingInvites.map((inv: { auction_id: string; wallet_cr: number }) => ({
        auction_id: inv.auction_id,
        user_id: userId,
        invite_status: 'pending',
        wallet_cr: inv.wallet_cr,
      })),
      { onConflict: 'auction_id,user_id', ignoreDuplicates: true }
    )
    await service.from('pending_invites').delete().eq('email', email.toLowerCase())
  }

  // Send our beautifully branded confirmation email via Resend.
  // Supabase's generateLink does NOT send any email — we handle delivery entirely.
  const confirmUrl = linkData.properties?.action_link
  if (confirmUrl) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Clubdrafter <onboarding@resend.dev>',
      to: email,
      subject: 'Confirm your Clubdrafter account',
      html: confirmationEmail(display_name, confirmUrl),
    })
  }

  return NextResponse.json({ ok: true })
}
