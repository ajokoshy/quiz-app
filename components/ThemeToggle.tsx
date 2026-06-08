'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initial = saved || 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-knob" />
      <span style={{
        position: 'absolute', left: theme === 'dark' ? '4px' : 'auto',
        right: theme === 'light' ? '4px' : 'auto',
        top: '50%', transform: 'translateY(-50%)',
        fontSize: '9px', pointerEvents: 'none', opacity: 0,
      }}>
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
