import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Calculator',
  description: 'A fully functional calculator built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        {children}
      </body>
    </html>
  );
}
