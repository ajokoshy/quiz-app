'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavLogo from '@/components/NavLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

interface Quiz {
  id: string; title: string; created_at: string;
  attempt_count: number; is_active: boolean;
}
interface Analytics {
  overview: {
    total_quizzes: number; total_attempts: number; total_passes: number;
    avg_score_pct: string; highest_score: number; lowest_score: number;
    full_quizzes: number; pass_rate_pct: string; total_archived: number;
  };
  perQuiz: any[];
  recentAttempts: {
    participant_name: string; score: number; total: number;
    attempted_at: string; quiz_title: string;
  }[];
}

export default function AdminPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'analytics'>('quizzes');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [qRes, aRes, archRes] = await Promise.all([
        fetch('/api/admin/quizzes', { cache: 'no-store' }),
        fetch('/api/admin/analytics', { cache: 'no-store' }),
        fetch('/api/admin/archive', { cache: 'no-store' }),
      ]);
      if (qRes.status === 401 || aRes.status === 401) { router.push('/admin/login'); return; }
      const qData = await qRes.json();
      const aData = await aRes.json();
      const archData = await archRes.json();
      const archCount = archData.archived?.length || 0;
      setQuizzes(qData.quizzes || []);
      setAnalytics({ ...aData, archivedCount: archCount });
    } catch { router.push('/admin/login'); }
    finally { setLoading(false); }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  }

  async function deleteQuiz(id: string, title: string) {
    if (!confirm(`Delete "${title}"?\n\nAll questions and attempts will be permanently deleted.`)) return;
    const res = await fetch(`/api/admin/quiz/${id}`, { method: 'DELETE' });
    if (res.ok) loadData();
    else alert('Failed to delete quiz.');
  }

  async function toggleQuiz(id: string, currentActive: boolean) {
    setToggling(id);
    const res = await fetch(`/api/admin/quiz/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    setToggling(null);
    if (data.ok) {
      setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_active: data.is_active } : q));
    } else {
      alert('Failed to update quiz status.');
    }
  }

  const ov = analytics?.overview;
  const activeQuizzes = quizzes.filter(q => q.is_active).length;
  const inactiveQuizzes = quizzes.filter(q => !q.is_active).length;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <div className="container-wide nav-inner">
          <NavLogo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin/archive" className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '13px' }}>🗄 Archive</Link>
            <Link href="/admin/create" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>+ New Quiz</Link>
            <button className="btn btn-ghost" onClick={handleLogout} style={{ padding: '8px 14px', fontSize: '13px' }}>Sign Out</button>
          </div>
        </div>
      </nav>

      <div className="container-wide" style={{ paddingTop: '32px', flex: 1, paddingBottom: '40px' }}>
        <div className="animate-in" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Dashboard</h1>
          <p className="text-secondary text-sm">Manage quizzes, monitor participation and performance</p>
        </div>

        {/* Stats */}
        {ov && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Total Quizzes', value: ov.total_quizzes, icon: '📋', color: 'var(--accent)' },
              { label: 'Active', value: activeQuizzes, icon: '✅', color: 'var(--success)' },
              { label: 'Inactive', value: inactiveQuizzes, icon: '⏸', color: 'var(--text-muted)' },
              { label: 'Total Attempts', value: ov.total_attempts, icon: '✍️', color: 'var(--accent)' },
              { label: 'Avg Score', value: `${ov.avg_score_pct}%`, icon: '📊', color: 'var(--warning)' },
              { label: 'Pass Rate', value: `${ov.pass_rate_pct}%`, icon: '🎯', color: 'var(--success)' },
              { label: 'Archived', value: (analytics as any)?.archivedCount || 0, icon: '🗄️', color: 'var(--text-secondary)' },
            ].map(s => (
              <div key={s.label} className="stat-card animate-in">
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>{s.icon}</div>
                <div className="stat-value" style={{ color: s.color, fontSize: '22px' }}>{s.value}</div>
                <div className="stat-label" style={{ marginBottom: 0, marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {(['quizzes', 'analytics'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px',
              fontSize: '14px', fontWeight: 600, textTransform: 'capitalize',
              color: activeTab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {t === 'quizzes' ? `Quizzes (${quizzes.length})` : 'Analytics'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : activeTab === 'quizzes' ? (
          quizzes.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No quizzes yet</div>
              <div className="empty-desc">Create your first quiz and share it with participants</div>
              <Link href="/admin/create" className="btn btn-primary">+ Create First Quiz</Link>
            </div>
          ) : (
            <div className="table-wrap animate-in">
              <table>
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Capacity</th>
                    <th>Share Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q, i) => {
                    const pct = (q.attempt_count / 100) * 100;
                    const isFull = q.attempt_count >= 100;
                    const capClass = pct >= 90 ? 'high' : pct >= 60 ? 'mid' : 'low';
                    const isToggling = toggling === q.id;
                    return (
                      <tr key={q.id} style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both`, opacity: q.is_active ? 1 : 0.65 }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span style={{ fontWeight: 700 }}>{q.title}</span>
                            {!q.is_active && (
                              <span className="badge badge-gray" style={{ fontSize: '10px' }}>INACTIVE</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {/* Toggle switch */}
                          <button
                            onClick={() => toggleQuiz(q.id, q.is_active)}
                            disabled={isToggling}
                            title={q.is_active ? 'Click to deactivate quiz' : 'Click to activate quiz'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '4px 0', opacity: isToggling ? 0.5 : 1,
                            }}
                          >
                            {/* Toggle pill */}
                            <div style={{
                              width: '42px', height: '22px', borderRadius: '99px',
                              background: q.is_active ? 'var(--success)' : 'var(--surface-3)',
                              border: `1px solid ${q.is_active ? 'var(--success)' : 'var(--border)'}`,
                              position: 'relative', transition: 'all 0.25s ease', flexShrink: 0,
                            }}>
                              <div style={{
                                position: 'absolute', top: '3px',
                                left: q.is_active ? '22px' : '3px',
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: '#fff', transition: 'left 0.25s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                              }} />
                            </div>
                            <span style={{
                              fontSize: '12px', fontWeight: 600,
                              color: q.is_active ? 'var(--success)' : 'var(--text-muted)',
                            }}>
                              {isToggling ? '...' : q.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                        </td>
                        <td className="text-secondary text-sm" style={{ whiteSpace: 'nowrap' }}>
                          {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ minWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isFull ? 'var(--danger)' : 'var(--text)', minWidth: '48px' }}>
                              {q.attempt_count}/100
                            </span>
                            <div className="capacity-bar" style={{ flex: 1 }}>
                              <div className={`capacity-fill ${capClass}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            onClick={() => {
                              const url = `${window.location.origin}/quiz/${q.id}`;
                              navigator.clipboard.writeText(url);
                              alert('Copied!\n\n' + url);
                            }}
                          >
                            📋 Copy
                          </button>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Link href={`/admin/quiz/${q.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                              Manage
                            </Link>
                            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => deleteQuiz(q.id, q.title)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── ANALYTICS TAB ── */
          <div className="animate-in">
            {!analytics ? (
              <div className="card empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div></div>
            ) : (
              <>
                <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>Per-Quiz Performance</h3>
                <div className="table-wrap" style={{ marginBottom: '28px' }}>
                  <table>
                    <thead>
                      <tr><th>Quiz</th><th>Status</th><th>Attempts</th><th>Avg Score</th><th>Highest</th><th>Lowest</th><th>Pass Rate</th></tr>
                    </thead>
                    <tbody>
                      {analytics.perQuiz?.map((q: any) => {
                        const passRate = q.attempt_count > 0 ? Math.round((q.pass_count / q.attempt_count) * 100) : 0;
                        return (
                          <tr key={q.id}>
                            <td style={{ fontWeight: 600, maxWidth: '200px' }}>{q.title}</td>
                            <td>
                              <span className={`badge ${q.is_active ? 'badge-green' : 'badge-gray'}`}>
                                {q.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td><span className="badge badge-blue">{q.attempt_count}</span></td>
                            <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{q.avg_score_pct}%</td>
                            <td style={{ color: 'var(--success)', fontWeight: 700 }}>{q.highest_score}/10</td>
                            <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{q.lowest_score}/10</td>
                            <td>
                              <span className={`badge ${passRate >= 70 ? 'badge-green' : passRate >= 40 ? 'badge-warning' : 'badge-red'}`}>
                                {passRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>Recent Attempts</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Participant</th><th>Quiz</th><th>Score</th><th>Result</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {analytics.recentAttempts.map((a, i) => {
                        const pct = Math.round((a.score / a.total) * 100);
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{a.participant_name}</td>
                            <td className="text-secondary text-sm" style={{ maxWidth: '180px' }}>{a.quiz_title}</td>
                            <td style={{ fontWeight: 700, color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                              {a.score}/{a.total}
                            </td>
                            <td><span className={`badge ${pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-warning' : 'badge-red'}`}>{pct}%</span></td>
                            <td className="text-secondary text-sm" style={{ whiteSpace: 'nowrap' }}>
                              {new Date(a.attempted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
