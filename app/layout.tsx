import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QuizCraft',
  description: 'Create and share beautiful quizzes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
