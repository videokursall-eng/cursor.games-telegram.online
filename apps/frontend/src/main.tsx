import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TelegramProvider } from './telegram';
import { ApplyTheme } from './telegram/ApplyTheme';
import { AuthBootstrap } from './components/AuthBootstrap';
import { useAuthStore } from './store/authStore';
import App from './App';
import './index.css';

const apiUrl = import.meta.env.VITE_API_URL || '';

const isE2E =
  typeof window !== 'undefined' &&
  (window.location.search.includes('e2e=1') || window.location.hash.includes('e2e'));

function setTelegramStub() {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>).Telegram = {
    WebApp: {
      initData: 'e2e',
      initDataUnsafe: {},
      ready: () => {},
      expand: () => {},
      themeParams: {},
      colorScheme: 'dark',
      version: '6',
      platform: 'web',
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function render() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TelegramProvider>
          <ApplyTheme />
          <AuthBootstrap />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </TelegramProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

async function e2eAuthBootstrap(): Promise<boolean> {
  if (!apiUrl) return false;
  try {
    const res = await fetch(`${apiUrl}/auth/e2e-bootstrap`);
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string; user?: { id: string; telegramId: number } };
    if (data.accessToken && data.user) {
      localStorage.setItem(
        'durak-auth',
        JSON.stringify({
          state: { accessToken: data.accessToken, user: data.user, authAttempted: true },
          version: 1,
        }),
      );
      useAuthStore.setState({
        accessToken: data.accessToken,
        user: data.user,
        authAttempted: true,
      });
      setTelegramStub();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function runBootstrapThenRender() {
  if (isE2E && apiUrl) {
    e2eAuthBootstrap().then((ok) => {
      if (!ok && typeof window !== 'undefined') {
        try {
          const auth = localStorage.getItem('durak-auth');
          if (auth) {
            const parsed = JSON.parse(auth) as { state?: { accessToken?: string } };
            if (parsed?.state?.accessToken) setTelegramStub();
          }
        } catch {
          // ignore
        }
      }
      render();
    });
    return;
  }
  if (typeof window !== 'undefined' && isE2E) {
    try {
      const auth = localStorage.getItem('durak-auth');
      if (auth) {
        const parsed = JSON.parse(auth) as { state?: { accessToken?: string } };
        if (parsed?.state?.accessToken) setTelegramStub();
      }
    } catch {
      // ignore
    }
  }
  render();
}

if (isE2E) {
  runBootstrapThenRender();
} else if (typeof document !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js';
  script.async = false;
  script.onload = render;
  script.onerror = render;
  document.head.appendChild(script);
} else {
  render();
}
