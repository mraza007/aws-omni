import { create } from 'zustand';
import type { AWSAccount } from '@/shared/types';
import { getAccounts, saveAccount, deleteAccount, generateAccountId } from '@/shared/storage';

interface AccountStore {
  accounts: AWSAccount[];
  searchQuery: string;
  selectedAccountId: string | null;
  isLoading: boolean;
  showForm: boolean;
  editingAccount: AWSAccount | null;

  // Actions
  loadAccounts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedAccount: (id: string | null) => void;
  openNewAccountForm: () => void;
  openEditAccountForm: (account: AWSAccount) => void;
  closeForm: () => void;
  createAccount: (data: Omit<AWSAccount, 'id' | 'createdAt'>) => Promise<void>;
  updateAccount: (account: AWSAccount) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  searchQuery: '',
  selectedAccountId: null,
  isLoading: true,
  showForm: false,
  editingAccount: null,

  loadAccounts: async () => {
    set({ isLoading: true });
    const accounts = await getAccounts();
    set({ accounts, isLoading: false });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedAccount: (id) => set({ selectedAccountId: id }),

  openNewAccountForm: () => set({ showForm: true, editingAccount: null }),

  openEditAccountForm: (account) => set({ showForm: true, editingAccount: account }),

  closeForm: () => set({ showForm: false, editingAccount: null }),

  createAccount: async (data) => {
    const account: AWSAccount = {
      ...data,
      id: generateAccountId(),
      createdAt: Date.now(),
    };
    await saveAccount(account);
    await get().loadAccounts();
    set({ showForm: false });
  },

  updateAccount: async (account) => {
    await saveAccount(account);
    await get().loadAccounts();
    set({ showForm: false, editingAccount: null });
  },

  removeAccount: async (id) => {
    await deleteAccount(id);
    await get().loadAccounts();
  },

  toggleFavorite: async (id) => {
    const account = get().accounts.find((a) => a.id === id);
    if (account) {
      await saveAccount({ ...account, isFavorite: !account.isFavorite });
      await get().loadAccounts();
    }
  },
}));

// Selector for filtered accounts
export function useFilteredAccounts(): AWSAccount[] {
  const { accounts, searchQuery } = useAccountStore();
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

// Group accounts by client
export function useGroupedAccounts(): Map<string, AWSAccount[]> {
  const accounts = useFilteredAccounts();
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
