import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetMockStorage, mockStorage } from '../test/setup';

// We need to test the parsing functions separately since they're not exported
// Let's create inline versions for testing

describe('CSV Parsing', () => {
  // Inline parseCSVLine for testing (matches the one in storage.ts)
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

  it('should parse simple CSV line', () => {
    const result = parseCSVLine('name,123456789012,iam,us-east-1');
    expect(result).toEqual(['name', '123456789012', 'iam', 'us-east-1']);
  });

  it('should handle quoted values', () => {
    const result = parseCSVLine('"Account Name",123456789012,iam,us-east-1');
    expect(result).toEqual(['Account Name', '123456789012', 'iam', 'us-east-1']);
  });

  it('should handle commas inside quotes', () => {
    const result = parseCSVLine('"Account, Name",123456789012,iam,us-east-1');
    expect(result).toEqual(['Account, Name', '123456789012', 'iam', 'us-east-1']);
  });

  it('should handle escaped quotes', () => {
    const result = parseCSVLine('"Account ""Name""",123456789012,iam,us-east-1');
    expect(result).toEqual(['Account "Name"', '123456789012', 'iam', 'us-east-1']);
  });

  it('should handle empty values', () => {
    const result = parseCSVLine('name,123456789012,,us-east-1,');
    expect(result).toEqual(['name', '123456789012', '', 'us-east-1', '']);
  });

  it('should trim whitespace', () => {
    const result = parseCSVLine('  name  ,  123456789012  ,  iam  ');
    expect(result).toEqual(['name', '123456789012', 'iam']);
  });
});

describe('CSV Escaping', () => {
  function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  it('should not escape simple values', () => {
    expect(escapeCSV('simple')).toBe('simple');
  });

  it('should escape values with commas', () => {
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
  });

  it('should escape values with quotes', () => {
    expect(escapeCSV('hello "world"')).toBe('"hello ""world"""');
  });

  it('should escape values with newlines', () => {
    expect(escapeCSV('hello\nworld')).toBe('"hello\nworld"');
  });
});

describe('AWS Config Parsing', () => {
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

  it('should parse SSO profile', () => {
    const config = `
[profile my-sso-profile]
sso_start_url = https://d-xxxxxx.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-west-2
`;
    const profiles = parseAWSConfig(config);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toEqual({
      name: 'my-sso-profile',
      accountId: '123456789012',
      ssoStartUrl: 'https://d-xxxxxx.awsapps.com/start',
      ssoRegion: 'us-east-1',
      ssoRoleName: 'AdministratorAccess',
      region: 'us-west-2',
    });
  });

  it('should parse assume role profile', () => {
    const config = `
[profile assume-role-profile]
role_arn = arn:aws:iam::123456789012:role/MyRole
source_profile = default
region = eu-west-1
`;
    const profiles = parseAWSConfig(config);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toEqual({
      name: 'assume-role-profile',
      accountId: '123456789012',
      roleArn: 'arn:aws:iam::123456789012:role/MyRole',
      sourceProfile: 'default',
      region: 'eu-west-1',
    });
  });

  it('should parse profile without "profile" prefix', () => {
    const config = `
[default]
region = us-east-1

[production]
role_arn = arn:aws:iam::111111111111:role/Admin
`;
    const profiles = parseAWSConfig(config);
    // default has no account ID, so only production should be returned
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('production');
    expect(profiles[0].accountId).toBe('111111111111');
  });

  it('should handle comments and empty lines', () => {
    const config = `
# This is a comment
[profile test]
sso_account_id = 999999999999

# Another comment
region = us-east-1
`;
    const profiles = parseAWSConfig(config);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].accountId).toBe('999999999999');
  });

  it('should parse multiple profiles', () => {
    const config = `
[profile dev]
sso_account_id = 111111111111
region = us-east-1

[profile staging]
sso_account_id = 222222222222
region = us-east-1

[profile prod]
sso_account_id = 333333333333
region = us-east-1
`;
    const profiles = parseAWSConfig(config);
    expect(profiles).toHaveLength(3);
    expect(profiles.map(p => p.name)).toEqual(['dev', 'staging', 'prod']);
  });

  it('should skip profiles without account ID', () => {
    const config = `
[profile no-account]
region = us-east-1

[profile has-account]
sso_account_id = 123456789012
`;
    const profiles = parseAWSConfig(config);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('has-account');
  });

  it('should handle external_id for assume role', () => {
    const config = `
[profile cross-account]
role_arn = arn:aws:iam::123456789012:role/CrossAccount
external_id = my-external-id-123
`;
    const profiles = parseAWSConfig(config);
    expect(profiles[0].externalId).toBe('my-external-id-123');
  });
});

describe('Account ID Validation', () => {
  function isValidAccountId(id: string): boolean {
    return /^\d{12}$/.test(id);
  }

  it('should accept valid 12-digit account ID', () => {
    expect(isValidAccountId('123456789012')).toBe(true);
  });

  it('should reject too short', () => {
    expect(isValidAccountId('12345678901')).toBe(false);
  });

  it('should reject too long', () => {
    expect(isValidAccountId('1234567890123')).toBe(false);
  });

  it('should reject non-numeric', () => {
    expect(isValidAccountId('12345678901a')).toBe(false);
  });

  it('should reject empty', () => {
    expect(isValidAccountId('')).toBe(false);
  });
});
