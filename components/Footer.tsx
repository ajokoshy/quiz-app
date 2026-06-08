'use client';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '18px 24px',
      marginTop: 'auto',
    }}>
      <div style={{
        maxWidth: '1080px', margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', flexWrap: 'wrap', textAlign: 'center',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Designed by Future Next Technologies
        </span>
        <span style={{ color: 'var(--border-light)', fontSize: '13px' }}>·</span>
        <a
          href="https://www.futurenexttechnologies.com"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          www.futurenexttechnologies.com
        </a>
      </div>
    </footer>
  );
}
