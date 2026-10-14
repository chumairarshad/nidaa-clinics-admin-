import type { Metadata } from 'next';
import './admin-theme.css';

export const metadata: Metadata = {
  title: 'NiDAA Clinic — Blog CMS Admin Dashboard',
  description: 'Executive Blog & Clinical Content Management System for NiDAA Clinic Lahore.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}
