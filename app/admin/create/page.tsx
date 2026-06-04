'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const EMPTY_QUESTION = () => ({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
});

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(Array.from({ length: 10 }, EMPTY_QUESTION));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateQuestion(index: number, field: string, value: string) {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
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
    setSaving(true);
    setError('');
    const res = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, questions }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.id) {
      router.push(`/admin/quiz/${data.id}?created=1`);
    } else {
      setError(data.error || 'Something went wrong.');
    }
  }

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      <nav className="nav">
        <div className="container-wide nav-inner">
          <a href="/" className="nav-logo">Quiz<span>Craft</span>By Ajo Koshy Joseph</a>
          <Link href="/admin" className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>
            ← Dashboard
          </Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="animate-in" style={{ marginBottom: '32px' }}>
          <span className="badge badge-amber" style={{ marginBottom: '12px' }}>New Quiz</span>
          <h1 style={{ fontSize: '30px', fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: '6px' }}>
            Create a Quiz
          </h1>
          <p className="text-secondary text-sm">Fill in all 10 questions. Each needs 4 options and a correct answer.</p>
        </div>

        {/* Quiz Title */}
        <div className="card animate-in" style={{ marginBottom: '24px', animationDelay: '0.05s' }}>
          <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
            Quiz Title
          </label>
          <input
            type="text"
            placeholder="e.g. General Knowledge Round 1"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ fontSize: '16px', padding: '13px 16px' }}
          />
        </div>

        {/* Questions */}
        {questions.map((q, i) => (
          <div
            key={i}
            className="card animate-in"
            style={{ marginBottom: '20px', animationDelay: `${0.06 + i * 0.03}s` }}
          >
            {/* Question header */}
            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--accent-dim)', border: '1px solid rgba(245,158,11,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '15px', color: 'var(--accent)',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <label style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Question {i + 1}
              </label>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <textarea
                placeholder={`Type question ${i + 1} here...`}
                value={q.question_text}
                onChange={e => updateQuestion(i, 'question_text', e.target.value)}
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Options grid */}
            <div className="grid-2" style={{ marginBottom: '14px' }}>
              {(['a', 'b', 'c', 'd'] as const).map(letter => (
                <div key={letter}>
                  <label style={{ marginBottom: '5px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '20px', height: '20px', borderRadius: '5px',
                      background: q.correct_option === letter.toUpperCase() ? 'var(--accent)' : 'var(--surface-3)',
                      color: q.correct_option === letter.toUpperCase() ? '#000' : 'var(--text-muted)',
                      fontSize: '11px', fontWeight: 700, marginRight: '6px',
                    }}>
                      {letter.toUpperCase()}
                    </span>
                    Option {letter.toUpperCase()}
                    {q.correct_option === letter.toUpperCase() && (
                      <span style={{ color: 'var(--accent)', marginLeft: '6px', fontSize: '11px' }}>✓ correct</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder={`Option ${letter.toUpperCase()}`}
                    value={(q as any)[`option_${letter}`]}
                    onChange={e => updateQuestion(i, `option_${letter}`, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Correct answer selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Correct answer:</span>
              {['A', 'B', 'C', 'D'].map(letter => (
                <button
                  key={letter}
                  onClick={() => updateQuestion(i, 'correct_option', letter)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px', border: 'none',
                    cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '14px',
                    background: q.correct_option === letter ? 'var(--accent)' : 'var(--surface-3)',
                    color: q.correct_option === letter ? '#000' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
            color: 'var(--danger)', fontSize: '14px',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Link href="/admin" className="btn btn-secondary">Cancel</Link>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            {saving ? 'Saving...' : '✓ Save Quiz'}
          </button>
        </div>
      </div>
    </main>
  );
}
