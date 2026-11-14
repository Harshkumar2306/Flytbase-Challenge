import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ACCOUNT INTELLIGENCE | FlytBase Questathon CRM',
  description: 'Evidence-backed Monday Account Intelligence CRM for Eastern Counties Police Alliance and Aldermoor Industrial Group.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
