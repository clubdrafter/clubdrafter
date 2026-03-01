import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password, username, display_name } = await request.json()

  if (!email || !password || !username || !display_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use a plain anon client (not SSR) so signUp sends the verification email correctly.
  // The service role client would auto-confirm the user and skip email verification.
  const anonClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error: signUpError } = await anonClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.toLowerCase(),
        display_name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 400 })
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Signup failed — please try again.' }, { status: 400 })
  }

  // Service role bypasses RLS entirely — guarantees the profile row is created
  // even if the database trigger failed or the table has no INSERT policy.
  const service = createServiceClient()
  const { error: profileError } = await service
    .from('user_profiles')
    .upsert(
      {
        id: data.user.id,
        email,
        username: username.toLowerCase(),
        display_name,
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    // Profile creation failed — delete the orphaned auth user so the email
    // address can be reused and the user can try again.
    await service.auth.admin.deleteUser(data.user.id)
    return NextResponse.json(
      { error: 'Account setup failed. Please try signing up again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
