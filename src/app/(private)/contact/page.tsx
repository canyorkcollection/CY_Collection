import { getVisitorSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ContactView from '@/components/contact/ContactView'

export default async function ContactPage() {
  const session = await getVisitorSession()
  if (!session) redirect('/login')

  const { data } = await supabaseAdmin
    .from('contact_info')
    .select('*')
    .single()

  return <ContactView info={data || {}} />
}
