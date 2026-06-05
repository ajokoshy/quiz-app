import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Quiz Craft by Ajo Koshy Joseph',
  description: 'Professional multiple choice quiz platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
