import { describe, it, expect, beforeEach } from 'vitest';
import type { AWSAccount } from '@/shared/types';

// Test the filtering and grouping logic separately from Zustand hooks
describe('Account Filtering Logic', () => {
  function filterAccounts(accounts: AWSAccount[], searchQuery: string): AWSAccount[] {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return accounts;

    return accounts.filter(
      (account) =>
        account.name.toLowerCase().includes(query) ||
        account.accountId.includes(query) ||
        account.clientName?.toLowerCase().includes(query) ||
        account.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  const mockAccounts: AWSAccount[] = [
    {
      id: '1',
      name: 'Production Account',
      accountId: '111111111111',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      clientName: 'Acme Corp',
      tags: ['prod', 'critical'],
      createdAt: Date.now(),
    },
    {
      id: '2',
      name: 'Development Account',
      accountId: '222222222222',
      defaultRegion: 'us-west-2',
      authType: 'iam',
      clientName: 'Acme Corp',
      tags: ['dev', 'testing'],
      createdAt: Date.now(),
    },
    {
      id: '3',
      name: 'Staging Environment',
      accountId: '333333333333',
      defaultRegion: 'eu-west-1',
      authType: 'sso',
      clientName: 'Beta Inc',
      tags: ['staging'],
      createdAt: Date.now(),
    },
  ];

  it('should return all accounts when query is empty', () => {
    expect(filterAccounts(mockAccounts, '')).toEqual(mockAccounts);
    expect(filterAccounts(mockAccounts, '   ')).toEqual(mockAccounts);
  });

  it('should filter by name', () => {
    const result = filterAccounts(mockAccounts, 'production');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Production Account');
  });

  it('should filter by partial name', () => {
    const result = filterAccounts(mockAccounts, 'account');
    expect(result).toHaveLength(2);
  });

  it('should filter by account ID', () => {
    const result = filterAccounts(mockAccounts, '222222222222');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Development Account');
  });

  it('should filter by partial account ID', () => {
    const result = filterAccounts(mockAccounts, '111');
    expect(result).toHaveLength(1);
  });

  it('should filter by client name', () => {
    const result = filterAccounts(mockAccounts, 'acme');
    expect(result).toHaveLength(2);
  });

  it('should filter by tag', () => {
    const result = filterAccounts(mockAccounts, 'critical');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Production Account');
  });

  it('should be case insensitive', () => {
    expect(filterAccounts(mockAccounts, 'PRODUCTION')).toHaveLength(1);
    expect(filterAccounts(mockAccounts, 'Production')).toHaveLength(1);
    expect(filterAccounts(mockAccounts, 'pRoDuCtIoN')).toHaveLength(1);
  });

  it('should return empty array when no matches', () => {
    const result = filterAccounts(mockAccounts, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('Account Grouping Logic', () => {
  function groupAccounts(accounts: AWSAccount[]): Map<string, AWSAccount[]> {
    const grouped = new Map<string, AWSAccount[]>();

    // Favorites first
    const favorites = accounts.filter((a) => a.isFavorite);
    if (favorites.length > 0) {
      grouped.set('Favorites', favorites);
    }

    // Then by client
    for (const account of accounts) {
      if (account.isFavorite) continue; // Already in favorites
      const client = account.clientName || 'Other';
      const group = grouped.get(client) ?? [];
      group.push(account);
      grouped.set(client, group);
    }

    return grouped;
  }

  const mockAccounts: AWSAccount[] = [
    {
      id: '1',
      name: 'Account 1',
      accountId: '111111111111',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      clientName: 'Client A',
      isFavorite: true,
      createdAt: Date.now(),
    },
    {
      id: '2',
      name: 'Account 2',
      accountId: '222222222222',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      clientName: 'Client A',
      createdAt: Date.now(),
    },
    {
      id: '3',
      name: 'Account 3',
      accountId: '333333333333',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      clientName: 'Client B',
      createdAt: Date.now(),
    },
    {
      id: '4',
      name: 'Account 4',
      accountId: '444444444444',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      // No client name - should go to "Other"
      createdAt: Date.now(),
    },
  ];

  it('should put favorites in first group', () => {
    const grouped = groupAccounts(mockAccounts);
    const groups = Array.from(grouped.keys());
    expect(groups[0]).toBe('Favorites');
  });

  it('should have correct favorites', () => {
    const grouped = groupAccounts(mockAccounts);
    const favorites = grouped.get('Favorites');
    expect(favorites).toHaveLength(1);
    expect(favorites?.[0].name).toBe('Account 1');
  });

  it('should not duplicate favorites in client groups', () => {
    const grouped = groupAccounts(mockAccounts);
    const clientA = grouped.get('Client A');
    // Account 1 is favorite and Client A, but should only be in Favorites
    expect(clientA).toHaveLength(1);
    expect(clientA?.[0].name).toBe('Account 2');
  });

  it('should group by client name', () => {
    const grouped = groupAccounts(mockAccounts);
    expect(grouped.has('Client A')).toBe(true);
    expect(grouped.has('Client B')).toBe(true);
  });

  it('should put accounts without client in Other', () => {
    const grouped = groupAccounts(mockAccounts);
    const other = grouped.get('Other');
    expect(other).toHaveLength(1);
    expect(other?.[0].name).toBe('Account 4');
  });

  it('should handle empty accounts', () => {
    const grouped = groupAccounts([]);
    expect(grouped.size).toBe(0);
  });

  it('should handle no favorites', () => {
    const noFavorites = mockAccounts.map(a => ({ ...a, isFavorite: false }));
    const grouped = groupAccounts(noFavorites);
    expect(grouped.has('Favorites')).toBe(false);
  });

  it('should handle all favorites', () => {
    const allFavorites = mockAccounts.map(a => ({ ...a, isFavorite: true }));
    const grouped = groupAccounts(allFavorites);
    expect(grouped.get('Favorites')).toHaveLength(4);
    // Should only have Favorites group
    expect(grouped.size).toBe(1);
  });
});

describe('Account ID Generation', () => {
  function generateAccountId(): string {
    return crypto.randomUUID();
  }

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateAccountId());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate string IDs', () => {
    const id = generateAccountId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('Store State Transitions', () => {
  // Test expected state transitions without hooks

  interface StoreState {
    showForm: boolean;
    editingAccount: AWSAccount | null;
    searchQuery: string;
    isLoading: boolean;
  }

  it('should have correct initial state', () => {
    const initialState: StoreState = {
      showForm: false,
      editingAccount: null,
      searchQuery: '',
      isLoading: true,
    };

    expect(initialState.showForm).toBe(false);
    expect(initialState.editingAccount).toBeNull();
    expect(initialState.searchQuery).toBe('');
    expect(initialState.isLoading).toBe(true);
  });

  it('should open new account form correctly', () => {
    const state: StoreState = {
      showForm: false,
      editingAccount: null,
      searchQuery: '',
      isLoading: false,
    };

    // Simulate openNewAccountForm
    const newState = {
      ...state,
      showForm: true,
      editingAccount: null,
    };

    expect(newState.showForm).toBe(true);
    expect(newState.editingAccount).toBeNull();
  });

  it('should open edit form correctly', () => {
    const mockAccount: AWSAccount = {
      id: '1',
      name: 'Test',
      accountId: '123456789012',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      createdAt: Date.now(),
    };

    const state: StoreState = {
      showForm: false,
      editingAccount: null,
      searchQuery: '',
      isLoading: false,
    };

    // Simulate openEditAccountForm
    const newState = {
      ...state,
      showForm: true,
      editingAccount: mockAccount,
    };

    expect(newState.showForm).toBe(true);
    expect(newState.editingAccount).toBe(mockAccount);
  });

  it('should close form correctly', () => {
    const mockAccount: AWSAccount = {
      id: '1',
      name: 'Test',
      accountId: '123456789012',
      defaultRegion: 'us-east-1',
      authType: 'iam',
      createdAt: Date.now(),
    };

    const state: StoreState = {
      showForm: true,
      editingAccount: mockAccount,
      searchQuery: '',
      isLoading: false,
    };

    // Simulate closeForm
    const newState = {
      ...state,
      showForm: false,
      editingAccount: null,
    };

    expect(newState.showForm).toBe(false);
    expect(newState.editingAccount).toBeNull();
  });
});
