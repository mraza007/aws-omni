export type AuthType = 'iam' | 'sso' | 'assume-role';

export interface IAMCredentials {
  username: string;
  encryptedPassword: string;
  mfaSecret?: string;
}

export interface SSOConfig {
  startUrl: string;
  accountId: string;
  roleName: string;
}

export interface AssumeRoleConfig {
  roleArn: string;
  sourceAccountId?: string;
  externalId?: string;
  sessionDuration?: number;
}

export interface AWSAccount {
  id: string;
  name: string;
  accountId: string;
  defaultRegion: string;
  authType: AuthType;
  clientName?: string;
  tags?: string[];
  color?: string;
  isFavorite?: boolean;
  createdAt: number;
  lastUsed?: number;
  iamCredentials?: IAMCredentials;
  ssoConfig?: SSOConfig;
  assumeRoleConfig?: AssumeRoleConfig;
}

export interface ActiveSession {
  tabId: number;
  accountId: string;
  accountName: string;
  region: string;
  startedAt: number;
  lastActivity: number;
}

export interface StorageData {
  accounts: AWSAccount[];
  encryptionEnabled: boolean;
  masterPasswordHash?: string;
  settings: AppSettings;
}

export interface AppSettings {
  showConsoleBanner: boolean;
  bannerPosition: 'top' | 'bottom';
  sessionTimeoutWarning: number; // minutes before warning
  autoLockTimeout: number; // minutes of inactivity
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: AppSettings = {
  showConsoleBanner: true,
  bannerPosition: 'top',
  sessionTimeoutWarning: 5,
  autoLockTimeout: 30,
  theme: 'system',
};

export interface Message {
  type: string;
  payload?: unknown;
}

export interface AccountDetectedMessage extends Message {
  type: 'ACCOUNT_DETECTED';
  payload: {
    accountId: string;
    accountAlias?: string;
    region: string;
    userName?: string;
  };
}

export interface GetAccountsMessage extends Message {
  type: 'GET_ACCOUNTS';
}

export interface OpenConsoleMessage extends Message {
  type: 'OPEN_CONSOLE';
  payload: {
    accountId: string;
    region?: string;
  };
}
