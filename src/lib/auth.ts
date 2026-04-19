import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { createHash } from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!
const SESSION_COOKIE = 'cy_session'
const ADMIN_COOKIE = 'cy_admin'

export function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export async function getVisitorSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invitation) return { type: 'invitation', invitation }

  const { data: cp } = await supabaseAdmin
    .from('client_passwords')
    .select('*, invitations(*)')
    .eq('password_hash', hashPassword(token))
    .single()

  if (cp) return { type: 'client', data: cp }

  return null
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token) return false
  return token === hashPassword(ADMIN_PASSWORD)
}

export function isValidAdminPassword(password: string) {
  return password === ADMIN_PASSWORD
}
