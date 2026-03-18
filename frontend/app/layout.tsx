import 'antd/dist/reset.css';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppShellGate from './components/AppShellGate';
import Providers from './providers';
import DashboardLayoutWrapper from './DashboardLayoutWrapper';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Gym Management',
  description: 'Dashboard UI with Redux',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdRegistry>
          <AppShellGate>
            <Providers>
              <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
            </Providers>
          </AppShellGate>
        </AntdRegistry>
      </body>
    </html>
  );
}
