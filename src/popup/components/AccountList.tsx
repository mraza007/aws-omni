import { useGroupedAccounts, useAccountStore } from '../store';
import { AccountCard } from './AccountCard';

export function AccountList() {
  const grouped = useGroupedAccounts();
  const { accounts, searchQuery } = useAccountStore();

  if (accounts.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <svg
          style={{ width: '64px', height: '64px', color: 'var(--text-light)', marginBottom: '16px' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
          No accounts yet
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-light)', margin: 0 }}>
          Add your first AWS account to get started
        </p>
      </div>
    );
  }

  if (grouped.size === 0 && searchQuery) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <svg
          style={{ width: '48px', height: '48px', color: 'var(--text-light)', marginBottom: '12px' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
          No matches found
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: 0 }}>
          Try a different search term
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 0' }}>
      {Array.from(grouped.entries()).map(([group, groupAccounts]) => (
        <div key={group} style={{ marginBottom: '8px' }}>
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg-primary)',
          }}>
            <h2 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0,
            }}>
              {group === 'Favorites' && (
                <svg style={{ width: '12px', height: '12px', color: '#f59e0b' }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              {group}
              <span style={{ fontWeight: '400', color: 'var(--text-light)' }}>({groupAccounts.length})</span>
            </h2>
          </div>
          <div style={{ padding: '0 8px' }}>
            {groupAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
