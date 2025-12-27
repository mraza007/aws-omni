import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from './types';
import type { AWSAccount, AppSettings, AuthType } from './types';

describe('Default Settings', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      showConsoleBanner: true,
      bannerPosition: 'top',
      sessionTimeoutWarning: 5,
      autoLockTimeout: 30,
      theme: 'system',
    });
  });

  it('should have valid theme value', () => {
    const validThemes = ['light', 'dark', 'system'];
    expect(validThemes).toContain(DEFAULT_SETTINGS.theme);
  });

  it('should have valid banner position', () => {
    const validPositions = ['top', 'bottom'];
    expect(validPositions).toContain(DEFAULT_SETTINGS.bannerPosition);
  });
});

describe('Type Validation Helpers', () => {
  function isValidAuthType(type: string): type is AuthType {
    return ['iam', 'sso', 'assume-role'].includes(type);
  }

  function validateAccount(account: Partial<AWSAccount>): string[] {
    const errors: string[] = [];

    if (!account.name?.trim()) {
      errors.push('Name is required');
    }

    if (!account.accountId?.match(/^\d{12}$/)) {
      errors.push('Account ID must be 12 digits');
    }

    if (!account.authType || !isValidAuthType(account.authType)) {
      errors.push('Invalid auth type');
    }

    if (account.authType === 'sso' && !account.ssoConfig?.startUrl) {
      errors.push('SSO Start URL is required');
    }

    if (account.authType === 'assume-role' && !account.assumeRoleConfig?.roleArn) {
      errors.push('Role ARN is required');
    }

    return errors;
  }

  it('should validate IAM account', () => {
    const account: Partial<AWSAccount> = {
      name: 'Test Account',
      accountId: '123456789012',
      authType: 'iam',
      defaultRegion: 'us-east-1',
    };
    expect(validateAccount(account)).toEqual([]);
  });

  it('should require name', () => {
    const account: Partial<AWSAccount> = {
      accountId: '123456789012',
      authType: 'iam',
    };
    expect(validateAccount(account)).toContain('Name is required');
  });

  it('should require valid account ID', () => {
    const account: Partial<AWSAccount> = {
      name: 'Test',
      accountId: '12345',
      authType: 'iam',
    };
    expect(validateAccount(account)).toContain('Account ID must be 12 digits');
  });

  it('should require SSO URL for SSO accounts', () => {
    const account: Partial<AWSAccount> = {
      name: 'Test',
      accountId: '123456789012',
      authType: 'sso',
    };
    expect(validateAccount(account)).toContain('SSO Start URL is required');
  });

  it('should accept valid SSO account', () => {
    const account: Partial<AWSAccount> = {
      name: 'Test',
      accountId: '123456789012',
      authType: 'sso',
      ssoConfig: {
        startUrl: 'https://d-xxx.awsapps.com/start',
        accountId: '123456789012',
        roleName: 'Admin',
      },
    };
    expect(validateAccount(account)).toEqual([]);
  });

  it('should require role ARN for assume-role accounts', () => {
    const account: Partial<AWSAccount> = {
      name: 'Test',
      accountId: '123456789012',
      authType: 'assume-role',
    };
    expect(validateAccount(account)).toContain('Role ARN is required');
  });

  it('should accept valid assume-role account', () => {
    const account: Partial<AWSAccount> = {
      name: 'Test',
      accountId: '123456789012',
      authType: 'assume-role',
      assumeRoleConfig: {
        roleArn: 'arn:aws:iam::123456789012:role/MyRole',
      },
    };
    expect(validateAccount(account)).toEqual([]);
  });
});

describe('Auth Type Validation', () => {
  function isValidAuthType(type: string): boolean {
    return ['iam', 'sso', 'assume-role'].includes(type);
  }

  it('should accept iam', () => {
    expect(isValidAuthType('iam')).toBe(true);
  });

  it('should accept sso', () => {
    expect(isValidAuthType('sso')).toBe(true);
  });

  it('should accept assume-role', () => {
    expect(isValidAuthType('assume-role')).toBe(true);
  });

  it('should reject invalid types', () => {
    expect(isValidAuthType('invalid')).toBe(false);
    expect(isValidAuthType('')).toBe(false);
    expect(isValidAuthType('IAM')).toBe(false);
  });
});

describe('Region Validation', () => {
  const VALID_REGIONS = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
  ];

  function isValidRegion(region: string): boolean {
    return /^[a-z]{2}-[a-z]+-\d$/.test(region);
  }

  it('should accept valid AWS regions', () => {
    VALID_REGIONS.forEach(region => {
      expect(isValidRegion(region)).toBe(true);
    });
  });

  it('should reject invalid regions', () => {
    expect(isValidRegion('invalid')).toBe(false);
    expect(isValidRegion('US-EAST-1')).toBe(false);
    expect(isValidRegion('')).toBe(false);
  });
});

describe('Role ARN Validation', () => {
  function isValidRoleArn(arn: string): boolean {
    return /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/.test(arn);
  }

  function extractAccountIdFromArn(arn: string): string | null {
    const match = arn.match(/arn:aws:iam::(\d{12}):/);
    return match ? match[1] : null;
  }

  it('should accept valid role ARNs', () => {
    expect(isValidRoleArn('arn:aws:iam::123456789012:role/MyRole')).toBe(true);
    expect(isValidRoleArn('arn:aws:iam::999999999999:role/Admin-Role')).toBe(true);
    expect(isValidRoleArn('arn:aws:iam::111111111111:role/Role.With.Dots')).toBe(true);
  });

  it('should reject invalid role ARNs', () => {
    expect(isValidRoleArn('invalid')).toBe(false);
    expect(isValidRoleArn('arn:aws:iam::123:role/MyRole')).toBe(false);
    expect(isValidRoleArn('arn:aws:s3:::mybucket')).toBe(false);
  });

  it('should extract account ID from ARN', () => {
    expect(extractAccountIdFromArn('arn:aws:iam::123456789012:role/MyRole')).toBe('123456789012');
    expect(extractAccountIdFromArn('invalid')).toBeNull();
  });
});
