'use client';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10 }}><ThemeToggle /></div>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, var(--accent-dim) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="animate-in" style={{ textAlign: 'center', maxWidth: '540px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(79,126,248,0.3)' }}>🎯</div>
          <h1 style={{ fontSize: 'clamp(30px, 6vw, 52px)', fontWeight: 800, marginBottom: '6px', letterSpacing: '-0.03em' }}>Quiz Craft</h1>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>by Future Next Technologies</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '36px' }}>
            Create professional 10-question multiple choice quizzes, share a link, and track every score in your admin panel.
          </p>
          <Link href="/admin" className="btn btn-primary" style={{ fontSize: '15px', padding: '14px 32px', borderRadius: '10px' }}>
            Open Admin Panel →
          </Link>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '40px', flexWrap: 'wrap' }}>
            {['Create quizzes in minutes', 'Track 100 participants', 'Download results as PDF'].map(f => (
              <span key={f} className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
