import type { AWSAccount } from '@/shared/types';
import { useAccountStore } from '../store';

interface Props {
  account: AWSAccount;
}

export function AccountCard({ account }: Props) {
  const { toggleFavorite, openEditAccountForm, removeAccount } = useAccountStore();

  const handleOpen = () => {
    chrome.runtime.sendMessage({
      type: 'OPEN_CONSOLE',
      payload: { accountId: account.id },
    });
    window.close();
  };

  const handleDelete = (e: Event) => {
    e.stopPropagation();
    if (confirm(`Delete "${account.name}"?`)) {
      removeAccount(account.id);
    }
  };

  return (
    <div
      onClick={handleOpen}
      class="account-card"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '12px',
        padding: '12px',
        marginBottom: '8px',
        background: 'var(--card-bg)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Color indicator */}
      <div
        style={{
          width: '4px',
          borderRadius: '2px',
          background: account.color ?? '#6b7280',
          flexShrink: 0,
        }}
      />

      {/* Account info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {account.name}
          </h3>
          <span style={{
            fontSize: '10px',
            fontWeight: '500',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}>
            {account.authType.toUpperCase()}
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginBottom: account.tags?.length ? '6px' : '0',
        }}>
          <span style={{ fontFamily: 'monospace' }}>{account.accountId}</span>
          <span style={{ color: 'var(--text-light)' }}>|</span>
          <span>{account.defaultRegion}</span>
        </div>

        {account.tags && account.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {account.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'var(--accent-color)',
                  color: 'white',
                  opacity: 0.9,
                }}
              >
                {tag}
              </span>
            ))}
            {account.tags.length > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                +{account.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexShrink: 0,
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(account.id);
          }}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: account.isFavorite ? '#f59e0b' : 'var(--text-light)',
          }}
          title={account.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            style={{ width: '16px', height: '16px' }}
            fill={account.isFavorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openEditAccountForm(account);
          }}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-light)',
          }}
          title="Edit account"
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>

        <button
          onClick={handleDelete}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-light)',
          }}
          title="Delete account"
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
