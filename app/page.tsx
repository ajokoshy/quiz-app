import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        }} />
      </div>

      <div className="animate-in" style={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: '520px' }}>
        <div style={{ marginBottom: '24px' }}>
          <span className="badge badge-amber" style={{ fontSize: '13px', padding: '5px 14px' }}>
            ✦ QuizCraft
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 58px)', fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: '20px', lineHeight: 1.1 }}>
          Create quizzes.<br />
          <span style={{ color: 'var(--accent)' }}>Share instantly.</span>
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.6, marginBottom: '40px' }}>
          Build beautiful 10-question multiple choice quizzes, share a link, and track every score in your admin panel.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin" className="btn btn-primary" style={{ fontSize: '15px', padding: '13px 28px' }}>
            Go to Admin Panel →
          </Link>
        </div>

        <p className="text-muted text-sm" style={{ marginTop: '48px' }}>
          Built with Next.js · Neon DB · Vercel
        </p>
      </div>
    </main>
  );
}
