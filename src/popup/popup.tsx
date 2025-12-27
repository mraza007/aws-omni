import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useAccountStore } from './store';
import { getSettings } from '@/shared/storage';
import { Header } from './components/Header';
import { QuickSearch } from './components/QuickSearch';
import { AccountList } from './components/AccountList';
import { AccountForm } from './components/AccountForm';
import './styles.css';

function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function App() {
  const { loadAccounts, isLoading, showForm } = useAccountStore();
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    // Load theme setting
    getSettings().then((settings) => {
      applyTheme(settings.theme);
      setThemeLoaded(true);
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      getSettings().then((settings) => {
        if (settings.theme === 'system') {
          applyTheme('system');
        }
      });
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, []);

  if (isLoading) {
    return (
      <div class="flex items-center justify-center h-48">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showForm) {
    return <AccountForm />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Header />
      <QuickSearch />
      <AccountList />
    </div>
  );
}

render(<App />, document.getElementById('app')!);
