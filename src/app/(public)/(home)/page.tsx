import HeroSlider from '@/components/gallery/HeroSlider'
import Nav from '@/components/ui/Nav'

export default function HomePage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Nav />
      <HeroSlider />
      <section style={{ padding: '64px 80px', maxWidth: '600px' }}>
        <p className="label" style={{ marginBottom: '16px' }}>About</p>
        <p style={{ fontSize: '15px', lineHeight: '1.85', color: '#444' }}>
          Can York is a private collection of contemporary works assembled over two decades,
          now available for consultation by invitation. The collection spans painting,
          photography, and works on paper by artists from New York, Europe, and Latin America.
        </p>
        <p className="label" style={{ marginTop: '40px', color: '#bbb' }}>
          To view the full catalog, please use your invitation code.
        </p>
      </section>
    </main>
  )
}
