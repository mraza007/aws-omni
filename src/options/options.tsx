import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import type { AppSettings } from '@/shared/types';
import {
  getSettings,
  saveSettings,
  exportAccounts,
  importAccounts,
  exportAccountsToCSV,
  importAccountsFromCSV,
  importFromAWSConfig,
} from '@/shared/storage';
import './styles.css';

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSettingChange = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
    showStatus('success', 'Settings saved');
  };

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleExport = async () => {
    const data = await exportAccounts();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-accounts-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', 'Accounts exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const count = await importAccounts(text);
        showStatus('success', `Imported ${count} new accounts`);
      } catch {
        showStatus('error', 'Failed to import accounts');
      }
    };
    input.click();
  };

  const handleExportCSV = async () => {
    const data = await exportAccountsToCSV();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-accounts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', 'Accounts exported to CSV');
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = await importAccountsFromCSV(text);
        showStatus(
          'success',
          `Imported ${result.imported} accounts (${result.skipped} skipped)`
        );
      } catch {
        showStatus('error', 'Failed to import CSV');
      }
    };
    input.click();
  };

  const handleImportAWSConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.config,config,*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = await importFromAWSConfig(text);
        showStatus(
          'success',
          `Imported ${result.imported} profiles (${result.skipped} skipped)`
        );
      } catch {
        showStatus('error', 'Failed to parse AWS config');
      }
    };
    input.click();
  };

  if (!settings) {
    return (
      <div class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div class="container">
      <header class="header">
        <h1>AWS OmniConsole</h1>
        <p>Settings and preferences</p>
      </header>

      {status && (
        <div class={`status ${status.type}`}>
          {status.message}
        </div>
      )}

      <section class="section">
        <h2>Appearance</h2>

        <div class="setting">
          <div class="setting-info">
            <label>Theme</label>
            <p>Choose your preferred color scheme</p>
          </div>
          <select
            value={settings.theme}
            onChange={(e) => handleSettingChange('theme', (e.target as HTMLSelectElement).value as AppSettings['theme'])}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div class="setting">
          <div class="setting-info">
            <label>Show Console Banner</label>
            <p>Display current account info on AWS console pages</p>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              checked={settings.showConsoleBanner}
              onChange={(e) => handleSettingChange('showConsoleBanner', (e.target as HTMLInputElement).checked)}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        {settings.showConsoleBanner && (
          <div class="setting">
            <div class="setting-info">
              <label>Banner Position</label>
              <p>Where to display the account banner</p>
            </div>
            <select
              value={settings.bannerPosition}
              onChange={(e) => handleSettingChange('bannerPosition', (e.target as HTMLSelectElement).value as AppSettings['bannerPosition'])}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        )}
      </section>

      <section class="section">
        <h2>Sessions</h2>

        <div class="setting">
          <div class="setting-info">
            <label>Session Timeout Warning</label>
            <p>Minutes before session expiry to show warning</p>
          </div>
          <select
            value={settings.sessionTimeoutWarning}
            onChange={(e) => handleSettingChange('sessionTimeoutWarning', parseInt((e.target as HTMLSelectElement).value, 10))}
          >
            <option value="2">2 minutes</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="15">15 minutes</option>
          </select>
        </div>

        <div class="setting">
          <div class="setting-info">
            <label>Auto-lock Timeout</label>
            <p>Lock extension after inactivity (requires master password)</p>
          </div>
          <select
            value={settings.autoLockTimeout}
            onChange={(e) => handleSettingChange('autoLockTimeout', parseInt((e.target as HTMLSelectElement).value, 10))}
          >
            <option value="5">5 minutes</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="0">Never</option>
          </select>
        </div>
      </section>

      <section class="section">
        <h2>Keyboard Shortcuts</h2>
        <p class="section-description">
          Quick switch to accounts using keyboard shortcuts.
        </p>

        <div class="shortcuts-grid">
          <div class="shortcut">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>
            <span>Open popup</span>
          </div>
          <div class="shortcut">
            <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>1-5</kbd>
            <span>Quick switch to account 1-5</span>
          </div>
        </div>

        <p class="shortcut-note">
          On Mac, use <kbd>Cmd</kbd> instead of <kbd>Ctrl</kbd>
        </p>
      </section>

      <section class="section">
        <h2>Data Management</h2>

        <div class="setting">
          <div class="setting-info">
            <label>Export JSON</label>
            <p>Download accounts as JSON (credentials excluded)</p>
          </div>
          <button class="btn btn-secondary" onClick={handleExport}>
            Export JSON
          </button>
        </div>

        <div class="setting">
          <div class="setting-info">
            <label>Import JSON</label>
            <p>Import accounts from JSON file</p>
          </div>
          <button class="btn btn-secondary" onClick={handleImport}>
            Import JSON
          </button>
        </div>

        <div class="setting">
          <div class="setting-info">
            <label>Export CSV</label>
            <p>Download accounts as spreadsheet-friendly CSV</p>
          </div>
          <button class="btn btn-secondary" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>

        <div class="setting">
          <div class="setting-info">
            <label>Import CSV</label>
            <p>Import accounts from CSV file</p>
          </div>
          <button class="btn btn-secondary" onClick={handleImportCSV}>
            Import CSV
          </button>
        </div>

        <div class="setting">
          <div class="setting-info">
            <label>Import AWS Config</label>
            <p>Import from ~/.aws/config file (SSO & assume-role profiles)</p>
          </div>
          <button class="btn btn-secondary" onClick={handleImportAWSConfig}>
            Import Config
          </button>
        </div>
      </section>

      <footer class="footer">
        <p>AWS OmniConsole v1.0.0</p>
        <p>
          <a href="https://github.com/your-username/aws-switcher-extension" target="_blank" rel="noopener">
            GitHub
          </a>
          {' | '}
          <a href="https://github.com/your-username/aws-switcher-extension/issues" target="_blank" rel="noopener">
            Report an Issue
          </a>
        </p>
      </footer>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
