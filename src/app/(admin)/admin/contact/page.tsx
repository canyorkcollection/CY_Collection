import { supabaseAdmin } from '@/lib/supabase'
import ContactInfoManager from '@/components/admin/ContactInfoManager'

export default async function AdminContactPage() {
  const { data } = await supabaseAdmin.from('contact_info').select('*').single()
  return <ContactInfoManager initialInfo={data || {}} />
}
