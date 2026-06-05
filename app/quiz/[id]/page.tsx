'use client';
import { useState, useEffect } from 'react';
import NavLogo from '@/components/NavLogo';
import ThemeToggle from '@/components/ThemeToggle';

interface Question {
  id: string; question_text: string; option_a: string; option_b: string;
  option_c: string; option_d: string; order_index: number;
}
interface Quiz { id: string; title: string; }
interface ResultData {
  score: number; total: number;
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
        setQuiz(data.quiz); setQuestions(data.questions); setScreen('name');
      })
      .catch(() => { setErrorMsg('Failed to load quiz.'); setScreen('error'); });
  }, [params.id]);

  function startQuiz() {
    if (!name.trim()) return;
    setCurrent(0); setAnswers({}); setScreen('quiz');
  }

  function selectAnswer(qId: string, letter: string) {
    setAnswers(prev => ({ ...prev, [qId]: letter }));
  }

  async function submitQuiz() {
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0 && !confirm(`${unanswered.length} question(s) unanswered. Submit anyway?`)) return;
    setScreen('submitting');
    const res = await fetch(`/api/quiz/${params.id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_name: name, answers }),
    });
    const data = await res.json();
    if (data.score !== undefined) { setResultData(data); setScreen('results'); }
    else { setErrorMsg(data.error || 'Submission failed'); setScreen('error'); }
  }

  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  if (screen === 'loading') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}><div className="spinner" style={{ marginBottom: '16px' }} /><p className="text-secondary text-sm">Loading quiz...</p></div>
    </main>
  );

  if (screen === 'error') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}><ThemeToggle /></div>
      <div className="card animate-scale" style={{ maxWidth: '420px', textAlign: 'center', padding: '48px 32px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</p>
        <h2 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '10px' }}>Quiz Unavailable</h2>
        <p className="text-secondary text-sm">{errorMsg}</p>
      </div>
    </main>
  );

  if (screen === 'name') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}><ThemeToggle /></div>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, var(--accent-dim) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div className="animate-scale" style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 20px' }}>📝</div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.03em' }}>{quiz?.title}</h1>
          <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>{questions.length} questions · Multiple choice · Instant results</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">📋 {questions.length} Questions</span>
            <span className="badge badge-gray">⏱ No Time Limit</span>
            <span className="badge badge-green">✓ Instant Results</span>
          </div>
        </div>

        <div className="card">
          <label>Your Full Name</label>
          <input type="text" placeholder="Enter your name to begin..." value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && startQuiz()}
            autoFocus style={{ marginTop: '6px', fontSize: '15px' }} />
          <button className="btn btn-primary w-full" onClick={startQuiz} disabled={!name.trim()}
            style={{ justifyContent: 'center', padding: '13px', fontSize: '15px', marginTop: '14px', borderRadius: '10px' }}>
            Begin Quiz →
          </button>
        </div>

        <p className="text-center text-muted text-xs" style={{ marginTop: '20px' }}>Quiz Craft by Ajo Koshy Joseph</p>
      </div>
    </main>
  );

  if (screen === 'submitting') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ marginBottom: '16px' }} />
        <p className="text-secondary text-sm">Submitting your answers...</p>
      </div>
    </main>
  );

  if (screen === 'results' && resultData) {
    const pct = resultData.score / resultData.total;
    const emoji = pct >= 0.9 ? '🏆' : pct >= 0.7 ? '🎉' : pct >= 0.5 ? '👍' : '📚';
    const message = pct >= 0.9 ? 'Outstanding!' : pct >= 0.7 ? 'Great job!' : pct >= 0.5 ? 'Not bad!' : 'Keep practicing!';
    const resultColor = pct >= 0.8 ? 'var(--success)' : pct >= 0.5 ? 'var(--warning)' : 'var(--danger)';

    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '60px' }}>
        <nav className="nav">
          <div className="container nav-inner"><NavLogo /><ThemeToggle /></div>
        </nav>
        <div className="container" style={{ paddingTop: '36px' }}>
          <div className="card animate-scale" style={{ textAlign: 'center', marginBottom: '24px', padding: '44px 28px' }}>
            <p style={{ fontSize: '44px', marginBottom: '20px' }}>{emoji}</p>
            <div className="score-circle" style={{ marginBottom: '20px', borderColor: resultColor, boxShadow: `0 0 0 8px rgba(${pct>=0.8?'34,197,94':pct>=0.5?'251,191,36':'248,113,113'},0.1)` }}>
              <span className="score-num" style={{ color: resultColor }}>{resultData.score}</span>
              <span className="score-denom">out of {resultData.total}</span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>{message}</h2>
            <p className="text-secondary" style={{ marginBottom: '6px' }}>{name}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: resultColor, marginBottom: '20px' }}>{Math.round(pct * 100)}%</p>
            <div className="progress-track" style={{ height: '10px', marginBottom: '20px', maxWidth: '300px', margin: '0 auto 20px' }}>
              <div className="progress-fill" style={{ width: `${pct * 100}%`, background: resultColor }} />
            </div>
            <button className="btn btn-secondary" onClick={() => { setScreen('name'); setAnswers({}); setCurrent(0); }}>
              ↺ Try Again
            </button>
          </div>

          <h3 style={{ fontWeight: 800, fontSize: '17px', marginBottom: '16px' }}>Answer Review</h3>
          {questions.map((q, i) => {
            const r = resultData.result[q.id];
            return (
              <div key={q.id} className="card animate-in" style={{ marginBottom: '14px', animationDelay: `${i * 0.04}s`, borderColor: r?.is_correct ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.3)', borderWidth: '2px' }}>
                <div className="flex items-center gap-3" style={{ marginBottom: '12px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', background: r?.is_correct ? 'var(--success-dim)' : 'var(--danger-dim)', color: r?.is_correct ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                    {r?.is_correct ? '✓' : '✗'}
                  </div>
                  <p style={{ fontWeight: 500, fontSize: '14px' }}>Q{i + 1}. {q.question_text}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {(['a','b','c','d'] as const).map(l => {
                    const letter = l.toUpperCase();
                    const isCorrect = r?.correct === letter;
                    const isChosen = r?.chosen === letter;
                    const isWrong = isChosen && !isCorrect;
                    return (
                      <div key={l} style={{
                        padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                        display: 'flex', alignItems: 'center', gap: '9px',
                        background: isCorrect ? 'var(--success-dim)' : isWrong ? 'var(--danger-dim)' : 'var(--surface-2)',
                        border: `1.5px solid ${isCorrect ? 'rgba(34,197,94,0.35)' : isWrong ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
                        color: isCorrect ? 'var(--success)' : isWrong ? 'var(--danger)' : 'var(--text-secondary)',
                      }}>
                        <span style={{ fontWeight: 700, opacity: 0.8, minWidth: '16px' }}>{letter}.</span>
                        <span style={{ flex: 1 }}>{(q as any)[`option_${l}`]}</span>
                        {isCorrect && <span style={{ fontWeight: 700 }}>✓ Correct</span>}
                        {isWrong && <span style={{ fontWeight: 700 }}>✗ Your answer</span>}
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

  // ── QUIZ IN PROGRESS ──
  const q = questions[current];
  const selectedAnswer = answers[q?.id] || '';

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      {/* Fixed header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="progress-track" style={{ height: '4px', borderRadius: 0 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="container nav-inner" style={{ padding: '10px 20px' }}>
          <NavLogo />
          <div className="flex items-center gap-3">
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{answeredCount}/{questions.length} answered</p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent)' }}>Q{current + 1} of {questions.length}</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '88px' }}>
        {/* Question navigation dots */}
        <div className="animate-in" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {questions.map((question, i) => (
            <button key={question.id} onClick={() => setCurrent(i)}
              className={`q-dot ${i === current ? 'active' : answers[question.id] ? 'answered' : ''}`}>
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question */}
        <div key={q.id} className="card animate-in" style={{ marginBottom: '16px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <span className="badge badge-blue">Question {current + 1} of {questions.length}</span>
            {answers[q.id] && <span className="badge badge-green">✓ Answered</span>}
          </div>
          <h2 style={{ fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 700, lineHeight: 1.5, marginBottom: '24px', color: 'var(--text)' }}>
            {q.question_text}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(['a','b','c','d'] as const).map(l => {
              const letter = l.toUpperCase();
              const isSelected = selectedAnswer === letter;
              return (
                <button key={l} className={`option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectAnswer(q.id, letter)}>
                  <div className="option-letter">{letter}</div>
                  <span style={{ flex: 1, textAlign: 'left' }}>{(q as any)[`option_${l}`]}</span>
                  {isSelected && <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '18px' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button className="btn btn-ghost" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Previous</button>
          <div className="flex gap-2">
            {current < questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button>
            ) : (
              <button className="btn btn-success" onClick={submitQuiz} style={{ padding: '11px 24px', fontSize: '15px' }}>
                Submit Quiz ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
