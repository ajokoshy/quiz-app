'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavLogo from '@/components/NavLogo';
import ThemeToggle from '@/components/ThemeToggle';
import Footer from '@/components/Footer';

interface ArchiveSummary {
  quiz_id: string;
  quiz_title: string;
  batch_number: number;
  count: number;
  avg_score_pct: string;
  highest_score: number;
  lowest_score: number;
  archived_at: string;
}

interface ArchivedAttempt {
  id: string;
  quiz_id: string;
  quiz_title: string;
  participant_name: string;
  score: number;
  total: number;
  attempted_at: string;
  archived_at: string;
  batch_number: number;
}

export default function ArchivePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<ArchiveSummary[]>([]);
  const [attempts, setAttempts] = useState<ArchivedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [totalArchived, setTotalArchived] = useState(0);

  useEffect(() => { loadArchive(); }, []);

  async function loadArchive() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/archive', { cache: 'no-store' });
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setSummary(data.summary || []);
      setAttempts(data.archived || []);
      setTotalArchived(data.archived?.length || 0);
    } catch { /* handled by middleware */ }
    finally { setLoading(false); }
  }

  async function clearAllArchive() {
    if (!confirm(
      `⚠️ Permanently delete ALL ${totalArchived} archived records?\n\n` +
      `This cannot be undone. All historical quiz data will be lost.\n\n` +
      `Type OK to confirm.`
    )) return;
    setClearing(true);
    const res = await fetch('/api/admin/archive', { method: 'DELETE' });
    const data = await res.json();
    setClearing(false);
    if (data.ok) {
      setSummary([]); setAttempts([]); setTotalArchived(0);
    } else {
      alert('Failed to clear archive: ' + data.error);
    }
  }

  function downloadArchiveCSV() {
    const rows = [
      ['Batch', 'Quiz Title', 'Participant', 'Score', 'Out of', 'Percentage', 'Attempted At', 'Archived At']
    ];
    attempts.forEach(a => {
      const pct = Math.round((a.score / a.total) * 100);
      rows.push([
        `Batch ${a.batch_number}`,
        a.quiz_title,
        a.participant_name,
        String(a.score),
        String(a.total),
        `${pct}%`,
        new Date(a.attempted_at).toLocaleString('en-IN'),
        new Date(a.archived_at).toLocaleString('en-IN'),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'quiz_archive_all.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Group attempts by quiz+batch for expanded view
  function getBatchAttempts(quizId: string, batchNumber: number) {
    return attempts.filter(a => a.quiz_id === quizId && a.batch_number === batchNumber);
  }

  const batchKey = (s: ArchiveSummary) => `${s.quiz_id}-${s.batch_number}`;

  function scoreColor(score: number, total: number) {
    const p = score / total;
    return p >= 0.8 ? 'var(--success)' : p >= 0.5 ? 'var(--warning)' : 'var(--danger)';
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
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

        {/* Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: '6px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800 }}>Attempts Archive</h1>
              {totalArchived > 0 && (
                <span className="badge badge-warning">{totalArchived} records</span>
              )}
            </div>
            <p className="text-secondary text-sm">
              Batches auto-archived when a quiz reached 100 entries. Quiz was automatically reopened for new participants.
            </p>
          </div>

          {totalArchived > 0 && (
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={downloadArchiveCSV} style={{ fontSize: '13px', padding: '8px 16px' }}>
                📊 Download All (CSV)
              </button>
              <button
                className="btn btn-danger"
                onClick={clearAllArchive}
                disabled={clearing}
                style={{ fontSize: '13px', padding: '8px 16px' }}
              >
                {clearing ? 'Clearing...' : '🗑 Delete All Archive Data'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : summary.length === 0 ? (
          <div className="card empty-state">
            <div className="empty-icon">🗄️</div>
            <div className="empty-title">No archived data yet</div>
            <div className="empty-desc">
              When a quiz reaches 100 entries, all attempts are automatically archived here and the quiz reopens for new participants.
            </div>
            <Link href="/admin" className="btn btn-secondary" style={{ marginTop: '8px' }}>← Back to Dashboard</Link>
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="alert alert-info animate-in" style={{ marginBottom: '20px' }}>
              <span>ℹ</span>
              <span>
                Each <strong>Batch</strong> = one completed round of 100 participants. Archives are read-only.
                Deleting archive data is permanent and cannot be undone.
              </span>
            </div>

            {/* Batch summary cards */}
            {summary.map((s, i) => {
              const key = batchKey(s);
              const isExpanded = expandedBatch === key;
              const batchAttempts = getBatchAttempts(s.quiz_id, s.batch_number);
              const passRate = batchAttempts.length > 0
                ? Math.round((batchAttempts.filter(a => a.score / a.total >= 0.5).length / batchAttempts.length) * 100)
                : 0;

              return (
                <div
                  key={key}
                  className="card animate-in"
                  style={{ marginBottom: '14px', animationDelay: `${i * 0.04}s` }}
                >
                  {/* Batch header */}
                  <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div className="flex items-center gap-3">
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'var(--accent-dim)', border: '1px solid rgba(79,126,248,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '13px', color: 'var(--accent)', flexShrink: 0,
                      }}>B{s.batch_number}</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{s.quiz_title}</p>
                        <p className="text-muted text-xs">
                          Archived {new Date(s.archived_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{s.count}</p>
                        <p className="text-xs text-muted">Participants</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--warning)' }}>{s.avg_score_pct}%</p>
                        <p className="text-xs text-muted">Avg Score</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--success)' }}>{s.highest_score}/10</p>
                        <p className="text-xs text-muted">Highest</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger)' }}>{s.lowest_score}/10</p>
                        <p className="text-xs text-muted">Lowest</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: passRate >= 60 ? 'var(--success)' : 'var(--danger)' }}>{passRate}%</p>
                        <p className="text-xs text-muted">Pass Rate</p>
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setExpandedBatch(isExpanded ? null : key)}
                        style={{ fontSize: '13px', padding: '7px 14px' }}
                      >
                        {isExpanded ? '▲ Hide' : '▼ View All'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded individual rows */}
                  {isExpanded && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr><th>#</th><th>Participant</th><th>Score</th><th>Result</th><th>Attempted At</th></tr>
                          </thead>
                          <tbody>
                            {batchAttempts.map((a, idx) => {
                              const pct = Math.round((a.score / a.total) * 100);
                              const color = scoreColor(a.score, a.total);
                              return (
                                <tr key={a.id}>
                                  <td className="text-muted text-sm">{idx + 1}</td>
                                  <td style={{ fontWeight: 600 }}>{a.participant_name}</td>
                                  <td>
                                    <div className="flex items-center gap-2">
                                      <span style={{ fontWeight: 700, color }}>{a.score}/{a.total}</span>
                                      <div style={{ width: '60px', height: '4px', background: 'var(--surface-3)', borderRadius: '99px' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px' }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`badge ${pct >= 80 ? 'badge-green' : pct >= 50 ? 'badge-warning' : 'badge-red'}`}>{pct}%</span>
                                  </td>
                                  <td className="text-secondary text-sm" style={{ whiteSpace: 'nowrap' }}>
                                    {new Date(a.attempted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    <Footer />
    </main>
  );
}
