'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    if (sessionStorage.getItem('admin_authed') === 'yes') {
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed) loadQuizzes();
  }, [authed]);

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoginLoading(false);
    if (data.ok) {
      sessionStorage.setItem('admin_authed', 'yes');
      setAuthed(true);
    } else {
      setLoginError('Wrong password. Try again.');
    }
  }

  async function loadQuizzes() {
    setLoading(true);
    const res = await fetch('/api/admin/quizzes');
    const data = await res.json();
    setQuizzes(data.quizzes || []);
    setLoading(false);
  }

  async function deleteQuiz(id: string, title: string) {
    if (!confirm(`Delete quiz "${title}"? This also deletes all attempts.`)) return;
    await fetch(`/api/admin/quiz/${id}`, { method: 'DELETE' });
    loadQuizzes();
  }

  function logout() {
    sessionStorage.removeItem('admin_authed');
    setAuthed(false);
    setPassword('');
  }

  // ── LOGIN SCREEN ──────────────────────────────────────────
  if (!authed) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="animate-scale" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔐</div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Admin Access
            </h1>
            <p className="text-secondary text-sm">Enter your admin password to continue</p>
          </div>

          <div className="card">
            <div style={{ marginBottom: '16px' }}>
              <label>Admin Password</label>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ marginTop: '4px' }}
                autoFocus
              />
              {loginError && (
                <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '8px' }}>{loginError}</p>
              )}
            </div>
            <button
              className="btn btn-primary w-full"
              onClick={handleLogin}
              disabled={loginLoading || !password}
              style={{ justifyContent: 'center' }}
            >
              {loginLoading ? 'Checking...' : 'Enter Admin Panel →'}
            </button>
          </div>

          <p className="text-center text-muted text-sm" style={{ marginTop: '20px' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Back to home</Link>
          </p>
        </div>
      </main>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Nav */}
      <nav className="nav">
        <div className="container-wide nav-inner">
          <a href="/" className="nav-logo">Quiz<span>Craft</span></a>
          <div className="flex items-center gap-3">
            <Link href="/admin/create" className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '13px' }}>
              + Create Quiz
            </Link>
            <button className="btn btn-ghost" onClick={logout} style={{ padding: '9px 16px', fontSize: '13px' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-wide" style={{ paddingTop: '40px' }}>
        {/* Header */}
        <div className="animate-in" style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: '6px' }}>
            Admin Dashboard
          </h1>
          <p className="text-secondary">Manage your quizzes and track participant scores</p>
        </div>

        {/* Stats row */}
        <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px', animationDelay: '0.05s' }}>
          <div className="card-sm">
            <p className="text-muted text-xs" style={{ marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Quizzes</p>
            <p style={{ fontSize: '32px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'var(--accent)' }}>{quizzes.length}</p>
          </div>
          <div className="card-sm">
            <p className="text-muted text-xs" style={{ marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Attempts</p>
            <p style={{ fontSize: '32px', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'var(--accent)' }}>
              {quizzes.reduce((a, q) => a + q.attempt_count, 0)}
            </p>
          </div>
        </div>

        {/* Quiz list */}
        <div className="animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: '18px', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Your Quizzes</h2>
            <button className="btn btn-ghost" onClick={loadQuizzes} style={{ padding: '7px 14px', fontSize: '13px' }}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Loading quizzes...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ fontSize: '40px', marginBottom: '16px' }}>📝</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No quizzes yet</p>
              <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>Create your first quiz to get started</p>
              <Link href="/admin/create" className="btn btn-primary">+ Create First Quiz</Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Created</th>
                    <th>Attempts</th>
                    <th>Quiz Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q, i) => (
                    <tr key={q.id} style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both` }}>
                      <td>
                        <span style={{ fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>{q.title}</span>
                      </td>
                      <td className="text-secondary text-sm">
                        {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className="badge badge-amber">{q.attempt_count} taken</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                          onClick={() => {
                            const url = `${window.location.origin}/quiz/${q.id}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copied! 🎉\n\n' + url);
                          }}
                        >
                          📋 Copy Link
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/quiz/${q.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                          >
                            Manage
                          </Link>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                            onClick={() => deleteQuiz(q.id, q.title)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
