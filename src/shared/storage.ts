import type { AWSAccount, StorageData, AppSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

const STORAGE_KEY = 'aws-switcher-data';

async function getStorage(): Promise<StorageData> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? {
    accounts: [],
    encryptionEnabled: false,
    settings: DEFAULT_SETTINGS,
  };
}

async function setStorage(data: StorageData): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

export async function getAccounts(): Promise<AWSAccount[]> {
  const data = await getStorage();
  return data.accounts;
}

export async function getAccount(id: string): Promise<AWSAccount | undefined> {
  const accounts = await getAccounts();
  return accounts.find((a) => a.id === id);
}

export async function saveAccount(account: AWSAccount): Promise<void> {
  const data = await getStorage();
  const index = data.accounts.findIndex((a) => a.id === account.id);

  if (index >= 0) {
    data.accounts[index] = account;
  } else {
    data.accounts.push(account);
  }

  await setStorage(data);
}

export async function deleteAccount(id: string): Promise<void> {
  const data = await getStorage();
  data.accounts = data.accounts.filter((a) => a.id !== id);
  await setStorage(data);
}

export async function updateLastUsed(id: string): Promise<void> {
  const data = await getStorage();
  const account = data.accounts.find((a) => a.id === id);
  if (account) {
    account.lastUsed = Date.now();
    await setStorage(data);
  }
}

export async function getSettings(): Promise<AppSettings> {
  const data = await getStorage();
  return { ...DEFAULT_SETTINGS, ...data.settings };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const data = await getStorage();
  data.settings = { ...data.settings, ...settings };
  await setStorage(data);
}

export async function exportAccounts(): Promise<string> {
  const accounts = await getAccounts();
  // Remove sensitive data before export
  const sanitized = accounts.map((a) => ({
    ...a,
    iamCredentials: a.iamCredentials
      ? { username: a.iamCredentials.username, encryptedPassword: '[REDACTED]' }
      : undefined,
  }));
  return JSON.stringify(sanitized, null, 2);
}

export async function importAccounts(json: string): Promise<number> {
  const imported = JSON.parse(json) as AWSAccount[];
  const data = await getStorage();

  let count = 0;
  for (const account of imported) {
    const exists = data.accounts.some((a) => a.accountId === account.accountId);
    if (!exists) {
      // Generate new ID and clear any imported credentials
      account.id = crypto.randomUUID();
      account.iamCredentials = undefined;
      account.createdAt = Date.now();
      data.accounts.push(account);
      count++;
    }
  }

  await setStorage(data);
  return count;
}

export function generateAccountId(): string {
  return crypto.randomUUID();
}

