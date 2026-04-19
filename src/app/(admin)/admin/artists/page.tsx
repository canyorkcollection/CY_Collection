import { supabaseAdmin } from '@/lib/supabase'
import ArtistsManager from '@/components/admin/ArtistsManager'

export default async function AdminArtistsPage() {
  const { data: artists } = await supabaseAdmin
    .from('artists')
    .select('*')
    .order('name')

  return <ArtistsManager initialArtists={artists || []} />
}
