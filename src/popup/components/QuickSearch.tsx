import { useAccountStore } from '../store';

export function QuickSearch() {
  const { searchQuery, setSearchQuery } = useAccountStore();

  return (
    <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <svg
          style={{
            position: 'absolute',
            left: '12px',
            width: '16px',
            height: '16px',
            color: 'var(--text-light)',
            pointerEvents: 'none'
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search accounts..."
          value={searchQuery}
          onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            fontSize: '14px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-light)',
              padding: '4px',
            }}
          >
            <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