// CSV Export - compatible format for backup and migration
export async function exportAccountsToCSV(includeCredentials = false): Promise<string> {
  const accounts = await getAccounts();

  const headers = [
    'name',
    'accountId',
    'authType',
    'defaultRegion',
    'color',
    'tags',
    'username',
    ...(includeCredentials ? ['password'] : []),
  ];

  const rows = accounts.map((account) => {
    const row = [
      escapeCSV(account.name),
      account.accountId,
      account.authType,
      account.defaultRegion,
      account.color ?? '',
      (account.tags ?? []).join(';'),
      account.iamCredentials?.username ?? '',
    ];

    // Only include password if explicitly requested (security warning should be shown)
    if (includeCredentials) {
      row.push('[ENCRYPTED - Re-enter in app]');
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// CSV Import - supports our format and aws-accounts-manager format
export async function importAccountsFromCSV(csvContent: string): Promise<{ imported: number; skipped: number }> {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return { imported: 0, skipped: 0 };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const data = await getStorage();

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });

    // Map different CSV formats to our format
    const accountId = row.accountid || row.account_id || row['aws account id'] || '';
    const name = row.name || row.alias || row.accountname || row['account name'] || accountId;
    const username = row.username || row.iam_username || row['iam username'] || '';
    const region = row.defaultregion || row.region || row.default_region || 'us-east-1';
    const color = row.color || '';
    const tags = row.tags ? row.tags.split(';').filter(Boolean) : [];

    if (!accountId) {
      skipped++;
      continue;
    }

    // Check if account already exists
    const exists = data.accounts.some((a) => a.accountId === accountId);
    if (exists) {
      skipped++;
      continue;
    }

    const newAccount: AWSAccount = {
      id: crypto.randomUUID(),
      name: name || `Account ${accountId}`,
      accountId,
      authType: 'iam',
      defaultRegion: region,
      color: color || undefined,
      tags: tags.length > 0 ? tags : undefined,
      iamCredentials: username ? { username, encryptedPassword: '' } : undefined,
      createdAt: Date.now(),
    };

    data.accounts.push(newAccount);
    imported++;
  }

  await setStorage(data);
  return { imported, skipped };
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// AWS Config file parser (~/.aws/config)
export async function importFromAWSConfig(configContent: string): Promise<{ imported: number; skipped: number }> {
  const data = await getStorage();
  const profiles = parseAWSConfig(configContent);

  let imported = 0;
  let skipped = 0;

  for (const profile of profiles) {
    // Skip if no account ID found
    if (!profile.accountId) {
      skipped++;
      continue;
    }

    // Check if account already exists
    const exists = data.accounts.some((a) => a.accountId === profile.accountId);
    if (exists) {
      skipped++;
      continue;
    }

    const newAccount: AWSAccount = {
      id: crypto.randomUUID(),
      name: profile.name,
      accountId: profile.accountId,
      authType: profile.ssoStartUrl ? 'sso' : profile.roleArn ? 'assume-role' : 'iam',
      defaultRegion: profile.region || 'us-east-1',
      createdAt: Date.now(),
    };

    // Add SSO config if present
    if (profile.ssoStartUrl) {
      newAccount.ssoConfig = {
        startUrl: profile.ssoStartUrl,
        region: profile.ssoRegion || profile.region || 'us-east-1',
        accountId: profile.accountId,
        roleName: profile.ssoRoleName || '',
      };
    }

    // Add role config if present
    if (profile.roleArn) {
      newAccount.assumeRoleConfig = {
        roleArn: profile.roleArn,
        sourceProfile: profile.sourceProfile,
        externalId: profile.externalId,
      };
    }

    data.accounts.push(newAccount);
    imported++;
  }

  await setStorage(data);
  return { imported, skipped };
}

interface ParsedProfile {
  name: string;
  accountId: string;
  region?: string;
  roleArn?: string;
  sourceProfile?: string;
  externalId?: string;
  ssoStartUrl?: string;
  ssoRegion?: string;
  ssoRoleName?: string;
}

function parseAWSConfig(content: string): ParsedProfile[] {
  const profiles: ParsedProfile[] = [];
  const lines = content.split('\n');

  let currentProfile: Partial<ParsedProfile> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for profile header
    const profileMatch = trimmed.match(/^\[(?:profile\s+)?(.+)\]$/);
    if (profileMatch) {
      // Save previous profile
      if (currentProfile?.name) {
        profiles.push(currentProfile as ParsedProfile);
      }

      currentProfile = {
        name: profileMatch[1],
        accountId: '',
      };
      continue;
    }

    // Parse key-value pairs
    if (currentProfile) {
      const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim().toLowerCase().replace(/-/g, '_');
        const value = kvMatch[2].trim();

        switch (key) {
          case 'region':
            currentProfile.region = value;
            break;
          case 'role_arn':
            currentProfile.roleArn = value;
            // Extract account ID from role ARN
            const arnMatch = value.match(/arn:aws:iam::(\d{12}):/);
            if (arnMatch) {
              currentProfile.accountId = arnMatch[1];
            }
            break;
          case 'source_profile':
            currentProfile.sourceProfile = value;
            break;
          case 'external_id':
            currentProfile.externalId = value;
            break;
          case 'sso_start_url':
            currentProfile.ssoStartUrl = value;
            break;
          case 'sso_region':
            currentProfile.ssoRegion = value;
            break;
          case 'sso_account_id':
            currentProfile.accountId = value;
            break;
          case 'sso_role_name':
            currentProfile.ssoRoleName = value;
            break;
        }
      }
    }
  }

  // Don't forget the last profile
  if (currentProfile?.name) {
    profiles.push(currentProfile as ParsedProfile);
  }

  // Filter out profiles without account IDs
  return profiles.filter((p) => p.accountId);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}
