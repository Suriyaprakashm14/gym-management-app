import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import DashboardLayoutWrapper from './DashboardLayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Small Circle Dashboard',
  description: 'Dashboard UI with Redux',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
