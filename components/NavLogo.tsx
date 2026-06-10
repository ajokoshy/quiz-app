import Link from 'next/link';

export default function NavLogo() {
  return (
    <Link href="/" className="nav-logo">
      <div className="nav-logo-icon">🎯</div>
      <div className="nav-logo-text">
        <span className="nav-logo-main">Quiz Craft</span>
        <span className="nav-logo-sub">by Future Next Technologies</span>
      </div>
    </Link>
  );
}
