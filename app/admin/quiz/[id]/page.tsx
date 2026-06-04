'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  order_index: number;
}

interface Attempt {
  id: string;
  participant_name: string;
  score: number;
  total: number;
  attempted_at: string;
}

interface Quiz {
  id: string;
  title: string;
  created_at: string;
}

export default function AdminQuizDetail({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === '1';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Question>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'questions' | 'attempts'>('questions');
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);
  const [quizLink, setQuizLink] = useState('');

  useEffect(() => {
    loadAll();
    if (typeof window !== 'undefined') {
      setQuizLink(`${window.location.origin}/quiz/${params.id}`);
    }
  }, [params.id]);

  async function loadAll() {
    setLoading(true);
    const [qRes, aRes] = await Promise.all([
      fetch(`/api/admin/quiz/${params.id}`),
      fetch(`/api/admin/quiz/${params.id}/attempts`),
    ]);
    const qData = await qRes.json();
    const aData = await aRes.json();
    setQuiz(qData.quiz);
    setQuestions(qData.questions || []);
    setAttempts(aData.attempts || []);
    setLoading(false);
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditData({ ...q });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/admin/question/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    setSaving(false);
    setEditingId(null);
    loadAll();
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/admin/question/${id}`, { method: 'DELETE' });
    loadAll();
  }

  function scoreColor(score: number, total: number) {
    const pct = score / total;
    if (pct >= 0.8) return 'var(--success)';
    if (pct >= 0.5) return 'var(--accent)';
    return 'var(--danger)';
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="text-muted">Loading quiz...</p>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <nav className="nav">
        <div className="container-wide nav-inner">
          <a href="/" className="nav-logo">Quiz<span>Craft</span></a>
          <Link href="/admin" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="container-wide" style={{ paddingTop: '40px' }}>

        {/* Created success banner */}
        {showCreatedBanner && (
          <div className="animate-in" style={{
            background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ color: 'var(--success)', fontWeight: 600, fontFamily: 'Syne, sans-serif', marginBottom: '4px' }}>
                🎉 Quiz created successfully!
              </p>
              <p className="text-secondary text-sm">Share this link with participants:</p>
              <p style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text)', marginTop: '4px' }}>{quizLink}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
                onClick={() => { navigator.clipboard.writeText(quizLink); alert('Copied!'); }}
              >
                📋 Copy Link
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: '13px', padding: '8px 14px' }}
                onClick={() => setShowCreatedBanner(false)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Quiz header */}
        <div className="animate-in" style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: '8px' }}>
            {quiz?.title}
          </h1>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-amber">{questions.length} questions</span>
            <span className="badge badge-green">{attempts.length} attempts</span>
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => { navigator.clipboard.writeText(quizLink); alert('Copied! ' + quizLink); }}
            >
              📋 Copy Quiz Link
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {(['questions', 'attempts'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: '14px', fontWeight: 600,
                fontFamily: 'Syne, sans-serif',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px', transition: 'all 0.15s ease',
              }}
            >
              {t === 'questions' ? `Questions (${questions.length})` : `Attempts (${attempts.length})`}
            </button>
          ))}
        </div>

        {/* ── QUESTIONS TAB ── */}
        {tab === 'questions' && (
          <div>
            {questions.map((q, i) => (
              <div key={q.id} className="card animate-in" style={{ marginBottom: '16px', animationDelay: `${i * 0.04}s` }}>
                {editingId === q.id ? (
                  // ── Edit mode ──
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <label>Question</label>
                      <textarea
                        value={editData.question_text || ''}
                        onChange={e => setEditData(p => ({ ...p, question_text: e.target.value }))}
                        rows={2}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div className="grid-2" style={{ marginBottom: '12px' }}>
                      {(['a', 'b', 'c', 'd'] as const).map(l => (
                        <div key={l}>
                          <label>Option {l.toUpperCase()}</label>
                          <input
                            value={(editData as any)[`option_${l}`] || ''}
                            onChange={e => setEditData(p => ({ ...p, [`option_${l}`]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
                      <span className="text-secondary text-sm">Correct:</span>
                      {['A', 'B', 'C', 'D'].map(l => (
                        <button
                          key={l}
                          onClick={() => setEditData(p => ({ ...p, correct_option: l }))}
                          style={{
                            width: '34px', height: '34px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '13px', fontFamily: 'Syne, sans-serif',
                            background: editData.correct_option === l ? 'var(--accent)' : 'var(--surface-3)',
                            color: editData.correct_option === l ? '#000' : 'var(--text-secondary)',
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary" onClick={() => saveEdit(q.id)} disabled={saving} style={{ fontSize: '13px', padding: '8px 18px' }}>
                        {saving ? 'Saving...' : '✓ Save'}
                      </button>
                      <button className="btn btn-ghost" onClick={cancelEdit} style={{ fontSize: '13px', padding: '8px 16px' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // ── View mode ──
                  <div>
                    <div className="flex items-center justify-between" style={{ marginBottom: '12px', gap: '12px' }}>
                      <div className="flex items-center gap-3">
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', color: 'var(--accent)', flexShrink: 0,
                        }}>{i + 1}</div>
                        <p style={{ fontWeight: 500, fontSize: '15px' }}>{q.question_text}</p>
                      </div>
                      <div className="flex gap-2" style={{ flexShrink: 0 }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => startEdit(q)}>
                          Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => deleteQuestion(q.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="grid-2">
                      {(['a', 'b', 'c', 'd'] as const).map(l => (
                        <div
                          key={l}
                          style={{
                            padding: '9px 14px', borderRadius: '9px', fontSize: '13px',
                            background: q.correct_option === l.toUpperCase() ? 'var(--success-dim)' : 'var(--surface-2)',
                            border: `1px solid ${q.correct_option === l.toUpperCase() ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                            color: q.correct_option === l.toUpperCase() ? 'var(--success)' : 'var(--text)',
                            display: 'flex', gap: '8px', alignItems: 'center',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', opacity: 0.7 }}>{l.toUpperCase()}.</span>
                          {(q as any)[`option_${l}`]}
                          {q.correct_option === l.toUpperCase() && <span style={{ marginLeft: 'auto' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── ATTEMPTS TAB ── */}
        {tab === 'attempts' && (
          <div className="animate-in">
            {attempts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <p style={{ fontSize: '36px', marginBottom: '14px' }}>📭</p>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No attempts yet</p>
                <p className="text-secondary text-sm">Share the quiz link to start collecting responses.</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total Attempts', value: attempts.length },
                    { label: 'Average Score', value: `${(attempts.reduce((a, x) => a + x.score, 0) / attempts.length).toFixed(1)} / 10` },
                    { label: 'Top Score', value: `${Math.max(...attempts.map(a => a.score))} / 10` },
                  ].map(s => (
                    <div key={s.label} className="card-sm">
                      <p className="text-muted text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{s.label}</p>
                      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--accent)' }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Participant</th>
                        <th>Score</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((a, i) => (
                        <tr key={a.id}>
                          <td className="text-muted text-sm">{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{a.participant_name}</td>
                          <td>
                            <div className="flex items-center gap-10">
                              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: scoreColor(a.score, a.total) }}>
                                {a.score} / {a.total}
                              </span>
                              <div style={{ width: '80px', height: '4px', background: 'var(--surface-3)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ width: `${(a.score / a.total) * 100}%`, height: '100%', background: scoreColor(a.score, a.total), borderRadius: '99px' }} />
                              </div>
                            </div>
                          </td>
                          <td className="text-secondary text-sm">
                            {new Date(a.attempted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
