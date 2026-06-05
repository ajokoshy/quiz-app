'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import NavLogo from '@/components/NavLogo';
import ThemeToggle from '@/components/ThemeToggle';

interface Quiz {
  id: string;
  title: string;
  created_at: string;
  attempt_count: number;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') === 'yes') setAuthed(true);
  }, []);

  useEffect(() => { if (authed) loadQuizzes(); }, [authed]);

  async function handleLogin() {
    setLoginLoading(true); setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoginLoading(false);
    if (data.ok) { sessionStorage.setItem('admin_authed', 'yes'); setAuthed(true); }
    else setLoginError('Incorrect password. Please try again.');
  }

  async function loadQuizzes() {
    setLoading(true);
    const res = await fetch('/api/admin/quizzes');
    const data = await res.json();
    setQuizzes(data.quizzes || []);
    setLoading(false);
  }

  async function deleteQuiz(id: string, title: string) {
    if (!confirm(`Delete "${title}"? All attempts will also be deleted.`)) return;
    await fetch(`/api/admin/quiz/${id}`, { method: 'DELETE' });
    loadQuizzes();
  }

  function logout() { sessionStorage.removeItem('admin_authed'); setAuthed(false); setPassword(''); }

  const totalAttempts = quizzes.reduce((a, q) => a + q.attempt_count, 0);

  // ── LOGIN ──
  if (!authed) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}><ThemeToggle /></div>

      <div className="animate-scale" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' }}>🎯</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>Quiz Craft</h1>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>by Ajo Koshy Joseph</p>
          <p className="text-secondary text-sm" style={{ marginTop: '12px' }}>Sign in to your admin panel</p>
        </div>

        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <label>Admin Password</label>
            <input type="password" placeholder="Enter your password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && password && handleLogin()}
              autoFocus style={{ marginTop: '6px' }}
            />
            {loginError && <p className="text-danger text-sm" style={{ marginTop: '8px' }}>⚠ {loginError}</p>}
          </div>
          <button className="btn btn-primary w-full" onClick={handleLogin}
            disabled={loginLoading || !password} style={{ justifyContent: 'center', padding: '12px' }}>
            {loginLoading ? 'Verifying...' : 'Sign In →'}
          </button>
        </div>
      </div>
    </main>
  );

  // ── DASHBOARD ──
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '60px' }}>
      <nav className="nav">
        <div className="container-wide nav-inner">
          <NavLogo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin/create" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              + New Quiz
            </Link>
            <button className="btn btn-ghost" onClick={logout} style={{ padding: '8px 14px', fontSize: '13px' }}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container-wide" style={{ paddingTop: '36px' }}>
        {/* Page header */}
        <div className="animate-in" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Dashboard</h1>
          <p className="text-secondary text-sm">Manage quizzes, track participants and scores</p>
        </div>

        {/* Stats */}
        <div className="grid-4 animate-in" style={{ marginBottom: '32px', animationDelay: '0.05s' }}>
          {[
            { label: 'Total Quizzes', value: quizzes.length, icon: '📋' },
            { label: 'Total Attempts', value: totalAttempts, icon: '✍️' },
            { label: 'Active Quizzes', value: quizzes.filter(q => q.attempt_count < 100).length, icon: '✅' },
            { label: 'Full Quizzes', value: quizzes.filter(q => q.attempt_count >= 100).length, icon: '🔒' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label" style={{ marginBottom: 0, marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quiz list */}
        <div className="animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="section-header">
            <span className="section-title">Your Quizzes</span>
            <button className="btn btn-ghost" onClick={loadQuizzes} style={{ padding: '6px 12px', fontSize: '12px' }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>
          ) : quizzes.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No quizzes yet</div>
              <div className="empty-desc">Create your first quiz and share it with participants</div>
              <Link href="/admin/create" className="btn btn-primary">+ Create First Quiz</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Created</th>
                    <th>Capacity</th>
                    <th>Quiz Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q, i) => {
                    const pct = (q.attempt_count / 100) * 100;
                    const capClass = pct >= 90 ? 'high' : pct >= 60 ? 'mid' : 'low';
                    const isFull = q.attempt_count >= 100;
                    return (
                      <tr key={q.id} style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
                        <td>
                          <span style={{ fontWeight: 700 }}>{q.title}</span>
                          {isFull && <span className="badge badge-red" style={{ marginLeft: '8px' }}>FULL</span>}
                        </td>
                        <td className="text-secondary text-sm">
                          {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ minWidth: '140px' }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', fontWeight: 600, color: isFull ? 'var(--danger)' : 'var(--text)' }}>
                              {q.attempt_count}/100
                            </span>
                            <div className="capacity-bar" style={{ flex: 1 }}>
                              <div className={`capacity-fill ${capClass}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '12px' }}
                            onClick={() => { const url = `${window.location.origin}/quiz/${q.id}`; navigator.clipboard.writeText(url); alert('Link copied!\n\n' + url); }}>
                            📋 Copy Link
                          </button>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Link href={`/admin/quiz/${q.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Manage</Link>
                            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => deleteQuiz(q.id, q.title)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
