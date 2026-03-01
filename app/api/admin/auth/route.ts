import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkAdminCredentials, generateAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (!checkAdminCredentials(username, password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await generateAdminToken()
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  return NextResponse.json({ ok: true })
}
