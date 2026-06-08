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
          style={{
            fontSize: '13px',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          www.futurenexttechnologies.com
        </a>
      </div>
    </footer>
  );
}
