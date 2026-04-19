import { getVisitorSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import ArtistsView from '@/components/artists/ArtistsView'

export default async function ArtistsPage() {
  const session = await getVisitorSession()
  if (!session) redirect('/login')

  const { data: artists } = await supabaseAdmin
    .from('artists')
    .select('*')
    .eq('visible', true)
    .order('name')

  // Fetch artworks with cover image for each artist
  const artistsWithWorks = await Promise.all(
    (artists || []).map(async (artist) => {
      const { data: artworks } = await supabaseAdmin
        .from('artworks')
        .select('id, title, artwork_images(url, type, sort_order)')
        .eq('artist_id', artist.id)
        .eq('visible', true)
        .order('sort_order')

      const thumbs = (artworks || []).map(aw => {
        const imgs = (aw.artwork_images as any[]).sort((a, b) => a.sort_order - b.sort_order)
        const img = imgs.find((i: any) => i.type === 'gallery') || imgs[0]
        return { id: aw.id, title: aw.title, url: img?.url || '' }
      }).filter(t => t.url)

      return { ...artist, artworks: thumbs }
    })
  )

  return <ArtistsView artists={artistsWithWorks} />
}
