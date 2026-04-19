import { supabaseAdmin } from '@/lib/supabase'
import InvitationsManager from '@/components/admin/InvitationsManager'

export default async function InvitationsPage() {
  const { data: invitations } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false })

  return <InvitationsManager initialInvitations={invitations || []} />
}
