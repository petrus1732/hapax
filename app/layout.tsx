import type { Metadata } from 'next';
import { TopBar } from './ui/top-bar';
import { Providers } from './provider';
import './ui/colors.css';
import './ui/globals.css';

export const metadata: Metadata = {
  title: 'HaPaX Word Blitz Practice Lab',
  description: 'Word Blitz practice boards with events, arena rules, and rare-letter training modes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          <TopBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
