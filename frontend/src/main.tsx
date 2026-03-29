import React from 'react'
import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
(window as any).global = window;
import App from './App.tsx'
import './index.css'
import { PrivyProvider } from '@privy-io/react-auth'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['google'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          showWalletUIs: false
        }
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>,
)
