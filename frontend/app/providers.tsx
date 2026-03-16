'use client';

import { App as AntApp, ConfigProvider } from 'antd';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { AuthProvider } from './contexts/AuthContext';
import { BranchProvider } from './contexts/BranchContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider wave={{ disabled: true }}>
      <AntApp>
        <Provider store={store}>
          <AuthProvider>
            <BranchProvider>{children}</BranchProvider>
          </AuthProvider>
        </Provider>
      </AntApp>
    </ConfigProvider>
  );
}
