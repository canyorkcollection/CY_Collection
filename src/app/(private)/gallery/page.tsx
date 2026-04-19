import { getVisitorSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import GalleryWalk from '@/components/gallery/GalleryWalk'

export default async function GalleryPage() {
  const session = await getVisitorSession()
  if (!session) redirect('/login')

  const { data: artworks } = await supabaseAdmin
    .from('artworks')
    .select(`
      *,
      artist:artists(id, name, bio_short, nationality, birth_year),
      images:artwork_images(url, type, sort_order)
    `)
    .eq('visible', true)
    .order('sort_order', { ascending: true })

  return <GalleryWalk artworks={artworks || []} />
}
