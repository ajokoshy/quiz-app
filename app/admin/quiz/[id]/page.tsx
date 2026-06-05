'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import NavLogo from '@/components/NavLogo';
import ThemeToggle from '@/components/ThemeToggle';

interface Question {
  id: string; question_text: string; option_a: string; option_b: string;
  option_c: string; option_d: string; correct_option: string; order_index: number;
}
interface Attempt {
  id: string; participant_name: string; score: number; total: number; attempted_at: string;
}
interface Quiz { id: string; title: string; created_at: string; }

export default function AdminQuizDetail({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Question>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'questions' | 'attempts'>('questions');
  const [showBanner, setShowBanner] = useState(searchParams.get('created') === '1');
  const [quizLink, setQuizLink] = useState('');

  useEffect(() => {
    loadAll();
    if (typeof window !== 'undefined') setQuizLink(`${window.location.origin}/quiz/${params.id}`);
  }, [params.id]);

  async function loadAll() {
    setLoading(true);
    const [qRes, aRes] = await Promise.all([
      fetch(`/api/admin/quiz/${params.id}`),
      fetch(`/api/admin/quiz/${params.id}/attempts`),
    ]);
    const qData = await qRes.json();
    const aData = await aRes.json();
    setQuiz(qData.quiz); setQuestions(qData.questions || []); setAttempts(aData.attempts || []);
    setLoading(false);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/admin/question/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData),
    });
    setSaving(false); setEditingId(null); loadAll();
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return;
    await fetch(`/api/admin/question/${id}`, { method: 'DELETE' }); loadAll();
  }

  async function deleteSingleAttempt(id: string, name: string) {
    if (!confirm(`Remove attempt by "${name}"?`)) return;
    await fetch(`/api/admin/attempt/${id}`, { method: 'DELETE' }); loadAll();
  }

  async function deleteAllAttempts() {
    if (!confirm(`Delete ALL ${attempts.length} attempts? This frees up slots for new participants.`)) return;
    await fetch(`/api/admin/quiz/${params.id}/attempts`, { method: 'DELETE' }); loadAll();
  }

  function scoreColor(score: number, total: number) {
    const p = score / total;
    return p >= 0.8 ? 'var(--success)' : p >= 0.5 ? 'var(--warning)' : 'var(--danger)';
  }

  // ── DOWNLOAD EXCEL (CSV) ──
  function downloadCSV() {
    const rows = [['#', 'Participant Name', 'Score', 'Out of', 'Percentage', 'Date', 'Time']];
    attempts.forEach((a, i) => {
      const d = new Date(a.attempted_at);
      rows.push([
        String(i + 1), a.participant_name, String(a.score), String(a.total),
        `${Math.round((a.score / a.total) * 100)}%`,
        d.toLocaleDateString('en-IN'), d.toLocaleTimeString('en-IN'),
      ]);
    });
    const avg = attempts.length ? (attempts.reduce((s, a) => s + a.score, 0) / attempts.length).toFixed(1) : '0';
    rows.push([]);
    rows.push(['', 'Average Score', avg, '10', '', '', '']);
    rows.push(['', 'Total Attempts', String(attempts.length), '', '', '', '']);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${quiz?.title || 'quiz'}_results.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── DOWNLOAD PDF ──
  function downloadPDF() {
    const avg = attempts.length ? (attempts.reduce((s, a) => s + a.score, 0) / attempts.length).toFixed(1) : '0';
    const top = attempts.length ? Math.max(...attempts.map(a => a.score)) : 0;
    const rows = attempts.map((a, i) => {
      const pct = Math.round((a.score / a.total) * 100);
      const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
      return `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:10px 14px;color:#6b7280">${i + 1}</td>
          <td style="padding:10px 14px;font-weight:600">${a.participant_name}</td>
          <td style="padding:10px 14px;font-weight:700;color:${color}">${a.score} / ${a.total}</td>
          <td style="padding:10px 14px">
            <span style="background:${pct>=80?'#dcfce7':pct>=50?'#fef9c3':'#fee2e2'};color:${color};padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700">${pct}%</span>
          </td>
          <td style="padding:10px 14px;color:#6b7280;font-size:13px">${new Date(a.attempted_at).toLocaleString('en-IN')}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${quiz?.title} - Results</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,Arial,sans-serif;background:#f9fafb;color:#111827;padding:40px}
      .header{background:linear-gradient(135deg,#3b6ef0,#7c3aed);color:#fff;padding:32px;border-radius:16px;margin-bottom:32px}
      h1{font-size:24px;font-weight:800;margin-bottom:4px}
      .meta{font-size:13px;opacity:0.85;margin-top:8px}
      .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
      .stat{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;text-align:center}
      .stat-val{font-size:28px;font-weight:800;color:#3b6ef0;margin-bottom:4px}
      .stat-lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em}
      table{width:100%;background:#fff;border-radius:12px;border:1px solid #e5e7eb;border-collapse:collapse;overflow:hidden}
      th{background:#f3f4f6;padding:11px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:1px solid #e5e7eb}
      .footer{text-align:center;margin-top:28px;color:#9ca3af;font-size:12px}</style></head>
    <body>
      <div class="header">
        <p style="font-size:12px;opacity:0.8;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em">Quiz Results Report</p>
        <h1>${quiz?.title}</h1>
        <p class="meta">Generated on ${new Date().toLocaleString('en-IN')} &nbsp;|&nbsp; Quiz Craft by Ajo Koshy Joseph</p>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${attempts.length}</div><div class="stat-lbl">Total Attempts</div></div>
        <div class="stat"><div class="stat-val">${avg}/10</div><div class="stat-lbl">Average Score</div></div>
        <div class="stat"><div class="stat-val">${top}/10</div><div class="stat-lbl">Top Score</div></div>
        <div class="stat"><div class="stat-val">${attempts.length ? Math.round((attempts.filter(a=>a.score>=5).length/attempts.length)*100) : 0}%</div><div class="stat-lbl">Pass Rate (≥50%)</div></div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Participant</th><th>Score</th><th>Result</th><th>Date & Time</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Quiz Craft by Ajo Koshy Joseph &nbsp;·&nbsp; Confidential</div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) { win.onload = () => { win.print(); }; }
    URL.revokeObjectURL(url);
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="spinner" />
    </main>
  );

  const attemptPct = Math.round((attempts.length / 100) * 100);
  const capClass = attemptPct >= 90 ? 'high' : attemptPct >= 60 ? 'mid' : 'low';

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '80px' }}>
      <nav className="nav">
        <div className="container-wide nav-inner">
          <NavLogo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin" className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '13px' }}>← Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="container-wide" style={{ paddingTop: '32px' }}>

        {/* Created banner */}
        {showBanner && (
          <div className="alert alert-success animate-in" style={{ marginBottom: '20px', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>🎉 Quiz created successfully!</p>
              <p style={{ fontSize: '13px', opacity: 0.85 }}>Share this link: <strong>{quizLink}</strong></p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-success" style={{ fontSize: '12px', padding: '7px 14px' }}
                onClick={() => { navigator.clipboard.writeText(quizLink); alert('Copied!'); }}>
                📋 Copy Link
              </button>
              <button onClick={() => setShowBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', fontWeight: 700, fontSize: '18px' }}>×</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="animate-in" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '10px' }}>{quiz?.title}</h1>
          <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-blue">{questions.length} questions</span>
            <span className={`badge ${attempts.length >= 100 ? 'badge-red' : 'badge-green'}`}>
              {attempts.length}/100 attempts
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="capacity-bar" style={{ width: '100px' }}>
                <div className={`capacity-fill ${capClass}`} style={{ width: `${attemptPct}%` }} />
              </div>
              <span className="text-xs text-muted">{100 - attempts.length} slots left</span>
            </div>
            <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => { navigator.clipboard.writeText(quizLink); alert('Copied! ' + quizLink); }}>
              📋 Copy Quiz Link
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {(['questions', 'attempts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 20px',
              fontSize: '14px', fontWeight: 600, color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {t === 'questions' ? `Questions (${questions.length})` : `Attempts (${attempts.length})`}
            </button>
          ))}
        </div>

        {/* ── QUESTIONS TAB ── */}
        {tab === 'questions' && questions.map((q, i) => (
          <div key={q.id} className="card animate-in" style={{ marginBottom: '14px', animationDelay: `${i * 0.03}s` }}>
            {editingId === q.id ? (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <label>Question</label>
                  <textarea value={editData.question_text || ''} rows={2} style={{ marginTop: '6px', resize: 'vertical' }}
                    onChange={e => setEditData(p => ({ ...p, question_text: e.target.value }))} />
                </div>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  {(['a','b','c','d'] as const).map(l => (
                    <div key={l}>
                      <label>Option {l.toUpperCase()}</label>
                      <input value={(editData as any)[`option_${l}`] || ''} style={{ marginTop: '6px' }}
                        onChange={e => setEditData(p => ({ ...p, [`option_${l}`]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2" style={{ marginBottom: '14px' }}>
                  <span className="text-xs text-secondary" style={{ fontWeight: 600 }}>CORRECT:</span>
                  {['A','B','C','D'].map(l => (
                    <button key={l} onClick={() => setEditData(p => ({ ...p, correct_option: l }))} style={{
                      width: '34px', height: '34px', borderRadius: '8px', border: '2px solid', cursor: 'pointer', fontWeight: 700,
                      borderColor: editData.correct_option === l ? 'var(--success)' : 'var(--border)',
                      background: editData.correct_option === l ? 'var(--success)' : 'var(--surface-2)',
                      color: editData.correct_option === l ? '#fff' : 'var(--text-secondary)',
                    }}>{l}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => saveEdit(q.id)} disabled={saving} style={{ fontSize: '13px', padding: '8px 16px' }}>
                    {saving ? 'Saving...' : '✓ Save'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditingId(null)} style={{ fontSize: '13px', padding: '8px 14px' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: '12px', gap: '12px' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>{i + 1}</div>
                    <p style={{ fontWeight: 500, fontSize: '14px' }}>{q.question_text}</p>
                  </div>
                  <div className="flex gap-2" style={{ flexShrink: 0 }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => { setEditingId(q.id); setEditData({ ...q }); }}>Edit</button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => deleteQuestion(q.id)}>Delete</button>
                  </div>
                </div>
                <div className="grid-2">
                  {(['a','b','c','d'] as const).map(l => (
                    <div key={l} style={{
                      padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                      background: q.correct_option === l.toUpperCase() ? 'var(--success-dim)' : 'var(--surface-2)',
                      border: `1px solid ${q.correct_option === l.toUpperCase() ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                      color: q.correct_option === l.toUpperCase() ? 'var(--success)' : 'var(--text)',
                      display: 'flex', gap: '8px', alignItems: 'center',
                    }}>
                      <span style={{ fontWeight: 700, opacity: 0.7 }}>{l.toUpperCase()}.</span>
                      {(q as any)[`option_${l}`]}
                      {q.correct_option === l.toUpperCase() && <span style={{ marginLeft: 'auto' }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── ATTEMPTS TAB ── */}
        {tab === 'attempts' && (
          <div className="animate-in">
            {attempts.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No attempts yet</div>
                <div className="empty-desc">Share the quiz link to start collecting responses</div>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid-4" style={{ marginBottom: '20px' }}>
                  {[
                    { label: 'Total Attempts', value: attempts.length },
                    { label: 'Average Score', value: `${(attempts.reduce((a,x)=>a+x.score,0)/attempts.length).toFixed(1)}/10` },
                    { label: 'Top Score', value: `${Math.max(...attempts.map(a=>a.score))}/10` },
                    { label: 'Pass Rate', value: `${Math.round((attempts.filter(a=>a.score>=5).length/attempts.length)*100)}%` },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Action bar */}
                <div className="flex justify-between items-center" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <span className="text-sm text-secondary">{attempts.length} participants · {100 - attempts.length} slots remaining</span>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={downloadCSV} style={{ fontSize: '13px', padding: '8px 14px' }}>
                      📊 Download Excel (CSV)
                    </button>
                    <button className="btn btn-secondary" onClick={downloadPDF} style={{ fontSize: '13px', padding: '8px 14px' }}>
                      📄 Download PDF
                    </button>
                    <button className="btn btn-danger" onClick={deleteAllAttempts} style={{ fontSize: '13px', padding: '8px 14px' }}>
                      🗑 Clear All Entries
                    </button>
                  </div>
                </div>

                {attempts.length >= 90 && (
                  <div className="alert alert-warning" style={{ marginBottom: '14px' }}>
                    ⚠ {attempts.length >= 100 ? 'Quiz is full (100/100). Clear entries to allow new participants.' : `Almost full — ${100 - attempts.length} slots remaining.`}
                  </div>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Participant</th><th>Score</th><th>Result</th><th>Date & Time</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {attempts.map((a, i) => {
                        const pct = Math.round((a.score / a.total) * 100);
                        const color = scoreColor(a.score, a.total);
                        return (
                          <tr key={a.id}>
                            <td className="text-muted text-sm">{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{a.participant_name}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{a.score}/{a.total}</span>
                                <div style={{ width: '60px', height: '4px', background: 'var(--surface-3)', borderRadius: '99px' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px' }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${pct>=80?'badge-green':pct>=50?'badge-warning':'badge-red'}`}>{pct}%</span>
                            </td>
                            <td className="text-secondary text-sm">
                              {new Date(a.attempted_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                            </td>
                            <td>
                              <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '11px' }}
                                onClick={() => deleteSingleAttempt(a.id, a.participant_name)}>
                                Remove
                              </button>
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
    </main>
  );
}
