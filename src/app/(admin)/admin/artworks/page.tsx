import { supabaseAdmin } from '@/lib/supabase'
import ArtworksManager from '@/components/admin/ArtworksManager'

export default async function AdminArtworksPage() {
  const { data: artworks } = await supabaseAdmin
    .from('artworks')
    .select(`*, artist:artists(id, name), images:artwork_images(url, type, sort_order)`)
    .order('sort_order', { ascending: true })

  const { data: artists } = await supabaseAdmin
    .from('artists')
    .select('id, name')
    .order('name')

  return <ArtworksManager initialArtworks={artworks || []} artists={artists || []} />
}
