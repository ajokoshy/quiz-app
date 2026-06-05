'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavLogo from '@/components/NavLogo';
import ThemeToggle from '@/components/ThemeToggle';

const EMPTY_Q = () => ({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(Array.from({ length: 10 }, EMPTY_Q));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateQ(i: number, field: string, value: string) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  function validate() {
    if (!title.trim()) return 'Please enter a quiz title.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) return `Question ${i + 1}: question text is empty.`;
      if (!q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim())
        return `Question ${i + 1}: all 4 options must be filled.`;
    }
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/quiz', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, questions }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.id) router.push(`/admin/quiz/${data.id}?created=1`);
    else setError(data.error || 'Something went wrong.');
  }

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

      <div className="container" style={{ paddingTop: '36px' }}>
        <div className="animate-in" style={{ marginBottom: '28px' }}>
          <span className="badge badge-blue" style={{ marginBottom: '10px' }}>New Quiz</span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Create a Quiz</h1>
          <p className="text-secondary text-sm">Fill in all 10 questions. Select the correct answer for each.</p>
        </div>

        {/* Title */}
        <div className="card animate-in" style={{ marginBottom: '20px', animationDelay: '0.05s' }}>
          <label>Quiz Title</label>
          <input type="text" placeholder="e.g. General Knowledge Round 1" value={title}
            onChange={e => setTitle(e.target.value)} style={{ marginTop: '6px', fontSize: '16px', fontWeight: 600 }} />
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div key={i} className="card animate-in" style={{ marginBottom: '16px', animationDelay: `${0.06 + i * 0.02}s` }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '14px',
              }}>{i + 1}</div>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Question {i + 1}</span>
              <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>
                Correct: <strong style={{ marginLeft: '4px', color: 'var(--success)' }}>{q.correct_option}</strong>
              </span>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label>Question Text</label>
              <textarea placeholder={`Type your question here...`} value={q.question_text}
                onChange={e => updateQ(i, 'question_text', e.target.value)}
                rows={2} style={{ marginTop: '6px', resize: 'vertical' }} />
            </div>

            <div className="grid-2" style={{ marginBottom: '14px' }}>
              {(['a', 'b', 'c', 'd'] as const).map(l => (
                <div key={l}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '18px', height: '18px', borderRadius: '4px', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700,
                      background: q.correct_option === l.toUpperCase() ? 'var(--success)' : 'var(--surface-3)',
                      color: q.correct_option === l.toUpperCase() ? '#fff' : 'var(--text-muted)',
                    }}>{l.toUpperCase()}</span>
                    Option {l.toUpperCase()}
                    {q.correct_option === l.toUpperCase() && <span style={{ color: 'var(--success)', fontSize: '10px' }}>✓ correct</span>}
                  </label>
                  <input type="text" placeholder={`Option ${l.toUpperCase()}`}
                    value={(q as any)[`option_${l}`]}
                    onChange={e => updateQ(i, `option_${l}`, e.target.value)}
                    style={{ marginTop: '6px' }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-xs text-secondary" style={{ fontWeight: 600 }}>CORRECT ANSWER:</span>
              {['A','B','C','D'].map(l => (
                <button key={l} onClick={() => updateQ(i, 'correct_option', l)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px', border: '2px solid',
                    cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                    borderColor: q.correct_option === l ? 'var(--success)' : 'var(--border)',
                    background: q.correct_option === l ? 'var(--success)' : 'var(--surface-2)',
                    color: q.correct_option === l ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}>{l}</button>
              ))}
            </div>
          </div>
        ))}

        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>⚠ {error}</div>}

        <div className="flex justify-between items-center">
          <Link href="/admin" className="btn btn-ghost">Cancel</Link>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ padding: '12px 28px' }}>
            {saving ? 'Saving...' : '✓ Save Quiz'}
          </button>
        </div>
      </div>
    </main>
  );
}
