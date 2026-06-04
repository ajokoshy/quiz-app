'use client';
import { useState, useEffect } from 'react';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
}

interface ResultData {
  score: number;
  total: number;
  result: Record<string, { chosen: string; correct: string; is_correct: boolean }>;
}

type Screen = 'loading' | 'name' | 'quiz' | 'submitting' | 'results' | 'error';

export default function QuizPage({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<Screen>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [name, setName] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`/api/quiz/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setScreen('error'); return; }
        setQuiz(data.quiz);
        setQuestions(data.questions);
        setScreen('name');
      })
      .catch(() => { setErrorMsg('Failed to load quiz.'); setScreen('error'); });
  }, [params.id]);

  function startQuiz() {
    if (!name.trim()) return;
    setCurrent(0);
    setAnswers({});
    setScreen('quiz');
  }

  function selectAnswer(questionId: string, letter: string) {
    setAnswers(prev => ({ ...prev, [questionId]: letter }));
  }

  function next() {
    if (current < questions.length - 1) setCurrent(c => c + 1);
  }

  function prev() {
    if (current > 0) setCurrent(c => c - 1);
  }

  async function submitQuiz() {
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`)) return;
    }
    setScreen('submitting');
    const res = await fetch(`/api/quiz/${params.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_name: name, answers }),
    });
    const data = await res.json();
    if (data.score !== undefined) {
      setResultData(data);
      setScreen('results');
    } else {
      setErrorMsg(data.error || 'Submission failed');
      setScreen('error');
    }
  }

  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  // ── LOADING ──────────────────────────────────────────────
  if (screen === 'loading') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p className="text-secondary">Loading quiz...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  // ── ERROR ──────────────────────────────────────────────
  if (screen === 'error') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card animate-scale" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <p style={{ fontSize: '40px', marginBottom: '14px' }}>⚠️</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: '10px' }}>Something went wrong</h2>
        <p className="text-secondary text-sm">{errorMsg}</p>
      </div>
    </main>
  );

  // ── NAME ENTRY ──────────────────────────────────────────
  if (screen === 'name') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="animate-scale" style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="badge badge-amber" style={{ marginBottom: '14px' }}>📝 Quiz</span>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '32px', fontWeight: 800, marginBottom: '10px', lineHeight: 1.1 }}>
            {quiz?.title}
          </h1>
          <p className="text-secondary text-sm">
            {questions.length} multiple-choice questions · Enter your name to begin
          </p>
        </div>

        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Enter your full name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && startQuiz()}
              style={{ fontSize: '16px', padding: '13px 16px' }}
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={startQuiz}
            disabled={!name.trim()}
            style={{ justifyContent: 'center', padding: '13px', fontSize: '15px' }}
          >
            Start Quiz →
          </button>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
          {[`${questions.length} questions`, 'Multiple choice', 'Instant results'].map(f => (
            <span key={f} className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--accent)' }}>✦</span> {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );

  // ── SUBMITTING ──────────────────────────────────────────
  if (screen === 'submitting') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p className="text-secondary">Submitting your answers...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );

  // ── RESULTS ──────────────────────────────────────────────
  if (screen === 'results' && resultData) {
    const pct = resultData.score / resultData.total;
    const emoji = pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.5 ? '👍' : '📚';
    const message = pct >= 0.9 ? 'Outstanding!' : pct >= 0.7 ? 'Great job!' : pct >= 0.5 ? 'Not bad!' : 'Keep practicing!';

    return (
      <main style={{ minHeight: '100vh', paddingBottom: '60px' }}>
        <nav className="nav">
          <div className="container nav-inner">
            <a href="/" className="nav-logo">Quiz<span>Craft</span></a>
          </div>
        </nav>

        <div className="container" style={{ paddingTop: '40px' }}>
          {/* Score card */}
          <div className="card animate-scale" style={{ textAlign: 'center', marginBottom: '28px', padding: '40px 28px' }}>
            <p style={{ fontSize: '40px', marginBottom: '16px' }}>{emoji}</p>
            <div className="score-circle" style={{ marginBottom: '20px' }}>
              <span className="score-num">{resultData.score}</span>
              <span className="score-denom">out of {resultData.total}</span>
            </div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
              {message}
            </h2>
            <p className="text-secondary" style={{ marginBottom: '20px' }}>
              {name} · {Math.round(pct * 100)}% correct
            </p>
            <div className="progress-track" style={{ height: '8px', marginBottom: '20px' }}>
              <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setScreen('name'); setAnswers({}); setCurrent(0); }}
                style={{ fontSize: '14px' }}
              >
                Try Again
              </button>
            </div>
          </div>

          {/* Answer review */}
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginBottom: '16px' }}>
            Answer Review
          </h3>

          {questions.map((q, i) => {
            const r = resultData.result[q.id];
            return (
              <div
                key={q.id}
                className="card animate-in"
                style={{ marginBottom: '16px', animationDelay: `${i * 0.05}s`, borderColor: r?.is_correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}
              >
                <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    background: r?.is_correct ? 'var(--success-dim)' : 'var(--danger-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                  }}>
                    {r?.is_correct ? '✓' : '✗'}
                  </div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>Q{i + 1}. {q.question_text}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(['a', 'b', 'c', 'd'] as const).map(l => {
                    const letter = l.toUpperCase();
                    const isCorrect = r?.correct === letter;
                    const isChosen = r?.chosen === letter;
                    const isWrong = isChosen && !isCorrect;

                    return (
                      <div
                        key={l}
                        style={{
                          padding: '9px 14px', borderRadius: '9px', fontSize: '13px',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          background: isCorrect ? 'var(--success-dim)' : isWrong ? 'var(--danger-dim)' : 'var(--surface-2)',
                          border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.3)' : isWrong ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                          color: isCorrect ? 'var(--success)' : isWrong ? 'var(--danger)' : 'var(--text-secondary)',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: '12px', opacity: 0.8 }}>{letter}.</span>
                        <span style={{ flex: 1 }}>{(q as any)[`option_${l}`]}</span>
                        {isCorrect && <span>✓</span>}
                        {isWrong && <span>✗</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  // ── QUIZ IN PROGRESS ─────────────────────────────────────
  const q = questions[current];
  const selectedAnswer = answers[q?.id] || '';

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      {/* Fixed top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="progress-track" style={{ height: '3px', borderRadius: 0 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="container nav-inner" style={{ padding: '12px 20px' }}>
          <a href="/" className="nav-logo" style={{ fontSize: '17px' }}>Quiz<span>Craft</span></a>
          <div className="flex items-center gap-12">
            <span className="text-secondary text-sm">{answeredCount}/{questions.length} answered</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', fontSize: '14px' }}>
              {current + 1} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '90px' }}>
        {/* Question dots */}
        <div className="animate-in" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {questions.map((question, i) => (
            <button
              key={question.id}
              onClick={() => setCurrent(i)}
              style={{
                width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px', transition: 'all 0.15s ease',
                background: i === current
                  ? 'var(--accent)'
                  : answers[question.id]
                    ? 'var(--accent-dim)'
                    : 'var(--surface-2)',
                color: i === current ? '#000' : answers[question.id] ? 'var(--accent)' : 'var(--text-muted)',
                border: i === current ? 'none' : answers[question.id] ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border)',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div key={q.id} className="card animate-in" style={{ marginBottom: '20px' }}>
          <p className="text-muted text-xs" style={{ marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Question {current + 1} of {questions.length}
          </p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(17px, 3vw, 22px)', fontWeight: 700, lineHeight: 1.4, marginBottom: '24px' }}>
            {q.question_text}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(['a', 'b', 'c', 'd'] as const).map(l => {
              const letter = l.toUpperCase();
              const isSelected = selectedAnswer === letter;
              return (
                <button
                  key={l}
                  className={`option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectAnswer(q.id, letter)}
                >
                  <div className="option-letter">{letter}</div>
                  <span>{(q as any)[`option_${l}`]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nav buttons */}
        <div className="flex justify-between items-center">
          <button
            className="btn btn-secondary"
            onClick={prev}
            disabled={current === 0}
            style={{ fontSize: '14px' }}
          >
            ← Previous
          </button>

          {current < questions.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={next}
              style={{ fontSize: '14px' }}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={submitQuiz}
              style={{ fontSize: '14px', padding: '11px 24px', background: 'var(--success)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              Submit Quiz ✓
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
